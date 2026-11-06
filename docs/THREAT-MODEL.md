# MarketitNow — threat model

STRIDE review of the live system (https://marketitnow.net), master prompt directives 8 and 15.
Update it whenever a feature adds a new trust boundary, data store or money flow. Last reviewed
2026-11-06.

**Assets:** user accounts and sessions; personal data (names, emails, phone numbers, addresses,
messages); listings and photos; payments and payouts (Stripe Connect); the platform's Stripe,
Supabase, OpenRouter and Resend keys; the brand/domain.

**Actors:** anonymous visitors and bots; registered buyers and sellers (some malicious: scammers,
spammers); admins; third parties calling webhooks; anyone who obtains a leaked key.

## Controls in place

| Threat (STRIDE) | Where | Control | Verified |
|---|---|---|---|
| **S**poofing: forged Stripe webhook | `/api/stripe/webhook` | `stripe.webhooks.constructEvent` signature check before any write | code review 2026-11-06 |
| **S**poofing: forged cron call | `/api/cron/send-emails` | `Authorization: Bearer $CRON_SECRET`, inert when unset | code review |
| **S**poofing: password-reset link poisoning via Host header | `lib/site-url.ts` | production links are always `https://marketitnow.net` | `tests/site-url.test.ts` |
| **T**ampering: users editing others' rows | Postgres | RLS on every user-data table; privileged writes via service role only | `ops/security-audit.mjs` every 12h |
| **T**ampering: self-service "paid" fields (bump, charges_enabled) | Postgres | column-level `revoke update` from `authenticated` | AGENTS.md §6/§10 |
| **R**epudiation | Postgres | partitioned `audit_logs`, partitions scheduled (`…009700`) | migration |
| **I**nformation disclosure: drafts / deleted listings | RLS | status/ownership-gated read policies (`…007200` fix) | security audit |
| **I**nformation disclosure: XSS / injected script | headers | CSP (no `unsafe-eval` in production), `nosniff`, `SAMEORIGIN`, Permissions-Policy | live headers 2026-11-06 |
| **I**nformation disclosure: secrets in git | repo | `.env*`, `ops/*.local.json` git-ignored, never committed (checked) | git log 2026-11-06 |
| **D**enial of service: Next.js Server Action DoS, image optimizer abuse | runtime | Next 16.4.5; image optimizer limited to this project's Supabase host | live: foreign host → 400 |
| **E**levation of privilege: unauthenticated RCE (GHSA-2464, GHSA-673q) | runtime | Next 16.4.5 | deployed 2026-11-06 |
| **E**levation of privilege: vulnerable dependency | supply chain | `npm audit` 0; CI fails on high/critical | CI |

## Open risks (risk register)

| # | Risk | Likelihood / impact | Mitigation / owner action |
|---|---|---|---|
| R1 | **Bot protection is off**: `TURNSTILE_SECRET_KEY` is not set in production, so signup and posting accept bots (fails open by design) | high / medium (spam, fake listings, scam accounts) | Owner: create a free Turnstile widget, set `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel |
| R2 | Retired Plesk host still serves an outdated build with a working sign-in against the production database | medium / high (old code paths, phishing look-alike) | Owner: Plesk → hosting type Forwarding → https://marketitnow.net (301) |
| R3 | No error tracking or alerting: failures only visible in Vercel logs | high / medium (slow detection) | Uptime monitor on `/api/health`; Sentry (needs an account) |
| R4 | `script-src 'unsafe-inline'` still allowed | low / medium | nonce-based CSP (backlog E3) |
| R5 | Daily emails off: `CRON_SECRET` and `RESEND_FROM_EMAIL` unset | n/a (feature off) | Owner: verify a sending domain in Resend; set both |
| R6 | Local dev uses the production database | medium / high (test data or Stripe test ids in real rows, AGENTS.md §6) | separate Supabase dev project (backlog E5) |
| R7 | No escrow: buyer recourse is reports + Safety Center only | product decision (Terms §6) | revisit deliberately, not by drift (AGENTS.md §6) |
