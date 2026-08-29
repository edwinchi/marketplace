-- Small generic key/value settings store for site-wide toggles that should be flippable from the
-- admin dashboard without a code deploy. First use: require_login (proxy.ts's sign-in-to-browse
-- gate). Publicly readable (these are non-sensitive operational flags, and proxy.ts reads this
-- with the anon-key client on every request); writes go through the service-role client only,
-- from the admin-gated server action, so no INSERT/UPDATE policy is needed.
create table if not exists app_settings (
  key text primary key,
  value boolean not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;

create policy "app_settings public read" on app_settings
  for select using (true);

insert into app_settings (key, value)
values ('require_login', true)
on conflict (key) do nothing;
