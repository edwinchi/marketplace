-- Real address book (no schema existed for this at all) — a profile can save multiple addresses
-- for reuse, matching the pattern already established by favorite_sellers/recently_viewed_listings.
begin;

create table addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  label varchar(60),
  recipient_name varchar(150) not null,
  street varchar(200) not null,
  city varchar(150) not null,
  postal_code varchar(20),
  country_code char(2) not null default 'NG',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table addresses enable row level security;
create policy addresses_owner on addresses for all
  using (profile_id = current_profile_id())
  with check (profile_id = current_profile_id());

commit;
