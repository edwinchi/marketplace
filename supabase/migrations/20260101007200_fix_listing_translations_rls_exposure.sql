-- listing_translations_public_read (20260101005200_listing_translations.sql) reads
-- "for select using (true)" -- unlike every other per-listing child table (listing_media_read,
-- listing_attribute_values_read, listing_attribute_multi_options_read, all gated on
-- `l.status = 'active' OR l.seller_id = current_profile_id()`, same file family), it exposes the
-- title/description/slug of every listing's translations regardless of the parent listing's
-- status: draft listings never published, rejected/suspended listings, and soft-deleted ones, all
-- readable by anyone holding just the anon key via a plain REST call to
-- /rest/v1/listing_translations. Bring it in line with the rest of the family so a translation is
-- only readable when the listing itself would be.
drop policy if exists listing_translations_public_read on listing_translations;

create policy listing_translations_read on listing_translations for select
  using (exists (
    select 1 from listings l
    where l.id = listing_id and (l.status = 'active' or l.seller_id = current_profile_id())
  ));
