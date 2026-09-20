"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markConversationRead } from "@/app/messages/actions";
import { createClient } from "@/lib/supabase/client";

// A real Realtime subscription, not a blind poll -- this table was added to the supabase_realtime
// publication in 20260101008700_realtime_messages.sql specifically for this. router.refresh() on
// an actual INSERT event re-runs the whole server-rendered page (app/messages/page.tsx), which
// already resolves message content, signed image URLs, and read receipts correctly -- reusing
// that instead of duplicating any of it client-side. A long-interval fallback poll stays underneath
// as insurance against a dropped/never-established websocket connection (rare, but a silent one
// would otherwise mean incoming messages just never appear until a manual reload), at a small
// enough fraction of the old cadence that it's not a real cost even if Realtime is working fine.
const FALLBACK_POLL_INTERVAL_MS = 45_000;

export function MarkRead({ conversationId }: { conversationId: string }) {
  const router = useRouter();

  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          markConversationRead(conversationId);
          router.refresh();
        },
      )
      .subscribe();

    const fallback = setInterval(() => router.refresh(), FALLBACK_POLL_INTERVAL_MS);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(fallback);
    };
  }, [conversationId, router]);

  return null;
}
