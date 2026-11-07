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

## Free AI period (2026-11-07 → 2027-05-07)
Owner decision: every signed-in account gets every AI feature free and unlimited for six months
(`apps/web/lib/ai-free-period.ts`). Photo autofill, description polish, listing translation,
seller insights and Listen are included. The new-listing broadcast to all users is not.
- **It ends by itself** at 00:00 Amsterdam time on 7 May 2027. After that, the 5 free uses,
  Seller Pro and top-ups apply again. The countdown, banners and the "nothing to buy" note
  disappear, and checkout works again. Uses made during the free period don't count against
  anyone's 5 free uses.
- **End it early or extend it:** set `AI_FREE_PERIOD_ENDS_AT` (ISO date-time, e.g.
  `2027-08-01T00:00:00+02:00`) in Vercel → Environment Variables (Production), then redeploy.
- **Cost guard:** 40 photo autofills per account per day (`AI_FREE_PERIOD_PHOTO_DAILY_LIMIT`).
  Text features keep their 20/hour limits. Free models are tried first; the paid fallback (OpenAI,
  then Claude via OpenRouter) only runs when they're all down. Watch the OpenAI and OpenRouter
  spend monthly while it runs.
- **Two weeks before the end:** tell users that paid plans return (email or in-app). This isn't
  automated.

## Database migrations (no CLI access on this machine)
There's no database password or Supabase access token stored here (AGENTS.md). Apply a new file
in `supabase/migrations/` by pasting it into **Supabase → SQL editor** and running it, then run
`npm run check:security` in `apps/web` to confirm. Pending as of 2026-11-07:
`20260101009800_locations_hide_postcode.sql` (risk R8).

## Audit log
Admin actions (settings changes, moderation, AI-use grants, backfills, admin sign-ins) are written
to `audit_logs` by `apps/web/lib/audit.ts`. The last 15 are on the admin dashboard
(**Recent admin actions**). The table is partitioned by month: check that next month's partition
exists (monthly routine above). If it's missing, writes go to `audit_logs_default` and still work.

## Intro video
On every full page load (arriving, refreshing, changing language), `components/intro-video.tsx` pops up the intro video in the
page's language, centred and looping until closed, with the site blurred behind it (not on
`/admin`). It plays with sound; where the browser refuses sound before any interaction (most
first-time visitors), it plays muted and the sound comes on at the first tap, click or key press. The videos are made from the owner's originals in the repo root
(`<Language> Intro 10 seconds.mp4`: English, Dutch, French, Arabic; other languages get English) by
`apps/web/scripts/gen-intro-videos.mjs`, which writes `public/intro/` and `lib/intro-videos.json`.
To replace a video: put the new original in the repo root under the same name and rerun the script
(it needs a path to ffmpeg). To add a language: add it to `VIDEOS` in the script. To turn the
intro off: remove `<IntroVideo />` from `app/layout.tsx`. Check: `node tests/browser/intro-video.mjs`.
