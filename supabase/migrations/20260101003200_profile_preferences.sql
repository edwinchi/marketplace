-- Real, working preference storage for settings AfroDeals doesn't act on yet (no marketing email
-- campaigns, no push notification dispatch beyond the in-app inbox, no location-based ranking) —
-- saving a genuine preference ahead of the sender/feature existing is normal sequencing, not
-- fabrication. Distinct from "Enable payments" (would need real bank-detail handling this project
-- has no PCI-grade infrastructure for) and "My experiences" (needs a whole review-authoring
-- feature, not a toggle) — both of those stay un-built rather than faked.
begin;

alter table profiles
  add column if not exists marketing_emails_opt_in boolean not null default true,
  add column if not exists notify_new_messages boolean not null default true,
  add column if not exists notify_offers boolean not null default true,
  add column if not exists location_sharing_opt_in boolean not null default false,
  add column if not exists preferred_city varchar(150);

commit;
