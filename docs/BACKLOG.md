# MarketitNow — engineering backlog

Open work from the 2026-11-06 audit, as epics → user stories → acceptance criteria (master prompt
directive 4). **Owner** items need an account, credentials or a decision only the owner can give;
**Eng** items can be built and verified in the repo. Approval levels: `docs/operating-model/`.

## E1 — One address: marketitnow.net only (Owner, Level 3)
- **US1.1** As a customer typing an old address, I land on marketitnow.net in one hop.
  - AC: `www.marketitnow.net`, `afrodeals.net`, `www.afrodeals.net` each return a single 308 to
    the same path on `https://marketitnow.net` (Vercel → project → Domains → Redirect, 308).
- **US1.2** As the owner, no outdated copy of the site is reachable.
  - AC: `marketplace.apps-pilot.nl` returns 301 → `https://marketitnow.net` (Plesk → Hosting
    Settings → Forwarding); the old sign-in page is gone.
- **US1.3** AC: Supabase → Auth → URL Configuration → Site URL is `https://marketitnow.net`.

## E2 — Know when it breaks (Owner + Eng, Level 1)
- **US2.1** As the owner, I'm alerted within 5 minutes of an outage.
  - AC: uptime monitor on `/api/health`, alert after 2 failures; test alert received.
- **US2.2** As an engineer, I see production exceptions with stack traces.
  - AC: Sentry (`SENTRY_DSN`) captures server and client errors with the deploy commit; a thrown
    test error appears in Sentry.

## E3 — Abuse and injection hardening (Owner + Eng)
- **US3.1** As a buyer, I'm not flooded with bot accounts and fake listings.
  - AC: `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set; signup without a token is
    refused (test with the Turnstile "always fails" test key on a preview).
- **US3.2** (Eng, Level 3 security policy) Nonce-based CSP removing `script-src 'unsafe-inline'`.
  - AC: no CSP violations in the browser regression suite on home, listing, signup (Turnstile),
    login, checkout redirect.

## E4 — Faster pages (Eng, Level 0)
- **US4.1** As a visitor on a phone, the homepage loads quickly.
  - AC: homepage HTML ≤ 250 KB (326 KB on 2026-11-06); measure the RSC payload by component, move
    category trees out of client props, trim image `srcset` widths.
- **US4.2** Session checks without a network round trip per request.
  - AC: `proxy.ts` uses `auth.getClaims()` with asymmetric JWT signing keys (Supabase setting,
    Level 2 auth change); login, logout and expiry tested.

## E5 — Safe development (Owner + Eng, Level 2)
- **US5.1** As an engineer, local testing can't touch real customer data.
  - AC: a separate Supabase dev project; `.env.local` points at it; migrations applied to both.

## E6 — Every word translated (Eng, Level 0)
- **US6.1** AC: hardcoded English strings come from `messages/*.json` in all 5 locales;
  `tests/client-messages.test.ts` still passes.
  - Done 2026-11-06: every `aria-label` is translated (`tests/no-hardcoded-labels.test.ts`
    enforces it).
  - Left: the signed-in preference pages (`my-account/preferences/*`, `invoices`,
    `saved-searches`) still render their visible text in English only; the switch labels match
    that text, so translate both together.

## E7 — Emails reach users (Owner, Level 3)
- **US7.1** As a user, I get saved-search alerts and unread-message reminders.
  - AC: `marketitnow.net` verified in Resend (SPF/DKIM); `RESEND_FROM_EMAIL` and `CRON_SECRET` set;
    the 08:00 cron run sends a test digest to the owner.

## E8 — Accessible everywhere (Eng, Level 0)
- **US8.1** AC: the axe WCAG 2.1 AA scan covers signed-in pages (my-account, post-an-ad, messages)
  with a test account and reports 0 serious/critical issues; the scan runs in CI against the
  preview deployment.
  - Done 2026-11-06 except CI: 24 signed-in pages × phone/desktop → 0 serious/critical, as
    `claude-agent-test@marketitnow.net` (created 2026-11-06 with owner sign-off; password
    discarded, sign-in only via an admin one-time link through `/auth/confirm`). Fixed on the
    way: unlabelled switches (`ProfileToggle`/`SavedSearchToggle` now require `label`, `role=switch`),
    the read-only email field, the account sidebar's active colour.
  - Left: run it in CI (needs the service key as a CI secret: Level 3).

## E9 — Compliance (Owner, Level 3)
- **US9.1** GDPR: records of processing, DPAs with Supabase/Stripe/Resend/OpenRouter/Vercel, the
  privacy policy reviewed by counsel; the data-deletion page completes a deletion end to end.
- **US9.2** PCI-DSS: stays SAQ A (Stripe-hosted checkout only, no card data touches our servers).
