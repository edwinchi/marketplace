# ADR-0006: Category backgrounds: CC0 photos, blended, content-hashed names

**Status:** Accepted (2026-11-07)

**Context:** Category heroes were stretched low-resolution collages, and a 408×600 banner photo was
shown at 1376×224.

**Decision:** Each top-level category gets 9-11 high-resolution CC0 / public-domain photos from
Openverse, checked by eye (no brand logos, characters, real people or archive scans), blended
into one 2880×960 image by `scripts/gen-category-heroes.mjs` and shown whole by
`components/category-hero.tsx`. Provenance: `scripts/category-background-sources.json`. Originals
and the sourcing scripts stay in `ops/hero-photos/` (git-ignored). File names carry a hash of the
image; the script writes `lib/category-backgrounds.json`.

**Consequences:** Sharp images at about 40-120 KB as AVIF. A rebuilt image always gets a new URL, so
no cache serves the old one. Rebuilding needs the originals folder.
