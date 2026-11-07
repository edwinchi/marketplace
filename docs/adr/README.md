# Architecture decision records

One short record per decision that shapes the system: the context, what was decided, and what
it costs. New decisions get the next number. A reversed decision is marked **Superseded by
ADR-n** and kept, never deleted.

| # | Decision | Status |
|---|---|---|
| [0001](0001-hosting-vercel-supabase-one-domain.md) | Vercel + Supabase, one public domain: marketitnow.net | Accepted |
| [0002](0002-functions-next-to-the-database.md) | Run server functions in Dublin (`dub1`), next to the database | Accepted, needs a deploy |
| [0003](0003-security-headers-and-csp.md) | Security headers and a CSP without `unsafe-eval`; nonce CSP later | Accepted |
| [0004](0004-translations-per-route.md) | Send translations per route, not the whole file | Accepted |
| [0005](0005-free-ai-period-is-time-based.md) | The free AI period switches itself off by date | Accepted |
| [0006](0006-category-backgrounds.md) | Category backgrounds: CC0 photos, blended, content-hashed names | Accepted |
| [0007](0007-redirect-targets-through-one-guard.md) | Every redirect target goes through one guard | Accepted |
| [0008](0008-browser-checks-in-the-repo.md) | Browser, accessibility and security checks live in the repo | Accepted |
