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

// Server Actions can receive File objects straight out of a submitted FormData, same pattern as
// listing photo upload (app/listings/actions.ts's uploadPhotos) -- no separate signed-upload-URL
// dance needed. Path is <conversation_id>/<...> so message_media_participant_insert (storage RLS,
// 20260101004800) can check the uploader is actually a participant in that exact conversation.
export async function sendMessagePhoto(conversationId: string, formData: FormData): Promise<{ error: string | null }> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return { error: "Sign in to share a photo." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "No photo selected." };
  if (!file.type.startsWith("image/")) return { error: "That file isn't an image." };

  const supabase = await createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${conversationId}/${Date.now()}-${profile.id}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("message-media").upload(path, file, { upsert: true });
  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: profile.id, attachment_key: path, message_type: "image", content: null });
  if (error) return { error: error.message };

  await supabase.from("conversation_participants").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversationId).eq("profile_id", profile.id);
  revalidatePath("/messages");
  return { error: null };
}

// Free-text, sender-confirmed -- this project collects no full street-address field anywhere (only
// city/postal code on a profile, and a separate per-listing location), so there's nothing honest to
// auto-fill and silently send. The composer pre-fills the city as a starting point; the sender
// still has to review and hit send.
export async function sendMessageAddress(conversationId: string, addressText: string): Promise<{ error: string | null }> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return { error: "Sign in to share an address." };
  const trimmed = addressText.trim();
  if (!trimmed) return { error: "Enter an address to share." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: profile.id, content: trimmed, message_type: "address" });
  if (error) return { error: error.message };

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
