-- A permanent, database-native health check -- runs via pg_cron (same mechanism already driving
-- expire-stale-listings and purge-deleted-listings), completely independent of any chat session,
-- deploy, or human remembering to check. Built directly in response to a real live outage: this
-- session shipped app code calling reserve_ai_photo_analysis_use()/release_ai_photo_analysis_use()
-- before the migration creating them had been run, silently breaking every AI photo-analysis call
-- for hours with no alert. This check specifically catches that class of bug (app code depending on
-- a database object that doesn't exist yet) plus a regression check for the single worst incident
-- this project has had (the profiles-table RLS exposure) -- both are cheap, zero-cost checks (no
-- external API calls, no AI usage, no fabricated test listings polluting real data).
create table if not exists health_check_log (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null default now(),
  all_passed boolean not null,
  failures jsonb not null default '[]'::jsonb
);

alter table health_check_log enable row level security;
-- No public policy at all -- read only via the service-role client from /admin, same pattern as
-- numeric_settings/app_settings after their own lockdown.

create or replace function run_health_check()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failures jsonb := '[]'::jsonb;
  v_missing_fn text;
  v_required_fns text[] := array[
    'increment_ai_photo_analysis_uses', 'reserve_ai_photo_analysis_use', 'release_ai_photo_analysis_use',
    'increment_ai_bonus_uses', 'notify_new_listing', 'handle_new_user', 'handle_email_confirmed',
    'purge_deleted_listings', 'match_listings_by_embedding', 'start_conversation',
    'current_profile_id', 'increment_daily_visitor_count', 'increment_listing_view_count'
  ];
  v_anon_profile_columns_exposed boolean;
begin
  -- Every RPC/trigger function the app code currently calls by name must actually exist -- this
  -- is exactly the failure mode that caused the outage this check exists to catch.
  foreach v_missing_fn in array v_required_fns loop
    if not exists (select 1 from pg_proc where proname = v_missing_fn) then
      v_failures := v_failures || jsonb_build_object('check', 'missing_function', 'name', v_missing_fn);
    end if;
  end loop;

  -- Regression guard for the profiles-table RLS exposure fixed in 20260101006000 -- confirms the
  -- anon role still cannot read the locked-down profiles table directly (only profiles_public).
  select exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'profiles_public_read'
  ) into v_anon_profile_columns_exposed;
  if v_anon_profile_columns_exposed then
    v_failures := v_failures || jsonb_build_object('check', 'profiles_rls_regression', 'detail', 'profiles_public_read policy exists again on profiles');
  end if;

  insert into health_check_log (all_passed, failures)
  values (jsonb_array_length(v_failures) = 0, v_failures);

  -- Keeps the table from growing unbounded -- 30 days of history (at the schedule below, ~1,440
  -- rows) is more than enough to spot a pattern, and this function runs on every check.
  delete from health_check_log where checked_at < now() - interval '30 days';
end;
$$;

select cron.schedule('run-health-check', '*/30 * * * *', $$select run_health_check();$$);

-- One immediate run so /admin has real data to show right away, not an empty state until the
-- first scheduled tick.
select run_health_check();
