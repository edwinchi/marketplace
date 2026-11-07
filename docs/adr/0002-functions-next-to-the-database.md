# ADR-0002: Run server functions in Dublin, next to the database

**Status:** Accepted 2026-11-07 (in `apps/web/vercel.json`); takes effect with the next deploy

**Context:** A load test (`tests/browser/load.mjs`, 100 requests at 10 concurrent) measured the
homepage at p50 1.0 s / p95 2.5 s. Vercel ran the functions in `iad1` (Washington DC, the
default), but the Supabase database is in AWS eu-west-1 (Ireland; its IPv6 range 2a05:d018::/32).
Every query crossed the Atlantic (~75 ms each way), and a page makes several in a row plus an
auth check. Even `/api/health`, one `limit 1` query, took 130-450 ms.

**Decision:** `"regions": ["dub1"]` in `apps/web/vercel.json`, so functions run in Dublin, a few
milliseconds from the database. Customers (Netherlands, Africa) are also closer to Dublin than
to Washington.

**Consequences:** Expected: database round trips drop from ~75-150 ms to a few ms, which should
cut server time on dynamic pages by several hundred ms. Verify after deploy: `x-vercel-id` shows
`dub1`, `/api/health` `ms` falls, rerun the load test. Rollback: remove the line and redeploy.
If Supabase ever moves region, move this with it.
