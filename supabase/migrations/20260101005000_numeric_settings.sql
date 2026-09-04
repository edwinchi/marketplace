-- Small generic key/value store for admin-editable *numeric* settings, mirroring app_settings'
-- shape (20260101004100) but for integers instead of booleans -- a text field wants an explicit
-- Save action rather than app_settings'/language_settings' instant-save-on-click toggles, so this
-- is a separate table rather than overloading either of those.
create table if not exists numeric_settings (
  key text primary key,
  value integer not null,
  updated_at timestamptz not null default now()
);

alter table numeric_settings enable row level security;

create policy "numeric_settings public read" on numeric_settings
  for select using (true);

-- Matches category-group-card.tsx's COLLAPSED_LIMIT default so the setting starts at the value
-- already shipped in code, not a surprising jump the first time this migration runs.
insert into numeric_settings (key, value)
values ('category_group_collapsed_limit', 3)
on conflict (key) do nothing;
