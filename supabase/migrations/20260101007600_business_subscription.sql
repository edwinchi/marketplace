-- B2C merchant subscription ("MarketitNow Zakelijk" in the pitch docs) -- v1 scope: a paid,
-- visible "Business" badge for professional sellers, layered on the account_type distinction that
-- already exists (profiles.account_type = 'business', self-declared, free, set today from
-- /my-account/profile/edit). Deliberately NOT scoped here: bulk/ERP listing-feed ingestion or a
-- businesses-table management UI (that table has real columns -- legal_name, VAT, KVK -- but zero
-- app code reads/writes it yet, confirmed by grep) -- both are real, separate, larger pieces of
-- work, not something to half-build alongside this.
--
-- Mirrors ai_subscription_status/ai_subscription_current_period_end (20260101004300_ai_subscriptions.sql)
-- exactly -- same status vocabulary (none/active/past_due/canceled), same reasoning (one
-- subscription per seller, no join needed). A seller can hold Seller Pro and Business
-- independently -- they're orthogonal (AI tooling vs. professional-seller trust badge), not tiers
-- of the same plan.
alter table profiles
  add column if not exists business_subscription_status text not null default 'none',
  add column if not exists business_subscription_current_period_end timestamptz;
