-- 20260101001700 added a SELECT policy for listing_media but no write policy — inserts from the
-- request-scoped (RLS-enforced) client during photo upload were silently blocked by default-deny.
-- Mirrors listing_attribute_values_write from 20260101001500.
create policy listing_media_write on listing_media for all
  using (exists (select 1 from listings l where l.id = listing_id and l.seller_id = current_profile_id()))
  with check (exists (select 1 from listings l where l.id = listing_id and l.seller_id = current_profile_id()));

-- Storage RLS (20260101001900) only had INSERT/DELETE policies — upsert:true and any future
-- re-read-before-write path needs SELECT/UPDATE too, scoped the same way (owner's folder only).
create policy listings_bucket_owner_select on storage.objects for select
  using (bucket_id = 'listings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy listings_bucket_owner_update on storage.objects for update
  using (bucket_id = 'listings' and (storage.foldername(name))[1] = auth.uid()::text);
