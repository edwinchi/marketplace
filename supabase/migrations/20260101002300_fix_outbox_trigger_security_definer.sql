-- 20260101002200 locked outbox_events to service-role-only (correctly — it's an internal CDC
-- table, never meant to be queried by end users). What that migration missed: listing_outbox()
-- (09_triggers_outbox_search.sql) is a trigger that fires on every listing insert/update and
-- writes to outbox_events *as whichever user is creating the listing*, not as a service role.
-- Every listing creation started failing with "new row violates row-level security policy for
-- table outbox_events" the moment RLS went on. SECURITY DEFINER makes the trigger run with the
-- function owner's privileges regardless of the calling user, the same pattern already used by
-- handle_new_user() and current_profile_id() in this schema — bypassing RLS for this one
-- internal write without reopening the table to normal clients.
CREATE OR REPLACE FUNCTION listing_outbox() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO outbox_events(aggregate_type,aggregate_id,event_type,payload)
  VALUES('listing',NEW.id,CASE WHEN TG_OP='INSERT' THEN 'listing.created' ELSE 'listing.updated' END,
         jsonb_build_object('listing_id',NEW.id,'status',NEW.status,'updated_at',NEW.updated_at));
  RETURN NEW;
END $$;
