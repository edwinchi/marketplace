-- Backs the AI-features paywall (Seller Pro subscription + one-time top-ups) discussed in the
-- roadmap. Columns live on profiles rather than a separate table -- there's exactly one
-- subscription per seller and no join/many-side to model, same reasoning as
-- ai_photo_analysis_uses already living here instead of its own usage-ledger table.
--
-- ai_subscription_status drives the paywall bypass in analyzeListingPhoto():
--   'none'      -- never subscribed (default)
--   'active'    -- Seller Pro is live; free-use limit doesn't apply
--   'past_due'  -- Stripe couldn't collect payment; treated as not-active until it recovers
--   'canceled'  -- was active, isn't anymore; falls back to free-limit + any bonus uses
--
-- ai_bonus_uses is the one-time top-up balance ($1.99/10 uses) -- incremented by the Stripe
-- webhook on a completed one-time Checkout session, decremented alongside the free-use counter
-- once the free limit is exhausted.
alter table profiles
  add column if not exists stripe_customer_id text,
  add column if not exists ai_subscription_status text not null default 'none',
  add column if not exists ai_subscription_current_period_end timestamptz,
  add column if not exists ai_bonus_uses integer not null default 0;

create index if not exists profiles_stripe_customer_id_idx on profiles(stripe_customer_id) where stripe_customer_id is not null;
