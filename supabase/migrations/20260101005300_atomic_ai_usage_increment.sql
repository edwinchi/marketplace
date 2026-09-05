-- analyzeListingPhoto (app/listings/new/analyze-photo-action.ts) was incrementing
-- ai_photo_analysis_uses by reading the current count into JS, adding 1, then writing it back --
-- two concurrent calls for the same profile (e.g. a double-fired click, or a retried request) both
-- read the same starting count and each write count+1, so a single real "fill in with AI" action
-- could cost a user two uses while only advancing the stored count by one. This RPC makes the
-- increment atomic at the database level so N calls always advance the count by exactly N.
create or replace function increment_ai_photo_analysis_uses(p_profile_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update profiles set ai_photo_analysis_uses = ai_photo_analysis_uses + 1
  where id = p_profile_id
  returning ai_photo_analysis_uses;
$$;
