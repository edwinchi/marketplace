-- Explicit "my country" field, set by the user themselves (see
-- /my-account/preferences/location) rather than inferred from listing activity -- works for pure
-- buyers too, not just people who've posted. Used to scope new-listing notifications
-- (notify_new_listing) to the same country as the listing, reducing exposure to users who aren't
-- really in the market for it and cutting the size of each broadcast.
alter table profiles add column if not exists country_code varchar(2);

create or replace function notify_new_listing(p_listing_id uuid, p_seller_id uuid, p_title text, p_country_code varchar(2))
returns void
language sql
security definer
set search_path = public
as $$
  insert into notifications (profile_id, notification_type, title, payload)
  select id, 'new_listing', 'New listing: ' || p_title, jsonb_build_object('listing_id', p_listing_id)
  from profiles
  where notify_new_listings = true
    and id != p_seller_id
    and status = 'active'
    and (p_country_code is null or country_code = p_country_code);
$$;
