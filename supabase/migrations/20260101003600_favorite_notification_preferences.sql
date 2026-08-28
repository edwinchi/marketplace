-- Two more granular notification preferences from the reference notification-settings screen:
-- letting a seller reach out when you favorite their listing, and being notified when someone
-- favorites yours. Both distinct from the existing notify_new_messages/notify_offers columns.
alter table profiles
  add column if not exists allow_seller_contact_on_favorite boolean not null default true,
  add column if not exists notify_listing_favorited boolean not null default true;
