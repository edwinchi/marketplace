"use server";

import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { startConversation } from "@/app/messages/actions";

export async function messageSellerAction(listingId: string) {
  const { user } = await getCurrentUserAndProfile();
  if (!user) redirect("/login");

  const { conversationId } = await startConversation(listingId);
  redirect(conversationId ? `/messages?c=${conversationId}` : "/messages");
}
