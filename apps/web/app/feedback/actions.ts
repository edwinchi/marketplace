"use server";

import { sendEmail, isResendConfigured } from "@/lib/resend";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

export type FeedbackState = { sent: boolean; error: string | null };

// Attached straight to the email rather than uploaded to our own storage -- feedback screenshots
// don't need to persist anywhere beyond the inbox that reads them, so this skips a bucket/RLS
// setup entirely. Capped to keep a single feedback email well under Resend's request size limit.
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Resend's sandbox sender can only deliver to the Resend account's own registered address
// (verified live -- see lib/resend.ts) -- this is that address, not necessarily the address a
// reader of this feature would expect. Swap once a custom domain is verified in Resend.
const FEEDBACK_RECIPIENT = "eddyteddy78@gmail.com";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function submitFeedback(_prevState: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const message = String(formData.get("message") ?? "").trim();
  const contactEmail = String(formData.get("email") ?? "").trim();
  if (!message) return { sent: false, error: "Enter your feedback before sending." };

  if (!isResendConfigured()) {
    console.error("submitFeedback: RESEND_API_KEY not configured");
    return { sent: false, error: "Feedback isn't available right now — try again later." };
  }

  const { user } = await getCurrentUserAndProfile();
  const fromEmail = contactEmail || user?.email || null;

  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const oversized = photos.find((f) => f.size > MAX_PHOTO_BYTES);
  if (oversized) return { sent: false, error: `${oversized.name} is too large — attach photos under 5MB each.` };

  const attachments = await Promise.all(
    photos.slice(0, MAX_PHOTOS).map(async (file) => ({
      filename: file.name || "screenshot.jpg",
      content: Buffer.from(await file.arrayBuffer()).toString("base64"),
    })),
  );

  const html = `
    <p><strong>New AfroDeals feedback</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
    <p style="color:#666;font-size:12px;">From: ${fromEmail ? escapeHtml(fromEmail) : "anonymous"}${user ? " (signed in)" : ""}</p>
  `;

  const ok = await sendEmail({
    to: FEEDBACK_RECIPIENT,
    subject: "AfroDeals feedback",
    html,
    replyTo: fromEmail ?? undefined,
    attachments,
  });

  if (!ok) return { sent: false, error: "Couldn't send your feedback — try again in a moment." };
  return { sent: true, error: null };
}
