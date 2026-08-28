-- saved_searches already has notification_frequency (instant/off-style), but the account UI needs
-- two independent toggles (push vs. email) rather than one combined setting — additive columns,
-- both defaulting on to match "you'll hear about it" being the sensible default for a search
-- someone bothered to save.
begin;

alter table saved_searches
  add column if not exists notify_push boolean not null default true,
  add column if not exists notify_email boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

commit;
