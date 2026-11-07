# Master prompt status — MarketitNow

Status of every directive in [master-coding-application-prompt.md](master-coding-application-prompt.md)
for the 2026-11-06 cycle, with the evidence behind each mark. ✅ done (verified) · 🟡 partly done:
what's left is listed, usually an owner account or decision · ⬜ not started.

Open items are tracked in [`docs/BACKLOG.md`](../BACKLOG.md) (E1–E9) and
[`docs/THREAT-MODEL.md`](../THREAT-MODEL.md) (R1–R11). The item-by-item check against all three
operating documents (including [`agent-governance.yaml`](agent-governance.yaml)) is in
[`governance-audit-2026-11-07.md`](governance-audit-2026-11-07.md).

## The 20 directives

| # | Directive | Status | Evidence (2026-11-06) | Left to do |
|---|---|---|---|---|
| 1 | Recursive self-improvement | ✅ | Each fix re-measured and iterated: logo trace (5 passes until the halo/notch artefacts were gone), npm resolver crash traced to its root, accessibility 3 → 1 → 0 rule types | Continues every cycle |
| 2 | Complete contextual understanding | ✅ | Live site traced to `C:\Projects\afrodeals-ai\apps\web`, Vercel project `afrodeals.net`, DB `nodzsl…`; stale facts in `AGENTS.md` corrected | — |
| 3 | Operate as a full engineering org | ✅ | Product (backlog), architecture, UX (header, logos), engineering, QA (tests, browser suites), DevOps (CI, deploys), security (threat model), writing (docs) | — |
| 4 | Ideas → production-ready specs | ✅ | `docs/BACKLOG.md`: 9 epics, user stories, acceptance criteria; data model + API contracts in `docs/ARCHITECTURE.md` §5–6 | — |
| 5 | Living system architecture | ✅ | `docs/ARCHITECTURE.md`: context/service map, request + payment sequence diagrams, deploy pipeline, ERD, code map, dependencies | Update with each change |
| 6 | Design before implementation | ✅ | Each change diagnosed first: contrast maths before colours, namespace map before trimming translations, proxy query analysis before caching | — |
| 7 | Production-grade code only | ✅ | Typed, linted, commented with the why; 62/62 tests; `next build` clean | — |
| 8 | Secure by default | 🟡 | Next 16.4.5 (2 critical RCEs closed), image proxy own-host only, CSP without `unsafe-eval`, Permissions-Policy, canonical links (reset-link poisoning closed) | R1 Turnstile keys (owner); R4 nonce CSP (E3) |
| 9 | Detect and eliminate technical debt | ✅ | Removed: shadcn CLI dependency, root `.vercel` stale link, hardcoded colours (124 uses → tokens), stale docs; remaining debt listed in the backlog (E4, E6) | Backlog items |
| 10 | Comprehensive automated testing | 🟡 | Unit + contract (72: `site-url`, `client-messages`, Stripe webhook contract suite mutation-checked), browser regression (20 checks), accessibility (axe, 26 page views), translation checks; CI runs types/lint/tests/audit | Load tests; e2e in CI on previews (E8) |
| 11 | Continuously validate quality | ✅ | Every change verified on a production build, then on the live site after deploy (`/api/health` commit check) | — |
| 12 | Autonomous debugging | ✅ | Root causes found and fixed: header overlap (absolute centring), npm crash (Vite 8 optional peers), active-link contrast (class tie) | — |
| 13 | Optimize performance | ✅ | Compressed transfer −12% home, −23% login, −19% /app (per-route translations); one auth + profile lookup per render instead of 3–4; homepage queries in parallel; settings query off most requests; `logo.png` 557 → 37 KB | E4: `getClaims()` |
| 14 | Privacy and compliance | 🟡 | GDPR: cookie consent, data-deletion page, links only to marketitnow.net; PCI: Stripe-hosted checkout (SAQ A); HIPAA not applicable (no health data) | E9: processing records, DPAs, counsel review; SOC2/ISO 27001 are certifications, not code |
| 15 | Protect against emerging threats | ✅ | `docs/THREAT-MODEL.md` STRIDE review + risk register R1–R7; RLS audit every 12h | Owner actions R1, R2 |
| 16 | Complete observability | 🟡 | `/api/health` (DB + commit), runbook with incident procedures, Vercel logs | E2: uptime alerts, Sentry, dashboards (accounts needed) |
| 17 | Automate deployment and operations | 🟡 | CI workflow, git-triggered Vercel deploys, rollback documented (`vercel rollback`), deploy verification via `/api/health` | Disaster-recovery restore test of Supabase backups; E5 dev database |
| 18 | Evaluate business value | 🟡 | Value per change below (trust, conversion, reach) | Product analytics (PostHog) to measure it |
| 19 | Learn from every cycle | ✅ | Lessons recorded in `AGENTS.md` (§13, brand assets, links) and agent memory | — |
| 20 | Operate until production-ready | 🟡 | Code side ready and verified; [readiness gaps](#completion-criteria) need owner accounts/decisions | E1–E3, E7, E9 |

## Master directive: the 13 steps, this cycle

| Step | Status | How |
|---|---|---|
| 1 Analyze | ✅ | Audit of code, dependencies, live headers, domains, hosting |
| 2 Design | ✅ | Each fix scoped before coding (see #6) |
| 3 Threat model | ✅ | `docs/THREAT-MODEL.md` |
| 4 Architect | ✅ | `docs/ARCHITECTURE.md` |
| 5 Implement | ✅ | 7 commits on `fix/next-rce-hardening` |
| 6 Test | ✅ | Unit, browser regression, accessibility, translation, live checks |
| 7 Validate | ✅ | Production build locally, then live |
| 8 Optimize | ✅ | Page weight, query count, image sizes |
| 9 Document | ✅ | Architecture, runbook, threat model, backlog, this page, `AGENTS.md` |
| 10 Secure | 🟡 | See #8 (R1 needs the owner) |
| 11 Deploy | ✅ | All of cycle 1 live and verified on marketitnow.net (commit `c9d0518`): regression 20/20, accessibility 0 serious/critical, translations clean. Cycle 2 (translations, webhook tests) waits for sign-off |
| 12 Monitor | 🟡 | Health endpoint + manual checks; alerting needs E2 |
| 13 Improve | ✅ | Backlog prioritised for the next cycle |

## Completion criteria

| Criterion | Status | Notes |
|---|---|---|
| Functional correctness | ✅ | Regression suite on live and local builds |
| Security validation | 🟡 | 0 known vulnerabilities, threat model; open R1–R2 |
| Performance validation | ✅ | Measured before/after |
| Scalability validation | 🟡 | Serverless + managed Postgres scale by design; no load test yet |
| Accessibility validation | ✅ | WCAG 2.1 AA: 0 serious/critical on 13 public + 24 signed-in pages × 2 viewports (2026-11-06) |
| Documentation completion | ✅ | See step 9 |
| Test coverage completion | 🟡 | See #10 |
| Deployment readiness | ✅ | CI + verified deploy + rollback |
| Operational readiness | 🟡 | Runbook done; alerting not yet |
| Compliance verification | 🟡 | See #14 |

## Business value of this cycle

| Change | Value |
|---|---|
| Critical RCEs closed, image proxy locked | Prevents a server takeover that would expose every user's data: existential trust risk removed |
| Links always marketitnow.net | One brand, no customer sent to an old domain; phishing-style reset links impossible |
| Sharp logos, fixed phone header | First impression and brand credibility, on the screen most visitors use |
| Accessibility AA on public pages | Usable by more buyers (low vision, screen readers); EU Accessibility Act exposure reduced |
| Lighter pages | Faster first load on mobile networks, the stated core market (AGENTS.md §1) |
| CI + runbook + health | Fewer bad deploys reach customers; faster recovery when they do |
