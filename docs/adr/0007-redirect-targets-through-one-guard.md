# ADR-0007: Every redirect target goes through one guard

**Status:** Accepted (2026-11-07)

**Context:** Ten places validated `?next=` / returnTo values with
`startsWith("/") && !startsWith("//")`. Browsers turn `/\evil.com` and `/<tab>/evil.com` into a
different site, so the check allowed an open redirect (risk R10).

**Decision:** `lib/safe-path.ts` `safeRelativePath()` is the only check: a leading `/`, no `/` or
`\` second, no control characters. `tests/safe-path.test.ts` covers the bypasses.

**Consequences:** Any new redirect or user-supplied link must use it. Grep for
`startsWith("//")` in review: it should only appear in `lib/safe-path.ts`.
