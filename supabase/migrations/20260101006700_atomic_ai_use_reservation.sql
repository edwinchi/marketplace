-- Security fix: analyzeListingPhoto (app/listings/new/analyze-photo-action.ts) read
-- ai_photo_analysis_uses, compared it to the limit in JS, THEN made the (potentially paid, once
-- free providers are exhausted) AI provider call, and only incremented the atomic counter AFTER a
-- successful response. The read-then-act gap meant N concurrent requests from the same account
-- (trivially scriptable -- Server Actions are directly POST-reachable, no extra token required)
-- all read the same starting count, all passed the limit check, and all made a real billable
-- provider call before any of them had actually advanced the stored count. The 20260101005300
-- increment RPC itself was already atomic; the bug was that nothing reserved a slot BEFORE the
-- expensive call, only after it.
--
-- reserve_ai_photo_analysis_use does the check-and-increment as one atomic UPDATE ... WHERE ...
-- RETURNING -- it only matches a row (and only increments) if the account is still under its
-- limit at that exact moment, so concurrent callers serialize on the row lock instead of racing
-- past a stale in-JS comparison. release_ai_photo_analysis_use is the compensating refund for when
-- a reservation succeeded but the provider call then failed for a reason that isn't the user's
-- fault (network error, every provider down, rate limited) -- preserves the existing "a service
-- failure never costs you one of your free tries" guarantee without reopening the race to get it.
create or replace function reserve_ai_photo_analysis_use(p_profile_id uuid, p_effective_limit integer, p_unlimited boolean)
returns integer
language sql
security definer
set search_path = public
as $$
  update profiles
  set ai_photo_analysis_uses = ai_photo_analysis_uses + 1
  where id = p_profile_id
    and (p_unlimited or ai_photo_analysis_uses < p_effective_limit)
  returning ai_photo_analysis_uses;
$$;

create or replace function release_ai_photo_analysis_use(p_profile_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  update profiles
  set ai_photo_analysis_uses = greatest(ai_photo_analysis_uses - 1, 0)
  where id = p_profile_id
  returning ai_photo_analysis_uses;
$$;
