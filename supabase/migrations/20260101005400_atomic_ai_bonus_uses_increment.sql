-- app/api/stripe/webhook/route.ts credited AI top-up purchases by reading ai_bonus_uses into JS,
-- adding AI_TOPUP_USES, then writing it back -- the same non-atomic read-then-write bug already
-- fixed for ai_photo_analysis_uses (see 20260101005300_atomic_ai_usage_increment.sql), just for a
-- variable delta instead of always +1. Two genuine top-up purchases in quick succession (two
-- distinct Stripe events, so the existing stripe_webhook_events dedupe table doesn't help) could
-- both read the same starting count and each write count + AI_TOPUP_USES, crediting only one
-- top-up's worth of uses even though the customer was charged for both.
create or replace function increment_ai_bonus_uses(p_profile_id uuid, p_amount integer)
returns integer
language sql
security definer
set search_path = public
as $$
  update profiles set ai_bonus_uses = ai_bonus_uses + p_amount
  where id = p_profile_id
  returning ai_bonus_uses;
$$;
