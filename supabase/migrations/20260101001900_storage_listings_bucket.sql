-- Real listing photo uploads (was display-only via lib/media.ts's external-URL passthrough for
-- demo data until now). Public bucket — photos are meant to be publicly viewable on listings, and
-- a public bucket serves files via the public URL without an RLS check on read.
insert into storage.buckets (id, name, public)
values ('listings', 'listings', true)
on conflict (id) do nothing;

-- Uploads/deletes are restricted to the uploader's own folder — objects are stored under
-- <auth.uid()>/<filename>, checked via storage.foldername(name), so one user can't write into or
-- remove another user's files even though the bucket is public to read.
create policy listings_bucket_owner_insert on storage.objects for insert
  with check (bucket_id = 'listings' and (storage.foldername(name))[1] = auth.uid()::text);

create policy listings_bucket_owner_delete on storage.objects for delete
  using (bucket_id = 'listings' and (storage.foldername(name))[1] = auth.uid()::text);
