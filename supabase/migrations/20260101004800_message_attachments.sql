-- Photo- and address-sharing in chat. `attachment_key` already existed on `messages` (unused until
-- now); this adds a `message_type` discriminator so the UI can render an image thumbnail or a
-- shared-address card distinctly from a plain text bubble, without overloading what `content`
-- means. 'address' messages store the shared address as plain text in `content` (this project
-- collects no full street-address field anywhere, so this is a free-text share the sender types
-- and confirms, not an auto-filled profile field); 'image' messages store the storage path in
-- `attachment_key` and leave `content` null.
ALTER TABLE messages ADD COLUMN message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'address'));

-- Private bucket -- unlike public listing photos, a chat photo should only ever be visible to the
-- two people in that conversation. Objects are stored under <conversation_id>/<filename>, so
-- is_conversation_participant() (20260101002600_fix_conversation_rls_recursion.sql) -- already
-- SECURITY DEFINER, so it safely bypasses conversation_participants' own RLS for this check -- can
-- gate both insert and select the same way messages themselves already are.
insert into storage.buckets (id, name, public) values ('message-media', 'message-media', false)
  on conflict (id) do nothing;

create policy message_media_participant_insert on storage.objects for insert
  with check (bucket_id = 'message-media' and is_conversation_participant(((storage.foldername(name))[1])::uuid));

create policy message_media_participant_select on storage.objects for select
  using (bucket_id = 'message-media' and is_conversation_participant(((storage.foldername(name))[1])::uuid));
