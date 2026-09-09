-- Per-user opt-out, matching the existing notify_new_messages/notify_offers/notify_listing_favorited
-- pattern -- "every registered user gets notified of every new posting" is the default (true), not
-- a zero-control blast; anyone can turn it off from /my-account/preferences/notifications.
alter table profiles add column if not exists notify_new_listings boolean not null default true;

-- notifications already had an owner-read policy (notification_owner, 20260101001000_complete_rls)
-- but nothing let a user mark their own notification read.
create policy notification_owner_update on notifications for update
  using (profile_id = current_profile_id())
  with check (profile_id = current_profile_id());

-- Bulk fan-out in one statement rather than fetching every eligible profile id into the app and
-- inserting row-by-row -- this is the only place a single action needs to write one notification
-- row per registered user, and that shape only scales as a set-based INSERT ... SELECT.
create or replace function notify_new_listing(p_listing_id uuid, p_seller_id uuid, p_title text)
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
    and status = 'active';
$$;
