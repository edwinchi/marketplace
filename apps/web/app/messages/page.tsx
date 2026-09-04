import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShieldAlert, MessageCircle, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { ConversationList } from "@/components/messages/conversation-list";
import { MessageComposer } from "@/components/messages/message-composer";
import { MarkRead } from "@/components/messages/mark-read";
import { slugPath } from "@/lib/slug";

export const metadata = { title: "Messages — AfroDeals" };

type ConversationRow = {
  id: string;
  listing_id: string | null;
  updated_at: string;
  listings: { title: string } | { title: string }[] | null;
  conversation_participants: { profile_id: string; last_read_at: string | null; profiles: { display_name: string | null; username: string } | { display_name: string | null; username: string }[] }[];
};

type MessageRow = { id: string; conversation_id: string; sender_id: string; content: string | null; created_at: string; attachment_key: string | null; message_type: string };

// message_type doesn't exist until 20260101004800_message_attachments.sql is run -- selecting a
// column that doesn't exist yet fails the whole query (PostgREST 400s on it), which would take the
// entire Messages page down, not just the new photo/address feature. Falls back to a plain-text-
// only read instead, same reasoning as every other not-yet-run migration in this project: missing
// schema should degrade a feature, never break the page it's built into.
async function fetchMessages(supabase: Awaited<ReturnType<typeof createClient>>, conversationIds: string[]): Promise<MessageRow[]> {
  if (!conversationIds.length) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, created_at, attachment_key, message_type")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });
  if (!error) return (data ?? []) as MessageRow[];

  const { data: fallbackData } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, created_at, attachment_key")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });
  return (fallbackData ?? []).map((m) => ({ ...m, message_type: "text" }));
}

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const { c: activeConversationId } = await searchParams;
  const supabase = await createClient();

  const { data: myParticipation } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("profile_id", profile.id);
  const conversationIds = (myParticipation ?? []).map((p) => p.conversation_id);
  const myLastReadById = new Map((myParticipation ?? []).map((p) => [p.conversation_id, p.last_read_at]));

  const [{ data: conversations }, allMessages, { data: myIdentity }] = await Promise.all([
    conversationIds.length
      ? supabase
          .from("conversations")
          .select("id, listing_id, updated_at, listings(title), conversation_participants(profile_id, last_read_at, profiles(display_name, username))")
          .in("id", conversationIds)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] as ConversationRow[] }),
    fetchMessages(supabase, conversationIds),
    // A starting point for "Share address" -- see sendMessageAddress's own note on why this isn't
    // a full auto-filled address (no such field exists on profiles).
    supabase.from("profiles").select("preferred_city").eq("id", profile.id).single(),
  ]);

  const messagesByConversation = new Map<string, typeof allMessages>();
  for (const m of allMessages ?? []) {
    const list = messagesByConversation.get(m.conversation_id) ?? [];
    list.push(m);
    messagesByConversation.set(m.conversation_id, list);
  }

  const rows = (conversations as ConversationRow[] | null ?? []).map((c) => {
    const other = c.conversation_participants.find((p) => p.profile_id !== profile.id);
    const otherProfile = other ? (Array.isArray(other.profiles) ? other.profiles[0] : other.profiles) : null;
    const listing = Array.isArray(c.listings) ? c.listings[0] : c.listings;
    const msgs = messagesByConversation.get(c.id) ?? [];
    const lastMessage = msgs[0];
    const myLastRead = myLastReadById.get(c.id);
    const unreadCount = msgs.filter((m) => m.sender_id !== profile.id && (!myLastRead || m.created_at > myLastRead)).length;
    const previewText = lastMessage?.message_type === "image" ? "📷 Photo" : lastMessage?.message_type === "address" ? "📍 Address" : (lastMessage?.content ?? "");
    return {
      id: c.id,
      otherName: otherProfile?.display_name || otherProfile?.username || "A user",
      listingTitle: listing?.title ?? "Listing",
      lastMessagePreview: previewText,
      lastMessageAt: lastMessage?.created_at ?? c.updated_at,
      unreadCount,
    };
  });

  let thread: {
    id: string;
    listingTitle: string;
    listingId: string | null;
    otherName: string;
    otherLastReadAt: string | null;
    messages: { id: string; senderId: string; content: string | null; createdAt: string; messageType: string; imageUrl: string | null }[];
  } | null = null;

  if (activeConversationId && conversationIds.includes(activeConversationId)) {
    const activeConv = (conversations as ConversationRow[] | null ?? []).find((c) => c.id === activeConversationId);
    const other = activeConv?.conversation_participants.find((p) => p.profile_id !== profile.id);
    const otherProfileT = other ? (Array.isArray(other.profiles) ? other.profiles[0] : other.profiles) : null;
    const listingT = activeConv ? (Array.isArray(activeConv.listings) ? activeConv.listings[0] : activeConv.listings) : null;
    const msgs = [...(messagesByConversation.get(activeConversationId) ?? [])].reverse();

    // The message-media bucket is private (conversations are two-participant-only, unlike public
    // listing photos) -- a signed URL per image message is the standard Supabase pattern for
    // letting the browser load a private-bucket object without exposing the whole bucket.
    const imageUrlByMessageId = new Map<string, string>();
    const imageKeys = msgs.filter((m) => m.message_type === "image" && m.attachment_key).map((m) => m.attachment_key!);
    if (imageKeys.length > 0) {
      const { data: signedUrls } = await supabase.storage.from("message-media").createSignedUrls(imageKeys, 3600);
      for (const m of msgs) {
        if (m.message_type !== "image" || !m.attachment_key) continue;
        const signed = signedUrls?.find((s) => s.path === m.attachment_key);
        if (signed?.signedUrl) imageUrlByMessageId.set(m.id, signed.signedUrl);
      }
    }

    thread = {
      id: activeConversationId,
      listingTitle: listingT?.title ?? "Listing",
      listingId: activeConv?.listing_id ?? null,
      otherName: otherProfileT?.display_name || otherProfileT?.username || "A user",
      otherLastReadAt: other?.last_read_at ?? null,
      messages: msgs.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        content: m.content,
        createdAt: m.created_at,
        messageType: m.message_type,
        imageUrl: imageUrlByMessageId.get(m.id) ?? null,
      })),
    };
  }

  const otherInitial = thread?.otherName.charAt(0).toUpperCase();

  // No flex-1 on the outer div below (pre-existing, unrelated to this redesign) -- as a flex child
  // of <main>'s column flex, flex-1's flex-basis:0% overrides the explicit height for main-axis
  // sizing, so the panel silently collapsed to its content's natural height instead of filling the
  // viewport. It was invisible before (no background to show where the panel "should" end); the
  // new card background made it obvious, so fixing it now.
  return (
    <div className="mx-auto flex h-[calc(100vh-4.5rem)] w-full max-w-6xl px-0 sm:px-4 sm:py-4">
      <div className="grid w-full grid-cols-1 overflow-hidden rounded-none border-0 bg-card shadow-none sm:rounded-2xl sm:border sm:shadow-sm md:grid-cols-[340px_1fr]">
        <div className={`flex flex-col border-r ${thread ? "hidden md:flex" : "flex"}`}>
          <div className="border-b bg-linear-to-b from-muted/50 to-transparent p-4">
            <h1 className="text-lg font-semibold">Messages</h1>
          </div>
          <ConversationList rows={rows} activeId={activeConversationId} />
        </div>

        <div className={`flex flex-col ${thread ? "flex" : "hidden md:flex"}`}>
          {thread ? (
            <>
              <MarkRead conversationId={thread.id} />
              <div className="flex items-center gap-3 border-b p-4">
                <Link href="/messages" className="text-muted-foreground hover:text-foreground md:hidden">
                  ←
                </Link>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#008200]/15 text-sm font-semibold text-[#046637]">
                  {otherInitial}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{thread.otherName}</p>
                  {thread.listingId ? (
                    <Link href={`/listings/${slugPath(thread.listingTitle, thread.listingId)}`} className="truncate text-xs text-muted-foreground hover:text-primary hover:underline">
                      {thread.listingTitle}
                    </Link>
                  ) : (
                    <p className="truncate text-xs text-muted-foreground">{thread.listingTitle}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 border-b bg-[#082040]/[0.03] p-3 text-xs text-muted-foreground">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#082040]/70" />
                <span>
                  Stay alert and trade safely — never pay before you&apos;ve seen an item in person. See our{" "}
                  <Link href="/safety" className="text-[#082040] underline underline-offset-2">
                    Safety Center
                  </Link>
                  .
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-[linear-gradient(180deg,transparent_0%,rgba(8,32,64,0.015)_100%)] p-4">
                {thread.messages.length === 0 && (
                  <p className="m-auto text-sm text-muted-foreground">Say hello — your message goes straight to {thread.otherName}.</p>
                )}
                {thread.messages.map((m) => {
                  const mine = m.senderId === profile.id;
                  const readByOther = mine && thread!.otherLastReadAt && m.createdAt <= thread!.otherLastReadAt;
                  const bubbleTone = mine
                    ? "rounded-br-sm bg-linear-to-br from-[#008200] to-[#046637] text-white"
                    : "rounded-bl-sm border bg-card text-foreground";
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                      {m.messageType === "image" && m.imageUrl ? (
                        <a href={m.imageUrl} target="_blank" rel="noopener noreferrer" className={`block max-w-[75%] overflow-hidden rounded-2xl shadow-sm ${mine ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                          <Image src={m.imageUrl} alt="Shared photo" width={280} height={280} className="h-auto max-h-72 w-full object-cover" unoptimized />
                        </a>
                      ) : m.messageType === "address" ? (
                        <div className={`flex max-w-[75%] items-start gap-2 rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${bubbleTone}`}>
                          <MapPin className="mt-0.5 size-4 shrink-0" />
                          <div>
                            <p className="text-[11px] font-semibold tracking-wide uppercase opacity-70">Shared address</p>
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          </div>
                        </div>
                      ) : (
                        <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${bubbleTone}`}>{m.content}</div>
                      )}
                      <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">
                        {new Date(m.createdAt).toLocaleString("en", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
                        {mine && readByOther ? " · Read" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              <MessageComposer conversationId={thread.id} addressStarter={myIdentity?.preferred_city ?? ""} />
            </>
          ) : (
            <div className="m-auto flex flex-col items-center gap-2 text-center text-muted-foreground">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                <MessageCircle className="size-6" />
              </span>
              <p className="text-sm">Select a conversation to start reading</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
