import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isUserEmailConfigured, sendEmail } from "@/lib/resend";

// Daily email job (Vercel Cron, see vercel.json): saved-search digests and unread-message
// reminders -- the two emails Marktplaats users rely on most. Daily because that's what every
// Vercel plan allows; on Pro the schedule can be tightened without code changes.
//
// Inert until configured: Vercel only sends `Authorization: Bearer $CRON_SECRET` once CRON_SECRET
// exists in the project's env (anything else is rejected), and nothing is emailed until
// RESEND_FROM_EMAIL names a sender on a Resend-verified domain (lib/resend.ts).
export const maxDuration = 60;

const SITE = "https://marketitnow.net";
// Don't nag about a message that may be mid-conversation right now.
const MESSAGE_QUIET_PERIOD_MS = 10 * 60 * 1000;

type Service = ReturnType<typeof createServiceClient>;

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function emailShell(heading: string, bodyHtml: string, manageHref: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <h2 style="color:#082040">${escapeHtml(heading)}</h2>
      ${bodyHtml}
      <p style="margin-top:24px;color:#777;font-size:12px">
        You're receiving this because of your MarketitNow notification settings.
        <a href="${SITE}${manageHref}" style="color:#777">Change them here</a>.
      </p>
    </div>`;
}

// profile id -> email, via the auth user (profiles don't store email). Only active profiles.
async function emailsFor(supabase: Service, profileIds: string[]): Promise<Map<string, { email: string; notifyMessages: boolean }>> {
  const out = new Map<string, { email: string; notifyMessages: boolean }>();
  if (profileIds.length === 0) return out;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, auth_user_id, status, notify_new_messages")
    .in("id", profileIds);
  for (const p of profiles ?? []) {
    if (p.status !== "active" || !p.auth_user_id) continue;
    const { data } = await supabase.auth.admin.getUserById(p.auth_user_id);
    if (data.user?.email) out.set(p.id, { email: data.user.email, notifyMessages: !!p.notify_new_messages });
  }
  return out;
}

// Saved-search digests: one email per user, built from the in-app saved_search_match notifications
// the hourly alert job (send_saved_search_alerts) already wrote -- only for searches with the
// email toggle on. sent_at marks a notification as handled by this job (emailed, or skipped
// because email is off for that search), so nothing is ever processed twice.
async function sendSavedSearchDigests(supabase: Service): Promise<number> {
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data: notes } = await supabase
    .from("notifications")
    .select("id, profile_id, title, body, payload")
    .eq("notification_type", "saved_search_match")
    .is("sent_at", null)
    .gte("created_at", since)
    .limit(500);
  if (!notes?.length) return 0;

  const searchIds = [...new Set(notes.map((n) => (n.payload as { saved_search_id?: string })?.saved_search_id).filter(Boolean))] as string[];
  const { data: searches } = await supabase.from("saved_searches").select("id, notify_email").in("id", searchIds);
  const emailOn = new Set((searches ?? []).filter((s) => s.notify_email).map((s) => s.id));

  const byProfile = new Map<string, typeof notes>();
  for (const n of notes) {
    if (!emailOn.has((n.payload as { saved_search_id?: string })?.saved_search_id ?? "")) continue;
    byProfile.set(n.profile_id, [...(byProfile.get(n.profile_id) ?? []), n]);
  }
  const recipients = await emailsFor(supabase, [...byProfile.keys()]);

  let sent = 0;
  for (const [profileId, items] of byProfile) {
    const to = recipients.get(profileId);
    if (!to) continue;
    const list = items
      .map((n) => {
        const p = n.payload as { listing_id?: string; url?: string };
        const href = p.listing_id ? `/listings/x-${p.listing_id}` : p.url?.startsWith("/") && !p.url.startsWith("//") ? p.url : "/my-account/saved-searches";
        return `<li style="margin-bottom:10px"><a href="${SITE}${href}" style="color:#008200;font-weight:bold">${escapeHtml(n.title)}</a>${n.body ? `<br><span style="color:#555">${escapeHtml(n.body)}</span>` : ""}</li>`;
      })
      .join("");
    const ok = await sendEmail({
      to: to.email,
      subject: items.length === 1 ? items[0].title : `New listings for ${items.length} of your saved searches`,
      html: emailShell("New listings for your saved searches", `<ul style="padding-left:18px">${list}</ul>`, "/my-account/saved-searches"),
    });
    if (ok) sent++;
  }

  await supabase.from("notifications").update({ sent_at: new Date().toISOString() }).in("id", notes.map((n) => n.id));
  return sent;
}

// Unread-message reminders: one email per conversation per batch of unread messages, for people
// with notify_new_messages on. last_emailed_at (20260101009500) keeps the same messages from being
// emailed again; reading the conversation (last_read_at) resets it naturally.
async function sendMessageReminders(supabase: Service): Promise<number> {
  const quietCutoff = new Date(Date.now() - MESSAGE_QUIET_PERIOD_MS).toISOString();
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: messages } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, created_at")
    .is("deleted_at", null)
    .gte("created_at", since)
    .lte("created_at", quietCutoff)
    .limit(2000);
  if (!messages?.length) return 0;

  const conversationIds = [...new Set(messages.map((m) => m.conversation_id))];
  const { data: participants } = await supabase
    .from("conversation_participants")
    .select("conversation_id, profile_id, last_read_at, last_emailed_at")
    .in("conversation_id", conversationIds);

  const due: { conversationId: string; profileId: string; count: number; senderId: string }[] = [];
  for (const p of participants ?? []) {
    if (!p.profile_id || !p.conversation_id) continue;
    const seenUntil = Math.max(p.last_read_at ? Date.parse(p.last_read_at) : 0, p.last_emailed_at ? Date.parse(p.last_emailed_at) : 0);
    const unread = messages.filter((m) => m.conversation_id === p.conversation_id && m.sender_id !== p.profile_id && Date.parse(m.created_at) > seenUntil);
    if (unread.length) due.push({ conversationId: p.conversation_id, profileId: p.profile_id, count: unread.length, senderId: unread[unread.length - 1].sender_id });
  }
  if (!due.length) return 0;

  const recipients = await emailsFor(supabase, [...new Set(due.map((d) => d.profileId))]);
  const { data: senders } = await supabase.from("profiles_public").select("id, display_name, username").in("id", [...new Set(due.map((d) => d.senderId))]);
  const senderName = new Map((senders ?? []).map((s) => [s.id, s.display_name || s.username || "Someone"]));

  let sent = 0;
  const now = new Date().toISOString();
  for (const d of due) {
    const to = recipients.get(d.profileId);
    if (to?.notifyMessages) {
      const from = senderName.get(d.senderId) ?? "Someone";
      const ok = await sendEmail({
        to: to.email,
        subject: `${from} sent you ${d.count === 1 ? "a message" : `${d.count} messages`} on MarketitNow`,
        html: emailShell(
          `You have ${d.count === 1 ? "an unread message" : `${d.count} unread messages`}`,
          `<p>${escapeHtml(from)} is waiting for your reply.</p><p><a href="${SITE}/messages" style="display:inline-block;background:#008200;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Open messages</a></p>`,
          "/my-account/preferences/notifications",
        ),
      });
      if (ok) sent++;
    }
    // Marked either way, so someone with message emails off isn't re-evaluated for the same batch.
    await supabase
      .from("conversation_participants")
      .update({ last_emailed_at: now })
      .eq("conversation_id", d.conversationId)
      .eq("profile_id", d.profileId);
  }
  return sent;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isUserEmailConfigured()) {
    return NextResponse.json({ skipped: "RESEND_FROM_EMAIL not set -- user emails are off" });
  }

  const supabase = createServiceClient();
  const savedSearchDigests = await sendSavedSearchDigests(supabase);
  const messageReminders = await sendMessageReminders(supabase);
  return NextResponse.json({ savedSearchDigests, messageReminders });
}
