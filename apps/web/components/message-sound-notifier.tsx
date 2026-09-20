"use client";

import { useEffect, useRef } from "react";
import { getUnreadMessageCountAction } from "@/app/actions/get-unread-message-count";
import { playMessageChime } from "@/lib/notification-sound";
import { createClient } from "@/lib/supabase/client";

// Event-driven, not a blind timer -- messages was added to the supabase_realtime publication
// (20260101008700_realtime_messages.sql) specifically so this (and components/messages/mark-read.tsx)
// could move off polling. No conversation_id filter here (unlike MarkRead, which is scoped to one
// open thread) -- this needs to hear about a new message in ANY of this user's conversations, and
// Realtime's postgres_changes subscription is already filtered by the same RLS policy that governs
// a normal SELECT on this table, so it can only ever see rows this profile is a participant in
// regardless. sender_id is checked client-side only to skip the chime for a message this same
// profile just sent themselves (already visible on their own screen, no need to announce it).
// A long-interval fallback poll stays underneath as insurance against a dropped/never-established
// websocket connection, same reasoning as MarkRead's own fallback.
const FALLBACK_POLL_INTERVAL_MS = 45_000;

export function MessageSoundNotifier({ initialCount, myProfileId }: { initialCount: number; myProfileId: string }) {
  const lastCountRef = useRef(initialCount);

  useEffect(() => {
    let cancelled = false;

    async function checkAndChime() {
      try {
        const count = await getUnreadMessageCountAction();
        if (cancelled) return;
        if (count > lastCountRef.current) playMessageChime();
        lastCountRef.current = count;
      } catch {
        // Best-effort -- a failed check just tries again on the next event/interval.
      }
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`unread-messages:${myProfileId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=neq.${myProfileId}` },
        () => {
          if (document.hidden) return; // no point checking (or dinging) for a backgrounded tab
          checkAndChime();
        },
      )
      .subscribe();

    const fallback = setInterval(() => {
      if (!document.hidden) checkAndChime();
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      clearInterval(fallback);
    };
  }, [myProfileId]);

  return null;
}
