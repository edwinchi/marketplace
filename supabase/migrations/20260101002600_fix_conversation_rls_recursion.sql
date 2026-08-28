-- participant_member_read (20260101001000_complete_rls.sql) subqueries conversation_participants
-- from within its own policy on conversation_participants: `mine.conversation_id = conversation_id`
-- has the bare `conversation_id` resolve to `mine.conversation_id` (the innermost scope that has a
-- column of that name), making the condition a tautology — and evaluating that subquery re-triggers
-- the same SELECT policy on the same table, which Postgres correctly refuses to do:
-- "infinite recursion detected in policy for relation conversation_participants" (42P17). Every
-- query that touches conversation_participants under RLS hits this, including the *other* three
-- conversation/message policies that reference it cross-table — so this one bug was blocking all
-- real conversation/message access, not just conversation_participants directly.
--
-- Fix: a SECURITY DEFINER function's internal query runs as the function owner, which bypasses RLS
-- for that one internal read — breaking the recursive cycle. Same pattern as
-- listing_outbox()/handle_new_user() elsewhere in this schema.
CREATE OR REPLACE FUNCTION is_conversation_participant(p_conversation_id uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND profile_id = current_profile_id()
  );
$$;

DROP POLICY IF EXISTS conversation_member_read ON conversations;
CREATE POLICY conversation_member_read ON conversations FOR SELECT
  USING (is_conversation_participant(id));

DROP POLICY IF EXISTS participant_member_read ON conversation_participants;
CREATE POLICY participant_member_read ON conversation_participants FOR SELECT
  USING (is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS message_member_read ON messages;
CREATE POLICY message_member_read ON messages FOR SELECT
  USING (is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS message_member_insert ON messages;
CREATE POLICY message_member_insert ON messages FOR INSERT
  WITH CHECK (sender_id = current_profile_id() AND is_conversation_participant(conversation_id));
