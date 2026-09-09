-- Permanently purges listings that have been soft-deleted (status='deleted', set by
-- deleteListing() in app/listings/actions.ts) for at least 30 days -- the grace period gives real
-- time to notice and recover from an accidental delete before it's permanent. Scoped to listings
-- only, per the site owner's explicit choice -- deleted accounts and deleted messages are left
-- alone. Same pg_cron pattern as expire_stale_listings() (20260101004200_listing_expiry.sql).
--
-- listing_media/listing_attribute_values/listing_attribute_multi_options/favorites/
-- listing_translations all cascade on listing deletion (see their own migrations), so those clean
-- up automatically. offers/conversations/reports do NOT cascade (no ON DELETE CASCADE on their
-- listing_id/reported_listing_id FKs) -- a listing with any real offer, message thread, or report
-- against it will raise a foreign_key_violation on delete; this catches that per listing and
-- leaves it soft-deleted rather than force-destroying that history, instead of failing the whole
-- weekly run over one listing with real activity attached.
create or replace function purge_deleted_listings()
returns void
language plpgsql
as $$
declare
  rec record;
begin
  for rec in
    select id from listings
    where status = 'deleted'
      and deleted_at is not null
      and deleted_at < now() - interval '30 days'
  loop
    begin
      delete from listings where id = rec.id;
    exception when foreign_key_violation then
      null;
    end;
  end loop;
end;
$$;

-- Weekly, Sunday 4am UTC -- after the daily 3am expiry sweep, so the two never overlap.
select cron.schedule(
  'purge-deleted-listings',
  '0 4 * * 0',
  $$select purge_deleted_listings();$$
);
