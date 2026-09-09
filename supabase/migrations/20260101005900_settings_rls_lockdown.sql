-- app_settings' blanket "for select using (true)" policy was written when require_login was the
-- only key in the table, with a documented reason: proxy.ts reads it with the anon-key client on
-- every request, before a visitor is authenticated, so it has to stay world-readable. Two more
-- keys (listen_free_access, seller_pro_global_unlock) were added to the same table later, in the
-- same migration segment as this fix, and inherited that same blanket policy without anyone
-- reconsidering it -- neither is read anywhere except via the service-role client
-- (lib/app-settings.ts), so there's no reason for either to be world-readable. Scope the policy to
-- exactly the one key that actually needs it.
drop policy if exists "app_settings public read" on app_settings;
create policy "app_settings public read" on app_settings
  for select using (key = 'require_login');

-- numeric_settings and language_settings are read ONLY via the service-role client
-- (lib/numeric-settings.ts, lib/language-settings.ts) -- confirmed by checking every call site.
-- Their public read policies served no legitimate purpose and only exposed internal admin
-- configuration (fee percentages, which locales are disabled, etc.) to anyone with the anon key.
drop policy if exists "numeric_settings public read" on numeric_settings;
drop policy if exists "language_settings public read" on language_settings;
