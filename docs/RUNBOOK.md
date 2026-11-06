# MarketitNow — operations runbook

For whoever is on call. Run every `vercel` command from `apps/web` (never the repo root). Any
production change is Level 3: owner sign-off first (AGENTS.md §13). Last reviewed 2026-11-06.

## Quick checks

| Check | Command / URL | Healthy |
|---|---|---|
| App + database | `curl https://marketitnow.net/api/health` | `200 {"ok":true,"database":"up","version":"<commit>"}` |
| Which build is live | `vercel inspect marketitnow.net` | the deployment you expect |
| Recent errors | `vercel logs <deployment-url> --level error --expand` | nothing new |
| Old domain | `curl -sI https://afrodeals.net/x` | `308` → `https://marketitnow.net/x` |
| Security headers | `curl -sI https://marketitnow.net` | HSTS, CSP (no `unsafe-eval`), Permissions-Policy |
| RLS drift | `ops/security-audit.mjs` (Windows Task, every 12h) | no new findings in `ops/security-audit.log` |

Point an uptime monitor (Better Stack, UptimeRobot) at `/api/health`: alert on non-200 twice in a
row. A 503 with `"error":"timeout"` means Supabase didn't answer within 4 s.

## Incidents

### Site down or erroring for everyone
1. `curl /api/health`. A 503 means the database is unreachable: go to "Database down".
2. If health is 200 but pages fail, a deploy is the usual cause: `vercel ls afrodeals.net`, compare
   the time with when it started.
3. **Roll back first, debug after:** `vercel rollback` (or Vercel dashboard → Deployments →
   previous good one → Promote). Confirm `/api/health` shows the old commit.
4. Read `vercel logs <bad-deployment> --level error --expand`, fix on a branch, check it on the
   preview deployment, then ship with sign-off.

### Database down / slow (health 503)
1. status.supabase.com, then the Supabase dashboard for project `nodzslouearhjsiwhvst`.
2. Nothing to roll back in the app: wait or contact Supabase support. Pages degrade; payments
   webhooks are retried by Stripe for up to 3 days, so none are lost.
3. After recovery, check Stripe → Developers → Webhooks for failed deliveries and resend them.

### Payments: buyers charged but orders not marked paid
1. Stripe dashboard → Webhooks → the endpoint for `https://marketitnow.net/api/stripe/webhook`:
   look at failed deliveries and the response body.
2. 400 "signature" means `STRIPE_WEBHOOK_SECRET` in Vercel doesn't match the endpoint's signing
   secret: update it (`vercel env add`), no redeploy needed for server-only vars.
3. Resend the failed events from Stripe after the fix.

### Sign-up / password-reset emails not arriving
1. Resend dashboard → Logs. A 403 "testing emails" means `RESEND_FROM_EMAIL` isn't on a verified
   domain.
2. Links in emails must start with `https://marketitnow.net` (forced by `lib/site-url.ts`). If not,
   check `VERCEL_ENV` is `production` and Supabase → Auth → URL Configuration → Site URL.

### Suspected security incident (leaked key, abuse)
1. Rotate the key at its source (Stripe, Supabase service role, OpenRouter, Resend), then
   `vercel env add` the new value and remove the old one.
2. Supabase → Auth → Users: sign out affected users. Check `audit_logs` and the moderation queue.
3. Record what happened and the fix in `docs/THREAT-MODEL.md` (risk register).

## Routine (monthly)
- `cd apps/web && npm audit` (CI also enforces high/critical on every push).
- Re-run the accessibility scan (axe, WCAG 2.1 AA) on signed-out pages after UI changes.
- `npm outdated`; plan Next.js minor upgrades promptly (security fixes ship there).
- Check `audit_logs` partitions exist for next month (`20260101009700_audit_partition_schedule.sql`).
- Confirm the old Plesk host still forwards to marketitnow.net.
