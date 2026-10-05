-- CRITICAL FIX, two holes of the same family as 20260101008400 (the listings UPDATE-grant bypass):
--
-- 1. profiles: profiles_self_update (20260101001500) scopes WHICH ROW a signed-in user may update
--    (their own), but never WHICH COLUMNS -- and Supabase's platform-level blanket UPDATE grant to
--    authenticated/anon covers every column. So a plain signed-in session (publishable key + the
--    user's own access token) could PATCH its own row's ai_subscription_status = 'active' (free
--    Seller Pro), business_subscription_status = 'active' (free Business badge), ai_bonus_uses,
--    ai_photo_analysis_uses (reset the free-tier counter), email_verified, stripe_customer_id,
--    stripe_connect_account_id/_charges_enabled, referred_by_profile_id, account_number, ... Same
--    fix as listings: revoke the table-level UPDATE, grant back only the columns the app genuinely
--    lets a user edit on the request-scoped client -- cross-checked against every
--    `.from("profiles").update(...)` call site: app/my-account/profile/edit/actions.ts (display
--    name, website, phone, postal code, account type), app/my-account/preferences/actions.ts
--    (TOGGLE_FIELDS, preferred_city, country_code), app/listings/actions.ts (website_url). The
--    stripe_customer_id/stripe_connect_account_id writes in the checkout/onboarding actions move to
--    the service-role client in the same change, since those ids must never be user-settable
--    (a user pointing stripe_customer_id at someone else's customer would get THEIR billing portal).
--    deleteAccount's status = 'deleted' write moves to the service-role client too, rather than
--    granting `status` (which would also let a user flip it to anything else).
--
-- 2. SECURITY DEFINER RPCs never had EXECUTE revoked from PUBLIC (Postgres's default grant), so
--    PostgREST exposed them to anon at /rest/v1/rpc/<name>. increment_ai_bonus_uses(p_profile_id,
--    p_amount) was callable by anyone, unauthenticated, for any profile id (profiles_public exposes
--    every id) with any amount -- unlimited free AI uses, or draining someone else's purchased ones.
--    release_ai_photo_analysis_use let anyone reset any user's usage counter; reserve_/increment_
--    let anyone burn another user's free uses; notify_new_listing let anyone broadcast an arbitrary
--    "New listing: <title>" notification to every opted-in user, bypassing the Seller Pro gate.
--    Same lockdown pattern as bump_listing/extend_homepage_placement: service_role only, callers
--    switched to createServiceClient(). The pg_cron-only maintenance functions are locked down too
--    (cron runs as postgres, unaffected) -- there's no reason for the public API to reach them.

-- 1. profiles column-level UPDATE ------------------------------------------------------------------
revoke update on profiles from authenticated, anon;
grant update (
  display_name, website_url, phone_number, postal_code, account_type,
  preferred_city, country_code,
  marketing_emails_opt_in, marketing_news_opt_in, marketing_listing_tips_opt_in,
  marketing_promotions_opt_in, marketing_surveys_opt_in, marketing_partner_ads_opt_in,
  notify_new_messages, notify_offers, notify_new_listings, notify_listing_favorited,
  notify_price_drops, location_sharing_opt_in, allow_seller_contact_on_favorite,
  digital_invoice_opt_in
) on profiles to authenticated;

-- 2. SECURITY DEFINER RPCs -> service_role only ------------------------------------------------------
-- The original 3-arg notify_new_listing (20260101006100) was never dropped when 20260101006200
-- added the country-scoped 4-arg version, so it's still live and still callable -- drop it.
drop function if exists notify_new_listing(uuid, uuid, text);

revoke all on function increment_ai_bonus_uses(uuid, integer) from public, anon, authenticated;
grant execute on function increment_ai_bonus_uses(uuid, integer) to service_role;

revoke all on function increment_ai_photo_analysis_uses(uuid) from public, anon, authenticated;
grant execute on function increment_ai_photo_analysis_uses(uuid) to service_role;

revoke all on function reserve_ai_photo_analysis_use(uuid, integer, boolean) from public, anon, authenticated;
grant execute on function reserve_ai_photo_analysis_use(uuid, integer, boolean) to service_role;

revoke all on function release_ai_photo_analysis_use(uuid) from public, anon, authenticated;
grant execute on function release_ai_photo_analysis_use(uuid) to service_role;

revoke all on function notify_new_listing(uuid, uuid, text, varchar) from public, anon, authenticated;
grant execute on function notify_new_listing(uuid, uuid, text, varchar) to service_role;

revoke all on function run_health_check() from public, anon, authenticated;
grant execute on function run_health_check() to service_role;

revoke all on function fix_miscategorized_listings() from public, anon, authenticated;
grant execute on function fix_miscategorized_listings() to service_role;

revoke all on function purge_deleted_listings() from public, anon, authenticated;
grant execute on function purge_deleted_listings() to service_role;

revoke all on function expire_stale_listings() from public, anon, authenticated;
grant execute on function expire_stale_listings() to service_role;
