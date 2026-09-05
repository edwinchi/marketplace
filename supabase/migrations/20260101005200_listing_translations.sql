-- listing_translations already exists (see 20260101000200_marketplace.sql) with RLS enabled
-- (20260101001000_complete_rls.sql) but no policies of its own, so it's currently unreadable and
-- unwritable by anon/authenticated roles. This adds the policies needed for the AI translation
-- feature (see app/listings/translate-action.ts): public read -- what actually delivers "for a
-- wider audience", a French-locale visitor sees the translation on the listing page itself, not
-- just the seller previewing it -- and owner-only write, matching listing_media_write's pattern.
create policy listing_translations_public_read on listing_translations for select using (true);

create policy listing_translations_owner_write on listing_translations for all
  using (exists (select 1 from listings l where l.id = listing_id and l.seller_id = current_profile_id()))
  with check (exists (select 1 from listings l where l.id = listing_id and l.seller_id = current_profile_id()));
