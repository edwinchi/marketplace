-- Follow-up to 20260101008400 (listings UPDATE) and 20260101008800 (profiles UPDATE + RPCs): the same
-- "RLS scopes the ROW, nothing scopes the COLUMNS" gap, found on every remaining table a signed-in
-- user can write through the REST API directly. Supabase grants INSERT/UPDATE on all columns to
-- authenticated by default; each block below revokes that and grants back exactly the columns the
-- app itself writes on the request-scoped client (cross-checked against every call site).
--
-- 1. listings INSERT. listing_write (FOR ALL ... WITH CHECK seller_id = me) let a seller INSERT a
--    listing with boost_rank = 2 (free Premium), homepage_featured_until (free homepage slot),
--    moderation_status = 'clear' (skip review), view_count/favorite_count, or published_at in the
--    far future -- the feed sorts by published_at, so that pins a listing to the top indefinitely,
--    a free permanent bump. published_at stays in the INSERT grant (so the app's own insert keeps
--    working whichever of code/migration deploys first), but the trigger below always overwrites
--    it with now() for user-originated inserts, so the value a client sends is ignored. The same
--    trigger clamps expires_at for
--    user-originated writes, so a seller can't PATCH expires_at = 2099 to dodge the 60-day expiry
--    sweep (20260101004200).
-- 2. conversation_participants UPDATE. participant_self_update checks profile_id = me but not
--    conversation_id, so a user could UPDATE their own participant row's conversation_id to any
--    other conversation's id and read that conversation's private messages. Only last_read_at is
--    ever written by the app.
-- 3. messages INSERT: no backdated created_at, no self-set moderation_status/deleted_at.
-- 4. notifications UPDATE: read_at only (the "mark read" action).
-- 5. listing_media INSERT/UPDATE: no self-set moderation_status.
-- 6. reviews INSERT: no backdated created_at, no order_id pointing at someone else's order.
-- 7. offers INSERT: no self-set status ('accepted') or expires_at.
-- 8. increment_listing_view_count / increment_daily_visitor_count were callable by anon (PUBLIC
--    default) -- anyone could inflate a listing's views (Seller insights) or the admin dashboard's
--    visitor stat. Both callers now use the service-role client.

-- 1. listings INSERT -------------------------------------------------------------------------------
revoke insert on listings from authenticated, anon;
grant insert (
  seller_id, category_id, location_id, source_language, title, description,
  price_minor, currency_code, price_type, condition_code,
  pickup_available, delivery_available, shipping_cost_minor, offers_allowed,
  status, published_at, expires_at
) on listings to authenticated;

-- SECURITY INVOKER (the default) on purpose: current_user is then the caller's own role, so this
-- only constrains writes arriving through the REST API as authenticated/anon -- the service-role
-- client (webhook, admin tools, seed scripts) and pg_cron (postgres) pass through untouched.
create or replace function listings_user_write_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.published_at := case when new.status = 'active' then now() else null end;
  end if;
  if new.expires_at is not null and new.expires_at > now() + interval '61 days' then
    new.expires_at := now() + interval '60 days';
  end if;
  return new;
end;
$$;

drop trigger if exists listings_user_write_guard on listings;
create trigger listings_user_write_guard
  before insert or update on listings
  for each row execute function listings_user_write_guard();

-- 2. conversation_participants UPDATE --------------------------------------------------------------
revoke update on conversation_participants from authenticated, anon;
grant update (last_read_at) on conversation_participants to authenticated;

-- 3. messages INSERT -------------------------------------------------------------------------------
revoke insert on messages from authenticated, anon;
grant insert (conversation_id, sender_id, content, attachment_key, message_type) on messages to authenticated;

-- 4. notifications UPDATE --------------------------------------------------------------------------
revoke update on notifications from authenticated, anon;
grant update (read_at) on notifications to authenticated;

-- 5. listing_media INSERT/UPDATE -------------------------------------------------------------------
revoke insert, update on listing_media from authenticated, anon;
grant insert (listing_id, storage_key, media_type, sort_order) on listing_media to authenticated;
grant update (sort_order) on listing_media to authenticated;

-- 6. reviews INSERT --------------------------------------------------------------------------------
revoke insert on reviews from authenticated, anon;
grant insert (reviewer_profile_id, reviewee_profile_id, rating, positive_tags, comment) on reviews to authenticated;

-- 7. offers INSERT ---------------------------------------------------------------------------------
revoke insert on offers from authenticated, anon;
grant insert (listing_id, buyer_id, amount_minor, currency_code) on offers to authenticated;

-- 8. counter RPCs -> service_role only -------------------------------------------------------------
revoke all on function increment_listing_view_count(uuid) from public, anon, authenticated;
grant execute on function increment_listing_view_count(uuid) to service_role;

revoke all on function increment_daily_visitor_count(date) from public, anon, authenticated;
grant execute on function increment_daily_visitor_count(date) to service_role;
