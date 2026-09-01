-- Stripe guarantees at-least-once webhook delivery (retries on any non-2xx response, network
-- timeout, etc.), so the handler in app/api/stripe/webhook/route.ts must be idempotent. Without
-- this, a redelivered checkout.session.completed event would double-credit ai_bonus_uses on every
-- retry -- a real risk, not theoretical: Stripe's own docs call out duplicate delivery as routine,
-- not an edge case. Recording each event.id here and skipping ones already seen is Stripe's own
-- recommended pattern.
create table if not exists stripe_webhook_events (
  id text primary key,
  created_at timestamptz not null default now()
);

alter table stripe_webhook_events enable row level security;
-- No policies -- this table is only ever touched by the webhook route's service-role client,
-- never by an anon/authenticated request. RLS with no policies denies all of those by default.
