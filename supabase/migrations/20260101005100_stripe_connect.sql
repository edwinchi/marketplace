-- Stripe Connect Express accounts for sellers -- lets a buyer's payment go straight to the
-- seller's own bank account (via transfer_data.destination on the PaymentIntent) while AfroDeals
-- keeps a platform fee (via application_fee_amount), without ever touching a seller's bank details
-- itself. Express, not Standard or Custom: sellers get Stripe's own quick hosted onboarding (ID,
-- bank details) rather than a full Stripe dashboard, matching a casual buy/sell marketplace where
-- most sellers aren't running a business.
--
-- charges_enabled/payouts_enabled mirror the same two flags Stripe's own Account object exposes --
-- kept as local flags (rather than always calling the Stripe API to check) so pages can gate on
-- them with a plain read, updated by the webhook's account.updated handler whenever they change.
alter table profiles
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_charges_enabled boolean not null default false,
  add column if not exists stripe_connect_payouts_enabled boolean not null default false;

create index if not exists profiles_stripe_connect_account_id_idx on profiles(stripe_connect_account_id) where stripe_connect_account_id is not null;

-- Buyer-side fee for a protected "Direct Buy" payment, mirroring Marktplaats' own Kopersbescherming
-- model (percentage of the item price, clamped to a min/max) rather than Marktplaats' plain
-- payment-request flat fee -- Direct Buy is the one that actually gives the buyer real protection,
-- which is the point of building this on the existing escrow schema at all. Seeded with a
-- reasonable starting rate; adjust from /admin, no code deploy needed.
insert into numeric_settings (key, value) values
  ('buyer_fee_percent_x100', 500),
  ('buyer_fee_min_cents', 59),
  ('buyer_fee_max_cents', 2000)
on conflict (key) do nothing;
