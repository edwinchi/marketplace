-- Per-language enable/disable, flippable from the admin dashboard without a code deploy -- same
-- reasoning and RLS shape as app_settings' require_login (20260101004100), but modeled as its own
-- table (one row per locale) rather than jammed into that generic key/value store, since this is a
-- fixed, structured set of rows rather than a handful of unrelated flags.
create table if not exists language_settings (
  locale text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table language_settings enable row level security;

create policy "language_settings public read" on language_settings
  for select using (true);

-- English is deliberately not a row here -- it's i18n/request.ts's DEFAULT_LOCALE and the fallback
-- every disabled/invalid locale resolves to, so it can't meaningfully be turned off. Only the
-- languages added after English need a toggle at all.
insert into language_settings (locale, enabled) values
  ('fr', true),
  ('ar', true),
  ('zh', true)
on conflict (locale) do nothing;
