import { createClient } from "@/lib/supabase/server";

// Total unread messages across every conversation the profile is in — for the nav badge. Same
// "count messages after my last_read_at, not sent by me" logic as app/messages/page.tsx's per-row
// unread count, just summed rather than grouped.
export async function getUnreadMessageCount(profileId: string): Promise<number> {
  const supabase = await createClient();
  const { data: participation } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("profile_id", profileId);
  if (!participation?.length) return 0;

  const conversationIds = participation.map((p) => p.conversation_id);
  const { data: messages } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, created_at")
    .in("conversation_id", conversationIds)
    .neq("sender_id", profileId);

  const lastReadById = new Map(participation.map((p) => [p.conversation_id, p.last_read_at]));
  return (messages ?? []).filter((m) => {
    const lastRead = lastReadById.get(m.conversation_id);
    return !lastRead || m.created_at > lastRead;
  }).length;
}
