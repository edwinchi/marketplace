-- profiles_public_read (from the very first RLS migration, 20260101001500) reads
-- "for select using (true)" -- every column of every user's profile row, readable by anyone
-- holding the public anon key, no authentication at all. Confirmed live: a plain unauthenticated
-- REST call returned stripe_customer_id, auth_user_id, phone_number, postal_code,
-- stripe_connect_account_id, AI subscription/usage internals, and every marketing opt-in flag for
-- arbitrary users. Write access was already correctly restricted (profiles_self_update, same
-- migration) -- this was a read-only exposure, but a serious one.
--
-- Fix: the base table drops to owner-only full-row access. A new view, profiles_public, exposes
-- only the columns every other feature that legitimately shows "someone else's" profile actually
-- needs -- seller cards, reviews, messages, follows, browse listing cards. phone_number is
-- included but only resolves for a signed-in viewer (case when auth.uid() is not null), replicating
-- the existing UI-level "sign in to view number" gate (components/listings/phone-reveal-button.tsx)
-- as defense-in-depth at the database level too, rather than relying on app code alone.
drop policy if exists profiles_public_read on profiles;

create policy profiles_owner_read on profiles for select
  using (auth_user_id = auth.uid());

-- No `security_invoker` -- this view must run with its own (definer) privileges to see every row
-- of the now-locked-down base table; it's the column list below, not a row filter, that limits
-- what's exposed. Every row is intentionally visible here; only the columns are restricted.
create or replace view profiles_public as
select
  id,
  username,
  display_name,
  account_type,
  created_at,
  website_url,
  stripe_connect_charges_enabled,
  case when auth.uid() is not null then phone_number else null end as phone_number
from profiles;

grant select on profiles_public to anon, authenticated;
