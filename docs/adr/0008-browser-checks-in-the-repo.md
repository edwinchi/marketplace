# ADR-0008: Browser, accessibility and security checks live in the repo

**Status:** Accepted (2026-11-07)

**Context:** The regression, accessibility (axe), translation and load checks used for every
deploy lived in a temporary folder and would have been lost.

**Decision:** They're in `apps/web/tests/browser/`, with `playwright-core` 1.64.1 and `axe-core`
4.14.0 as pinned dev dependencies, plus `anon-access.mjs`, which fails if a private table is
readable without signing in. `npm run check:local` before a deploy; `npm run check:live` after one.

**Consequences:** Repeatable checks anyone can run. They aren't in CI yet: that needs a preview
deployment URL and the Supabase keys as CI secrets (a Level 3 credentials change).
