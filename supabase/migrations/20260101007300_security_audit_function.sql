-- Read-only introspection for a recurring automated security audit (ops/security-audit.mjs, run
-- every 12h). Flags the exact two failure modes that have actually bitten this schema before:
-- RLS enabled with zero policies (silently locked, hit for businesses/listing_media/
-- listing_translations at various points -- see their own migration comments), and RLS enabled
-- with a literal `using (true)` select policy that doesn't scope to the parent record's visibility
-- (the listing_translations bug this migration's sibling, 20260101007200, just fixed). Also
-- reports any public-schema table with RLS off entirely, the most severe case.
--
-- security invoker (the default, no elevated privilege needed): pg_class/pg_policies are ordinary
-- catalog views readable by any role, RLS doesn't gate them. What actually needs locking down is
-- who can CALL this function -- it summarizes the app's security posture, which shouldn't itself be
-- public information -- so EXECUTE is revoked from anon/authenticated below and granted only to
-- service_role (the audit script already holds that key; nothing new to provision).
create or replace function public.run_security_audit()
returns jsonb
language sql
set search_path = public
as $$
  select jsonb_build_object(
    'checked_at', now(),
    'rls_disabled', coalesce((
      select jsonb_agg(jsonb_build_object('table', c.relname) order by c.relname)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    ), '[]'::jsonb),
    'rls_enabled_no_policies', coalesce((
      select jsonb_agg(jsonb_build_object('table', c.relname) order by c.relname)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
        and not exists (
          select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname
        )
    ), '[]'::jsonb),
    'unconditional_select_policies', coalesce((
      select jsonb_agg(jsonb_build_object('table', tablename, 'policy', policyname) order by tablename, policyname)
      from pg_policies
      where schemaname = 'public' and cmd in ('SELECT', 'ALL') and qual = 'true'
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.run_security_audit() from public, anon, authenticated;
grant execute on function public.run_security_audit() to service_role;
