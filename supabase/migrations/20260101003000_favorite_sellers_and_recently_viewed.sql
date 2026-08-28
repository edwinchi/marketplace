-- Two more account-hub features with no existing schema behind them: following a seller, and a
-- "recently viewed" history. Both are small, self-contained, real tables — same shape as the
-- existing favorites table — not fabricated UI over nothing.
begin;

create table favorite_sellers (
  profile_id uuid not null references profiles(id) on delete cascade,
  seller_profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, seller_profile_id),
  check (profile_id <> seller_profile_id)
);

alter table favorite_sellers enable row level security;
create policy favorite_sellers_owner on favorite_sellers for all
  using (profile_id = current_profile_id())
  with check (profile_id = current_profile_id());

create table recently_viewed_listings (
  profile_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (profile_id, listing_id)
);

alter table recently_viewed_listings enable row level security;
create policy recently_viewed_owner on recently_viewed_listings for all
  using (profile_id = current_profile_id())
  with check (profile_id = current_profile_id());

commit;
