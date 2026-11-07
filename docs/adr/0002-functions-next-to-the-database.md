# ADR-0002: Run server functions in Dublin, next to the database

**Status:** Accepted and live 2026-11-07 (deploy `30d2b41`; `x-vercel-id` shows `dub1`)

**Context:** A load test (`tests/browser/load.mjs`, 100 requests at 10 concurrent) measured the
homepage at p50 1.0 s / p95 2.5 s. Vercel ran the functions in `iad1` (Washington DC, the
default), but the Supabase database is in AWS eu-west-1 (Ireland; its IPv6 range 2a05:d018::/32).
Every query crossed the Atlantic (~75 ms each way), and a page makes several in a row plus an
auth check. Even `/api/health`, one `limit 1` query, took 130-450 ms.

**Decision:** `"regions": ["dub1"]` in `apps/web/vercel.json`, so functions run in Dublin, a few
milliseconds from the database. Customers (Netherlands, Africa) are also closer to Dublin than
to Washington.

**Consequences (measured live, same load test before → after):**

| | before (iad1) | after (dub1) |
|---|---|---|
| `/api/health` database query | 130-450 ms | 18-54 ms |
| Homepage p50 / p95 | 1024 / 2481 ms | 518 / 891 ms |
| Category page p50 / p95 | 928 / 1438 ms | 507 / 719 ms |
| Homepage requests/s at 10 concurrent | 8.3 | 17.6 |

Rollback: remove the line and redeploy. If Supabase ever moves region, move this with it.
