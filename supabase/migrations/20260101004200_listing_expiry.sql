-- Auto-expires stale listings. listings.expires_at has existed since the original schema but
-- nothing ever read it -- new listings are now given a 60-day expires_at at creation time
-- (apps/web/app/listings/actions.ts), and this sweep flips anything that's aged past it from
-- 'active' to 'expired'. 'expired' is invisible to browse/search for free: the active-feed RLS
-- policy (listing_read, complete_rls.sql) only ever matches status='active', so no RLS change is
-- needed here. A seller can bring an expired listing back via relistListing() in actions.ts,
-- which sets status='active' and pushes expires_at another 60 days out.
--
-- Pre-existing listings created before this migration have expires_at = null and are left alone
-- by the WHERE clause below (a null expires_at can never be "past due") -- they won't expire
-- retroactively; they'll get a real expires_at the next time their owner edits/relists them.

create extension if not exists pg_cron;

create or replace function expire_stale_listings()
returns void
language sql
as $$
  update listings
  set status = 'expired'
  where status = 'active'
    and expires_at is not null
    and expires_at < now();
$$;

-- Once a day is plenty for a 60-day expiry window; a listing sits at most ~24h past its
-- expires_at before this catches it.
select cron.schedule(
  'expire-stale-listings',
  '0 3 * * *',
  $$select expire_stale_listings();$$
);
