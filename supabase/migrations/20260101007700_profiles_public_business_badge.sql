-- Adds business_subscription_status to profiles_public (20260101006000_profiles_rls_lockdown.sql)
-- so the listing detail page can show a "Business" badge -- genuinely public-appropriate
-- information (that's the whole point of a visible badge), unlike most of what that lockdown
-- migration was written to keep private.
create or replace view profiles_public as
select
  id,
  username,
  display_name,
  account_type,
  created_at,
  website_url,
  stripe_connect_charges_enabled,
  business_subscription_status,
  case when auth.uid() is not null then phone_number else null end as phone_number
from profiles;

grant select on profiles_public to anon, authenticated;
