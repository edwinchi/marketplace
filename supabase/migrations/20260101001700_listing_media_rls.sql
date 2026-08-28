-- data/10_complete_rls.sql enabled RLS on listing_media but never gave it a policy — with RLS on
-- and zero policies, Postgres default-denies everyone except the table owner/service role. The
-- app's anon/authenticated queries were silently getting zero rows back (no error, just empty),
-- which is why listing photos never rendered. Mirrors the listing_read policy from that file.
create policy listing_media_read on listing_media for select
  using (exists (
    select 1 from listings l
    where l.id = listing_id and (l.status = 'active' or l.seller_id = current_profile_id())
  ));
