"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

// Finds-or-creates the conversation for this buyer+listing via the start_conversation() DB
// function (agents.md §12) — that function derives the seller from the listing itself and is the
// only path allowed to insert conversation/participant rows, so this action can't be tricked into
// creating a conversation with an arbitrary "seller".
export async function startConversation(listingId: string): Promise<{ conversationId: string | null; error: string | null }> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return { conversationId: null, error: "Sign in to message a seller." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", { p_listing_id: listingId });
  if (error) return { conversationId: null, error: error.message };
  return { conversationId: data as string, error: null };
}

export async function sendMessage(conversationId: string, content: string): Promise<{ error: string | null }> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return { error: "Sign in to send messages." };
  const trimmed = content.trim();
  if (!trimmed) return { error: null };

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: profile.id, content: trimmed });
  if (error) return { error: error.message };

  // Sending a message obviously means you've seen everything up to now — keeps your own unread
  // count from immediately reflecting the message you just sent.
  await supabase.from("conversation_participants").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversationId).eq("profile_id", profile.id);

  revalidatePath("/messages");
  return { error: null };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return;
  const supabase = await createClient();
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("profile_id", profile.id);
  revalidatePath("/messages");
}
