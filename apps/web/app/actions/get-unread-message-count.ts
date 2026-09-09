"use server";

import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { getUnreadMessageCount } from "@/lib/messages";

// Callable from the client for polling (see components/message-sound-notifier.tsx) -- lib/messages.ts's
// getUnreadMessageCount itself takes a profileId directly since server-rendered callers (nav.tsx)
// already have one; this wrapper re-derives it from the request's own session instead of trusting
// a client-supplied id.
export async function getUnreadMessageCountAction(): Promise<number> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return 0;
  return getUnreadMessageCount(profile.id);
}
