-- Adds business_subscription_status to profiles_public (20260101006000_profiles_rls_lockdown.sql)
-- so the listing detail page can show a "Business" badge -- genuinely public-appropriate
-- information (that's the whole point of a visible badge), unlike most of what that lockdown
-- migration was written to keep private.
--
-- New column appended at the end, after phone_number, not inserted before it -- CREATE OR REPLACE
-- VIEW requires every pre-existing column to keep its exact name AND position; a new column
-- anywhere but last reads as an attempted rename of whatever column it displaced (confirmed live:
-- "cannot change name of view column phone_number to business_subscription_status").
create or replace view profiles_public as
select
  id,
  username,
  display_name,
  account_type,
  created_at,
  website_url,
  stripe_connect_charges_enabled,
  case when auth.uid() is not null then phone_number else null end as phone_number,
  business_subscription_status
from profiles;

grant select on profiles_public to anon, authenticated;
