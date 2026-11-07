-- Hide listing postcodes from the public (risk R8, docs/THREAT-MODEL.md; owner approval
-- 2026-11-07). The RLS policy locations_public_read lets anyone read every locations row, which is
-- right for city and coordinates (city-level points used for distance search) but not for
-- postal_code: a full Dutch postcode ("1234 AB") narrows down to about one street, and joined to
-- listings.seller_id it says roughly where a seller lives. GDPR data minimisation.
--
-- Nothing in the app reads postal_code through the anon/authenticated roles: listing pages, cards
-- and search select only city / country_code; geocoding reads it with the service role (which keeps
-- full access). Inserts keep working: column privileges for INSERT are unchanged, and the posting
-- flow's `.insert(...).select("id")` only reads id back.
--
-- Column-level SELECT privileges: revoke the table-wide grant, then grant every column except
-- postal_code. A new column added to locations later must be granted here too, or anon and
-- signed-in users can't read it (a failing query, not a leak).

revoke select on table public.locations from anon, authenticated;

grant select (id, country_code, province, municipality, city, neighborhood, latitude, longitude, geog)
  on table public.locations to anon, authenticated;

-- Verify (as the anon role, e.g. tests/browser/anon-access.mjs, or):
--   set role anon; select postal_code from locations limit 1;  -- ERROR: permission denied
--   set role anon; select city from locations limit 1;         -- works
--   reset role;
