"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markConversationRead } from "@/app/messages/actions";

// No realtime subscription (Supabase Realtime would be the real upgrade path) — polling every few
// seconds while a thread is open is a modest, honest stand-in: messages from the other side show up
// without a manual reload, just not instantly. Also marks the conversation read once per open.
const POLL_INTERVAL_MS = 4000;

export function MarkRead({ conversationId }: { conversationId: string }) {
  const router = useRouter();

  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId]);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [conversationId, router]);

  return null;
}
