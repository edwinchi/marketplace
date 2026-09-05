-- businesses (20260101000000_core.sql) had ENABLE ROW LEVEL SECURITY (20260101001000_complete_rls.sql)
-- but no policy at all -- the same silently-locked-table bug already hit once for
-- listing_translations. No app feature reads/writes this table yet, so it's been harmless so far,
-- but the moment one does through the normal (non-service-role) client, every query would return
-- nothing and every insert would fail with zero explanation. Owner-only, not public-read: unlike a
-- listing, a business record holds verification details (VAT number, chamber of commerce number)
-- that shouldn't be visible to anyone but its own owner.
create policy businesses_owner_all on businesses for all
  using (owner_profile_id = current_profile_id())
  with check (owner_profile_id = current_profile_id());
