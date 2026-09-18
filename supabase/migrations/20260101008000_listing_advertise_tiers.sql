-- Activates the Plus/Premium listing tiers -- components/listings/advertise-tier-selector.tsx
-- already had this UI, explicitly marked "Coming soon" pending real payment infra and a pricing
-- decision (its own comment: "only 'Free' actually works"). boost_rank (0=free, 1=plus,
-- 2=premium) is a plain sortable integer, not a text tier column + CASE expression, so every
-- browse/search query can order by it directly with a normal .order() call.
alter table listings add column if not exists boost_rank integer not null default 0;

-- Same self-service-bypass concern as published_at (ad-bump) and moderation_status (content
-- moderation) before it: this is what a seller is paying Stripe for, so it can't also be
-- something they set on their own listing for free via a raw REST call. Only the webhook
-- (app/api/stripe/webhook/route.ts, service-role client) writes it, after Stripe confirms payment.
revoke update (boost_rank) on listings from authenticated, anon;
