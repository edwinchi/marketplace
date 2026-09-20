-- CRITICAL FIX: every prior "revoke update (col) on listings from authenticated, anon" --
-- published_at (20260101007500), moderation_status (20260101007800), boost_rank (20260101008000),
-- homepage_featured_until (20260101008300) -- turned out to be a no-op in practice. Supabase grants
-- a blanket UPDATE (all columns) on every public table to authenticated/anon at the platform level,
-- and Postgres privilege resolution is additive across grant sources: a role's broader table-level
-- grant is NOT overridden by a narrower column-level REVOKE targeting that same role. Confirmed live
-- while testing the homepage-placement feature: a plain signed-in session (the publishable/anon key
-- plus a real user's own access token -- no service-role key involved) could PATCH boost_rank,
-- published_at, and homepage_featured_until directly via the REST API and have it stick. That's a
-- free path to Premium visibility, a free bump, or a free homepage feature slot for anyone willing to
-- skip the UI and call the API directly -- moderation_status is presumed equally exposed (same
-- mechanism, not independently re-tested to avoid creating more test data).
--
-- The only real fix: revoke the blanket table-level UPDATE grant entirely, then grant UPDATE back on
-- only the columns a seller legitimately edits themselves through the app -- cross-checked against
-- every `.from("listings").update(...)` call site that runs on the request-scoped, RLS-governed
-- client rather than createServiceClient() (app/listings/actions.ts's createListing/updateListing/
-- deleteListing/markListingSold/relistListing). Every service-role-only write (boost_rank,
-- moderation_status, title_embedding, image_embedding, view_count, favorite_count,
-- homepage_featured_until, published_at-via-bump) is simply left out, the same trust boundary
-- INSERT already relies on: nothing stops a service-role key from writing anything, but that key
-- only ever lives on the server.
revoke update on listings from authenticated, anon;
grant update (
  title, description, category_id, price_minor, currency_code, condition_code,
  status, deleted_at, expires_at
) on listings to authenticated;
