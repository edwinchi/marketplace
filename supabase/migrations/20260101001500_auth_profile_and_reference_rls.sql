-- Two gaps in the ported base schema, fixed before any client code talks to these tables:
--
-- 1. No mechanism creates a `profiles` row when someone signs up via Supabase Auth. Standard
--    Supabase pattern: a trigger on auth.users. SECURITY DEFINER so it can write regardless of
--    the caller's RLS (the caller has no profile yet, so couldn't satisfy the RLS check below
--    even if it were relevant to inserts).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'display_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. RLS was never enabled on profiles, the taxonomy/reference tables, or the listing-attribute
--    tables. Without it, Supabase's default grants let any client holding the anon key read AND
--    write these directly via the REST API — enabling it here, before any browser code exists
--    that talks to them.

alter table profiles enable row level security;
create policy profiles_public_read on profiles for select using (true);
create policy profiles_self_update on profiles for update
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

-- Taxonomy/reference data: public read, no client writes (only the service role, which bypasses
-- RLS, should ever modify these — via seed migrations or an admin tool, not user-facing code).
alter table languages enable row level security;
create policy languages_public_read on languages for select using (true);

alter table categories enable row level security;
create policy categories_public_read on categories for select using (true);
alter table category_translations enable row level security;
create policy category_translations_public_read on category_translations for select using (true);

alter table attributes enable row level security;
create policy attributes_public_read on attributes for select using (true);
alter table attribute_translations enable row level security;
create policy attribute_translations_public_read on attribute_translations for select using (true);
alter table attribute_options enable row level security;
create policy attribute_options_public_read on attribute_options for select using (true);
alter table attribute_option_translations enable row level security;
create policy attribute_option_translations_public_read on attribute_option_translations for select using (true);
alter table category_attributes enable row level security;
create policy category_attributes_public_read on category_attributes for select using (true);

alter table vehicle_makes enable row level security;
create policy vehicle_makes_public_read on vehicle_makes for select using (true);
alter table vehicle_models enable row level security;
create policy vehicle_models_public_read on vehicle_models for select using (true);

-- Locations: public read (city/province precision only in this app, never exact addresses — see
-- data/README.md's privacy note), insert open to any signed-in user (needed when posting a
-- listing; nothing sensitive is collected at this precision).
alter table locations enable row level security;
create policy locations_public_read on locations for select using (true);
create policy locations_authenticated_insert on locations for insert
  with check (auth.uid() is not null);

-- Listing attribute values: same visibility as their parent listing (public if the listing is
-- active, otherwise owner-only), writable only by the listing's seller — mirrors the
-- listing_read/listing_write policies from 10_complete_rls.sql.
alter table listing_attribute_values enable row level security;
create policy listing_attribute_values_read on listing_attribute_values for select
  using (exists (
    select 1 from listings l
    where l.id = listing_id and (l.status = 'active' or l.seller_id = current_profile_id())
  ));
create policy listing_attribute_values_write on listing_attribute_values for all
  using (exists (select 1 from listings l where l.id = listing_id and l.seller_id = current_profile_id()))
  with check (exists (select 1 from listings l where l.id = listing_id and l.seller_id = current_profile_id()));

alter table listing_attribute_multi_options enable row level security;
create policy listing_attribute_multi_options_read on listing_attribute_multi_options for select
  using (exists (
    select 1 from listings l
    where l.id = listing_id and (l.status = 'active' or l.seller_id = current_profile_id())
  ));
create policy listing_attribute_multi_options_write on listing_attribute_multi_options for all
  using (exists (select 1 from listings l where l.id = listing_id and l.seller_id = current_profile_id()))
  with check (exists (select 1 from listings l where l.id = listing_id and l.seller_id = current_profile_id()));
