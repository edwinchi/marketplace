# Governance audit: MarketitNow against the three operating documents

**Date:** 2026-11-07. **Commit audited:** `9ba23a4` (live), plus the fixes listed at the end.
**Documents:** `Agent-Governance.yaml`, the Concise Master System Prompt, and the Master Coding
Application Prompt (`docs/operating-model/`).

**How it was checked:** commands and probes run against the code, the live site and the production
database (read-only). Each line gives the evidence. ✅ met · 🟡 partly met (what's missing is
named) · ❌ not met · ➖ not applicable. **Fixed today** marks gaps closed during this audit.

The three documents overlap heavily, so items are grouped by area and each row names the
documents it comes from: **Y** = governance YAML, **C** = concise prompt, **M** = master prompt.

## 1. Security (Y security, Y TASK-0001 threat model, C directive 4, M 8 & 15)

| Item | Status | Evidence |
|---|---|---|
| Threat modelling (Y, C4, M15) | ✅ | `docs/THREAT-MODEL.md`: STRIDE review and risk register R1-R11 (R8-R11 added today) |
| Least privilege (Y) | ✅ | The service-role key is used only server-side: no client component (`"use client"`) imports `lib/supabase/service`. Anonymous probe: 50 tables, the 20 readable ones are all public catalogue data (`tests/browser/anon-access.mjs`) |
| Encryption in transit (Y) | ✅ | HTTPS only; `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (live header) |
| Encryption at rest (Y) | ✅ | Supabase (AES-256 on disk) and Vercel; no data stored elsewhere |
| Secret management (Y, M8) | ✅ | Secrets live only in Vercel env vars and git-ignored `.env.local`. `git grep` for Stripe, Supabase, Resend, GitHub and JWT secrets: none in tracked files (one documentation placeholder) and none in `.env` history |
| Audit logging (Y, TASK mitigation) | 🟡 | Supabase logs every sign-in natively, but the app never writes to its own `audit_logs` table: admin actions (grant AI uses, site settings, moderation) leave no trail → proposed (Level 2) |
| Dependency scanning (Y) | ✅ **+ fixed today** | `npm audit`: 0 vulnerabilities (CI enforces high/critical). **Added** Dependabot (`.github/dependabot.yml`) |
| Vulnerability scanning / static analysis (Y quality, Y security) | ✅ **fixed today** | **Added** CodeQL `security-extended` (`.github/workflows/codeql.yml`), on every PR, on main, and weekly |
| OWASP Top 10 / ASVS (Y) | 🟡 | A01 access control: RLS probe passes. A03 injection: parameterised Supabase queries only. A05 misconfiguration: security headers set; CSP still has `'unsafe-inline'` (R4). A07 authentication: rate limit, Turnstile and password policy on signup; **login and reset not rate limited (R9, proposed)**. **Unvalidated redirects: open redirect in 10 places, fixed today (R10)** |
| Zero Trust (Y, M8) | 🟡 | Every request is re-authenticated (`auth.getUser()`), and RLS is enforced in the database, not only the app. No device or network trust is assumed. Missing: an MFA requirement for admin accounts |
| NIST CSF (Y) | 🟡 | Identify ✅ (architecture, risk register) · Protect ✅ mostly · Detect ❌ (no alerting, R3) · Respond 🟡 (runbook) · Recover 🟡 (rollback yes; database restore never tested) |
| Credential stuffing, brute force (TASK) | 🟡 | Signup: 5/hour per IP plus Turnstile (Turnstile fails open without keys, R1). Login: no app limit (R9). Calls straight to Supabase's auth API bypass the app's checks; Supabase's own per-IP limits apply → enable Supabase Auth CAPTCHA (owner, dashboard) |
| Account enumeration (TASK) | ✅ | Reset always answers "sent"; signup with an existing email returns the same "check your email"; login says "Invalid login credentials" |
| Session hijacking (TASK) | 🟡 | HTTPS + HSTS, SameSite=Lax cookies, CSP. Supabase SSR cookies are readable by page scripts (library design), so an XSS would expose them; `'unsafe-inline'` raises that risk (R4) |
| CSRF (TASK) | ✅ | Mutations are Server Actions (Next checks Origin against Host). The only cookie-free POST endpoints are the Stripe webhook (signature verified, 10 contract tests) and an anonymous visit counter |
| MFA support (TASK) | ✅ | `components/two-factor-setup.tsx` (TOTP, Supabase MFA) on the profile page |
| Email abuse (TASK) | 🟡 | Signup is rate limited; reset requests are not, and can use up the project's email quota (R9) |
| Emerging threats, abuse (M15) | 🟡 | AI cost abuse capped (40/day photo, 20/hour text); content moderation and reports exist; bot defence waits on Turnstile keys (R1) |

## 2. Testing and quality (Y testing & quality, C step 5 & directive 7, M 10 & 11)

| Item | Status | Evidence |
|---|---|---|
| Unit tests (Y, C, M) | ✅ | 84 vitest tests in 16 files (`npm test`), in CI |
| Contract tests (Y, M) | ✅ | Stripe webhook: 10 tests with signed fixtures, mutation-checked (`tests/stripe-webhook.test.ts`) |
| Integration tests (Y, C) | 🟡 | The browser suites exercise the full stack (Next + Supabase) on a production build; there are no isolated database integration tests (needs the dev database, E5) |
| End-to-end tests (Y, C, M) | ✅ **fixed today** | Regression (20 checks) and translations: **moved from a temporary folder into the repo** (`tests/browser/`, `npm run check:local` / `check:live`) |
| Performance tests (Y, C, M) | ✅ **fixed today** | `tests/browser/load.mjs`. Live result: no errors at 10 concurrent, but home p50 1.0 s / p95 2.5 s → root cause found (§4) |
| Security tests (Y, C, M) | ✅ **fixed today** | `tests/browser/anon-access.mjs` (RLS regression, mutation-checked: fails when a table leaks); `tests/safe-path.test.ts` (redirect bypasses); CodeQL |
| Accessibility tests (M) | ✅ | axe WCAG 2.1 AA: 0 serious/critical across 26 public and 48 signed-in page views (live) |
| Regression tests (Y, C, M) | ✅ | As above, run after every deploy this cycle |
| Code reviews (Y) | 🟡 | One developer plus AI; no second-person review. CodeQL and CI are the automated reviewers. Branch protection on `main` would make the gate mandatory (owner, GitHub settings) |
| Linting, static analysis (Y) | ✅ | ESLint plus `tsc` in CI; CodeQL added |
| "Never complete because it compiles" (C, M) | ✅ | Every change this cycle was verified on a production build and again live |

## 3. Architecture and design (Y architecture, C steps 3 & directive 3, M 5 & 6)

| Review (Y mandatory) | Status | Evidence |
|---|---|---|
| Scalability | 🟡 | Serverless functions plus managed Postgres. Load test: 8-25 req/s per page at 10 concurrent, 0 errors. Not tested beyond that (fine for current traffic: 19 listings, 49 accounts) |
| Reliability | 🟡 | Health endpoint; no uptime alerting (R3); no redundancy beyond the providers' own |
| Maintainability | ✅ | Typed, linted, commented with the why; shared helpers (`safe-path`, `site-url`, `client-messages`) |
| Observability | 🟡 | See §5 |
| Security | ✅ | §1 |
| Compliance | 🟡 | §6 |
| Cost efficiency | ✅ | Free AI models first, paid fallback capped; AVIF images (hero 265 → 21-79 KB); serverless, no idle servers |
| Living architecture docs (M5, C9) | ✅ | `docs/ARCHITECTURE.md` (context, sequences, deploy, ERD, API, code map; regions added today) |
| Decision records (Y documentation.adr_records, C9) | ✅ **fixed today** | `docs/adr/` (eight records) |
| Design before implementation (Y principle, C3, M6) | ✅ | Each change this cycle was diagnosed first (e.g. the region root cause was measured before any change) |

## 4. Performance (Y performance, C directive 9, M 13)

| Item | Status | Evidence |
|---|---|---|
| Latency measured | ✅ **root cause found today** | Functions ran in `iad1` (Washington DC); the database is in AWS eu-west-1 (Ireland, IPv6 range 2a05:d018::/32). Every query crossed the Atlantic: `/api/health` (one query) 130-450 ms, home p50 1.0 s. **Fixed in code:** `vercel.json` `"regions": ["dub1"]` (ADR-0002); **takes effect after the next deploy** |
| Throughput | ✅ | 8-25 req/s per page at concurrency 10, 0 errors |
| Memory / CPU | ➖ / 🟡 | Serverless: Vercel meters it per invocation; no custom metrics |
| Query optimisation | 🟡 | Parallel queries on the homepage; React `cache()` dedupe (one auth lookup per render instead of 3-4); indexes from migrations. No slow-query review (needs Supabase dashboard access) |
| Page weight | ✅ | Measured before/after every change (home 320 KB HTML; translations per route) |

## 5. Observability and operations (Y observability & deployment, C directive 8, M 16 & 17)

| Item | Status | Evidence |
|---|---|---|
| Health checks | ✅ | `/api/health`: database status, commit, latency |
| Structured logging | ❌ | 45 ad-hoc `console.error`/`console.log` calls; readable in Vercel logs, but not structured JSON with request ids |
| Metrics, tracing | ❌ | No Vercel Analytics, Speed Insights, Sentry or OpenTelemetry |
| Dashboards | 🟡 | Admin dashboard (`/admin`): visitors, listings, users, AI status, health history. No infrastructure dashboard |
| Alerting | ❌ | Nothing pages anyone on an outage or error spike (R3) |
| CI/CD (M17) | ✅ | GitHub Actions (types, lint, tests, audit) and CodeQL; Vercel deploys `main` |
| Rollback (Y, C done-criteria, M17) | ✅ | `vercel rollback` / promote previous; every deploy verified by commit on `/api/health` |
| Disaster recovery (M17) | 🟡 | Supabase daily backups (plan-dependent); restoring one has never been tested |
| Infrastructure as code (M17) | 🟡 | `vercel.json` (regions, cron) and SQL migrations in the repo; Vercel/Supabase project settings live in dashboards |
| Runbooks (Y, C9, M16) | ✅ | `docs/RUNBOOK.md`: quick checks, incidents, monthly routine, free AI period |
| 99.9% uptime (TASK non-functional) | 🟡 | Vercel and Supabase both have uptime SLAs on paid plans; we don't measure ours (no monitor) |

## 6. Privacy and compliance (Y compliance, C directive 10, M 14)

| Framework | Status | Evidence / gap |
|---|---|---|
| GDPR | 🟡 | Cookie consent; privacy policy; self-service account deletion (`/data-deletion`). Gaps: **no data export** (Art. 15/20, R11, proposed); **full postcodes public** (data minimisation, R8, proposed); records of processing and DPAs (E9, owner) |
| CCPA | 🟡 | Covered in substance by the GDPR controls (access, deletion, no sale of data); the privacy policy doesn't mention CCPA or California by name. Only applies if MarketitNow reaches CCPA thresholds |
| SOC 2 / ISO 27001 | ➖ | Certifications of an organisation, not code. The controls above (access control, change management through CI, encryption, logging) are the technical groundwork |
| PCI-DSS | ✅ | Stripe-hosted checkout only (SAQ A); no card data touches our servers |
| HIPAA | ➖ | No health data |
| Accessibility (EU Accessibility Act) | ✅ | WCAG 2.1 AA, 0 serious/critical |

## 7. Product and requirements (Y requirements, C steps 1-2 & directive 2, M 4 & 18)

| Item | Status | Evidence |
|---|---|---|
| Business goals, personas, constraints, dependencies, risks | ✅ | `AGENTS.md` §1 (vision, markets), `docs/BACKLOG.md`, `docs/THREAT-MODEL.md`, `docs/MARKTPLAATS-LEARNINGS.md` |
| Epics, user stories, acceptance criteria | ✅ | `docs/BACKLOG.md` E1-E9 (+E4b) |
| Business value per change (M18) | 🟡 | Written per cycle (`master-directive-status.md`); not measured (no product analytics) |

## 8. TASK-0001 "User Registration System", checked against the app

| Requirement / criterion | Status | Evidence |
|---|---|---|
| User signup | ✅ | `app/signup` (email + Google) |
| Email verification | ✅ | Live auth settings: `mailer_autoconfirm: false`, so signup requires confirming the email |
| Password reset | ✅ | `app/forgot-password` → email → `app/reset-password`; same password rules |
| User can log in | ✅ | `app/login`; signed-in suite logs in on every run |
| Password policy enforced | 🟡 | App: 8+ characters, a digit and a special character, on signup and reset (`lib/password-rules.ts`). The same minimum isn't confirmed in Supabase's own settings, so a direct API signup could use a weaker password → owner: Supabase → Auth → password requirements |
| GDPR compliant | 🟡 | §6 |
| OWASP compliant | 🟡 | §1: open redirect fixed today; login/reset rate limit pending (R9) |
| 99.9% uptime | 🟡 | §5 |
| Mitigations: rate limiting / MFA / CSRF / audit logging | 🟡 / ✅ / ✅ / 🟡 | §1 |
| Monitoring: signup, verification, login-success rates; auth and email failure alerts | ❌ | Not instrumented; Supabase auth logs hold the raw events |
| **ready_for_deployment** | 🟡 | Works in production today. Remaining blockers are the Level 2/3 items below |

## 9. Approval framework (Y, C) and lifecycle (Y, C, M)

| Item | Status | Evidence |
|---|---|---|
| Level 0 done alone | ✅ | Today: redirect fix, tests, docs, ADRs |
| Level 1 done and reported | ✅ | Today: `playwright-core` and `axe-core` dev dependencies, Dependabot, CodeQL, the Vercel region (all reported here) |
| Level 2 stopped for approval | ✅ | Login/reset rate limits, postcode minimisation, admin audit logging: proposed, not built |
| Level 3 explicit sign-off | ✅ | Production deploys only on owner instruction (the push rule covers one command); credentials and compliance items handed to the owner |
| Lifecycle: understand → … → improve | ✅ | This audit is one full loop: measured, found root causes, fixed, tested, documented, waiting for deploy approval |

## Fixed today (Level 0 and 1)

1. **Open redirect** in 10 places → `lib/safe-path.ts` + tests (R10, ADR-0007).
2. **Slow pages, root cause:** functions moved to `dub1` next to the database (ADR-0002); needs a deploy.
3. **Browser, accessibility, translation, load and security checks** moved into the repo with pinned dependencies (ADR-0008); new anonymous-access security test.
4. **Dependabot and CodeQL** added to CI.
5. **Decision records** (`docs/adr/`), risk register R8-R11, architecture regions.

## Waiting for a decision (Level 2: approval; Level 3: sign-off)

| # | Change | Level | Why |
|---|---|---|---|
| 1 | Deploy today's fixes (redirect fix, Dublin region) | 3 | Production deploy |
| 2 | Rate limits on login (per IP and per email) and password-reset requests | 2 (auth) | Credential stuffing; email quota exhaustion (R9) |
| 3 | Expose only the 4-digit postcode area; clean the bad row | 2 (data) | GDPR minimisation (R8) |
| 4 | Write admin actions to `audit_logs` | 2 | Accountability for privileged actions |
| 5 | "Download my data" (GDPR Art. 15/20) | 3 (compliance) | R11 |
| 6 | Owner settings: Turnstile keys; Supabase Auth CAPTCHA and password requirements; uptime monitor + Sentry; branch protection on `main`; CRON/Resend keys; test a backup restore | 3 (credentials/accounts) | R1, R3, R5; Detect/Recover |
