-- Keeps audit_logs' monthly partitions from lapsing (AGENTS.md §4: "keep the partition-creation
-- function and schedule it ... rather than letting it lapse"). Until now the function only ran once,
-- inside 20260101000300, so partitions existed for August and September 2026 only; anything later
-- falls into audit_logs_default. Found by the October 2026 board review.
--
-- Also closes the gap 20260101002200_internal_tables_rls.sql flagged in its own comment: PostgREST
-- can query a named partition directly, bypassing the parent's RLS, so every partition needs RLS
-- enabled too, and the function never did that for the ones it creates.
--
-- Note: creating a monthly partition fails if audit_logs_default already holds rows in that month's
-- range. audit_logs held no rows when this was written (2026-10-12), so the backfill below is safe.

create or replace function create_monthly_audit_partition(month_start date)
returns void
language plpgsql
set search_path = public
as $$
declare
  n text := 'audit_logs_' || to_char(month_start, 'YYYY_MM');
  e date := (month_start + interval '1 month')::date;
begin
  execute format('create table if not exists %I partition of audit_logs for values from (%L) to (%L)', n, month_start, e);
  execute format('alter table %I enable row level security', n);
end
$$;

-- Not callable from the API: partition management is for the scheduler and migrations only.
revoke execute on function create_monthly_audit_partition(date) from public, anon, authenticated;

-- The months that lapsed, plus the next two, so the schedule below always runs a month ahead.
select create_monthly_audit_partition('2026-10-01');
select create_monthly_audit_partition('2026-11-01');
select create_monthly_audit_partition('2026-12-01');

-- Existing partitions made before this function enabled RLS itself.
alter table if exists audit_logs_2026_08 enable row level security;
alter table if exists audit_logs_2026_09 enable row level security;

-- On the 20th of every month, create the partition for the month after next. Same pg_cron
-- mechanism as run-health-check (20260101006800); scheduling an existing job name replaces it.
select cron.schedule(
  'create-audit-partition',
  '0 3 20 * *',
  $$select create_monthly_audit_partition((date_trunc('month', now()) + interval '2 months')::date)$$
);
