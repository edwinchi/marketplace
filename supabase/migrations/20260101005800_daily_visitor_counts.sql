-- One row per calendar day, holding a real count of distinct visitors that day -- "distinct" is
-- enforced client-side via a short-lived "seen today" cookie (see app/api/track-visit/route.ts),
-- not a stored per-visitor identifier: this counts real, live traffic without persisting anything
-- that identifies a specific visitor, or growing unbounded the way a per-visit-row table would.
create table if not exists daily_visitor_counts (
  day date primary key,
  count integer not null default 0
);

alter table daily_visitor_counts enable row level security;
-- No app-facing policy: this is written only via the service-role client (the /api/track-visit
-- route) and read only via the service-role client (the admin dashboard), same as
-- rate_limit_events/stripe_webhook_events/outbox_events elsewhere in this schema.

create or replace function increment_daily_visitor_count(p_day date)
returns void
language sql
security definer
set search_path = public
as $$
  insert into daily_visitor_counts (day, count) values (p_day, 1)
  on conflict (day) do update set count = daily_visitor_counts.count + 1;
$$;
