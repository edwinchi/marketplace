"use client";

import { useEffect, useRef } from "react";
import { getUnreadMessageCountAction } from "@/app/actions/get-unread-message-count";
import { playMessageChime } from "@/lib/notification-sound";

const POLL_INTERVAL_MS = 20_000;

// Plays a chime when the unread message count goes up while the tab is open -- there's no
// realtime/websocket subscription set up anywhere in this app yet, so this polls the same real
// count the nav badge already computes (getUnreadMessageCount) rather than pushing for a bigger
// infra change just for this. Mounted once, signed-in users only (see components/nav.tsx) --
// `initialCount` seeds the baseline from the server-rendered nav badge so the very first poll
// doesn't fire a chime for messages that were already unread before this page loaded.
export function MessageSoundNotifier({ initialCount }: { initialCount: number }) {
  const lastCountRef = useRef(initialCount);

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(async () => {
      if (document.hidden) return; // no point checking (or dinging) for a backgrounded tab
      try {
        const count = await getUnreadMessageCountAction();
        if (cancelled) return;
        if (count > lastCountRef.current) playMessageChime();
        lastCountRef.current = count;
      } catch {
        // Best-effort polling -- a failed check just tries again next interval.
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return null;
}
