-- Opts the messages table into Supabase Realtime's postgres_changes broadcast -- the actual
-- upgrade path components/messages/mark-read.tsx already anticipated in its own comment ("no
-- realtime subscription... Supabase Realtime would be the real upgrade path"), replacing that
-- component's blind 4-second poll with a real, event-driven subscription. A client's
-- postgres_changes subscription is filtered by the SAME RLS policy that already governs a normal
-- SELECT on this table (message_member_read, 20260101002600_fix_conversation_rls_recursion.sql) --
-- Realtime enforces RLS on postgres_changes subscriptions the same as any other read, so this
-- doesn't open any new visibility beyond what a participant could already query for themselves.
alter publication supabase_realtime add table messages;
