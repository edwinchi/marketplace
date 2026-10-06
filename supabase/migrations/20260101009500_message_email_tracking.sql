-- Unread-message email reminders (app/api/cron/send-emails): remembers when a participant was last
-- emailed about a conversation, so each batch of unread messages produces one email, not one per
-- run. Written only by the service-role cron route -- the user UPDATE grant on
-- conversation_participants stays last_read_at only (20260101008900).
alter table conversation_participants add column if not exists last_emailed_at timestamptz;
