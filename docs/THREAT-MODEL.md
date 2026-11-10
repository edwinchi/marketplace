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
| **S**poofing: forged or altered Stripe webhook | `/api/stripe/webhook` | `stripe.webhooks.constructEvent` signature check before any write; idempotent on event id | `tests/stripe-webhook.test.ts` (10 contract tests, mutation-checked) |
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
| R8 | ~~Full postcodes are public~~ **Fixed 2026-11-09:** the owner applied `supabase/migrations/20260101009800_locations_hide_postcode.sql`; anon/signed-in reads of `locations.postal_code` now get "permission denied" while city and coordinates stay public. `tests/browser/anon-access.mjs` passes. Posting drops anything that isn't a postcode | medium / medium (GDPR data minimisation) | Done |
| R9 | ~~No rate limit on login or reset~~ **fixed 2026-11-07**: login (normal and admin) 20 / 15 min per IP and 10 / 15 min per account; reset requests 5 / hour per IP and 3 / hour per address. Emails are stored only as a hash. Verified live: attempts 1-10 get "Invalid login credentials", attempt 11 is refused | was medium / high | Done. Residual: an attacker can lock one account's login for 15 minutes (the per-account cap); reset still works |
| R10 | ~~Open redirect~~ **fixed 2026-11-07**: `?next=/\evil.com` and `/<tab>/evil.com` passed the old `startsWith("/")` check in 10 places (login, signup, auth callbacks, saved searches, notifications). Now `lib/safe-path.ts` (tests: `tests/safe-path.test.ts`) | was medium / medium (phishing from a real login link) | Done |
| R11 | ~~No data export~~ **fixed 2026-11-07**: "Download my data" on the profile settings page (`/api/account/data-export`, `lib/data-export.ts`; scoping tested in `tests/data-export.test.ts`, end to end in `tests/browser/data-export.mjs`) | was medium / low | Done |
| R12 | ~~`rate_limit_events` keeps IP addresses indefinitely~~ **fixed 2026-11-07** (owner-approved): rows older than 7 days are deleted by `lib/rate-limit.ts` (each server instance at most once an hour, no cron secret or DB job needed). `tests/rate-limit.test.ts` also fails if any limit uses a window longer than 7 days | was low / low (GDPR storage limitation) | Done |
| R13 | **AI calls behind a button** (added 2026-11-10): Find category on step 1 of posting now makes two small text-model calls and two embedding calls per click, and paid providers are the last fallback. Mitigated: signed-in sellers only, 40 AI searches per hour per seller (then embeddings only), short prompts (300 tokens max). Prompt injection through a typed title can only change which category from the shortlist is suggested: the reply is read as a number and anything else is ignored | low / low (cost) | Done. Watch AI spend after launch |
