# AfroDeals — Agent Operating Manual

This file is the single source of truth for any AI agent (Claude Code or otherwise) working in this
repository. Read it before writing code. It reconciles the reference material in [`data/`](data/) —
which contains **two incompatible draft blueprints** gathered from earlier brainstorming — into one
decided architecture. Where this file and a document in `data/` disagree, **this file wins**.

## 1. What we're building

AfroDeals is a mobile-first, AI-first, pan-African classifieds and marketplace platform in the spirit
of Marktplaats.nl, rebuilt for African market realities: multiple currencies, multiple languages,
patchy addressing, mobile-dominant internet access, and low institutional trust in P2P payments —
which trust/escrow infrastructure exists specifically to solve.

Working name: **AfroDeals** (from the repo name). Earlier reference docs in `data/` use "SokoCoin" and
"LokoTrade" — those are the same product concept from an earlier naming pass; treat them as historical,
not as the current brand.

Initial anchor markets (from the existing mock data in [`data/marketplace-dashboard.tsx`](data/marketplace-dashboard.tsx)):
Lagos (Nigeria, NGN), Nairobi (Kenya, KES), Abidjan (Côte d'Ivoire, XOF), Dakar (Senegal, XOF).
Launch languages: English and French. The schema must not hardcode this list — see §4.

### Product pillars
1. **Zero-friction listing** — seller uploads a photo; AI suggests category, title, description,
   condition, and a price range. Manual entry always remains available as a fallback.
2. **Trust-first transactions** — in-app payment requests, escrow hold of funds, and delivery
   confirmation (via smart locker pickup or carrier tracking) before payout to the seller.
3. **Find things near you** — postcode/city and GPS-radius proximity search, not just keyword search.
4. **Built for African mobile networks** — lightweight pages, bottom tab nav on small screens,
   graceful behavior on slow/unreliable connections.
5. **Multi-currency, multi-language by construction** — every market has its own currency and at
   least one local language; nothing in the schema or UI should assume EUR or a fixed language pair.

## 2. Decided technical foundation

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui | SSR for SEO-critical listing/search pages; one language across the stack. |
| Backend | Next.js Route Handlers / Server Actions + Supabase Edge Functions for isolated async work (AI analysis, webhooks) | Avoids running/maintaining a second FastAPI service for a small team. |
| Database | Supabase-managed PostgreSQL 15+, extensions: `pgcrypto`, `citext`, `pg_trgm`, `postgis`, `vector` | One managed Postgres instance gives relational, geospatial, and vector search without separate infra. |
| Auth | Supabase Auth | Row Level Security ties directly to `auth.uid()`; no separate identity service to run. |
| Media storage | Supabase Storage (fallback: Cloudflare R2 if egress cost becomes an issue) | Never store image/file binaries in Postgres. |
| Search | PostgreSQL (`pg_trgm` + attribute indexes) for MVP; outbox-driven projection to Typesense/OpenSearch once listing volume justifies it | Matches the outbox pattern already designed in `09_triggers_outbox_search.sql`. |
| Payments/escrow | Stripe Connect (Standard or Express accounts for sellers), platform holds funds until release trigger | Do not build a custom payment processor. Never store card data — Stripe handles all of it. |
| Fulfillment | Carrier tracking (regional couriers per market) + smart-locker escrow release as an optional upgrade path | See §6 for the state machine. |
| AI listing assist | Vision-capable LLM (Claude or Gemini) called from a server-side route/Edge Function | Model-agnostic integration; do not hardcode to one vendor's SDK in more than one place. |
| Embeddings | Text embeddings for semantic listing search; optional image embeddings for visual similarity, both in `pgvector` with HNSW indexes | Mirrors the design in `data/schema.sql` (formerly `marktplaats-multilingual-schema-v2.sql`). |
| Maps/geocoding | Mapbox (or Google Maps as fallback) for address autocomplete and map UI | PostGIS handles the actual proximity query server-side. |
| Email | Resend | Transactional email (verification, offer notifications, order updates). |
| Monitoring | Sentry (errors) + PostHog (product analytics) | |
| Deployment | Plesk-hosted server at `marketplace.apps-pilot.nl` (Node.js via Phusion Passenger), Supabase (database/auth/storage) | You already have this Plesk hosting provisioned — see §11 for the exact setup. (Vercel was the initial default recommendation before that hosting existed; superseded.) |

This replaces the FastAPI+Docker+React/Vite stack proposed in `data/sokocoin-*.md` and
`data/deployment-guide.md`. Those documents remain useful for their *product* and *schema* ideas
(escrow state machine, AI listing flow, PostGIS geosearch) but their infrastructure prescriptions are
superseded.

## 3. Repository structure

Scaffolding is underway. Current/target layout:

```
afrodeals-ai/
├── agents.md                    # this file
├── data/                        # reference material only — see §9. Never import app code from here.
├── apps/
│   └── web/                     # Next.js app (frontend + server routes)
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── package.json
└── supabase/
    ├── migrations/               # numbered SQL migrations, see §4
    ├── functions/                # Supabase Edge Functions (AI analysis, webhooks, outbox worker) — not yet created
    └── config.toml
```

A single Next.js app is enough at this stage; do not introduce a Turborepo/Nx monorepo tool, and don't
add a `packages/shared` workspace, until there are actually multiple deployable apps (e.g. a native
mobile client) that need to share code — generated Supabase types can live directly in `apps/web/lib`
until then.

## 4. Database architecture — the decided schema strategy

The numbered migrations `data/00_core.sql` through `data/10_complete_rls.sql` (see
`data/MIGRATION_ORDER.md`) are the **canonical schema foundation** — adopt them as-is when scaffolding
`supabase/migrations/`. They already give us the things that matter most at this scale:

- UUID primary keys everywhere, generated with `gen_random_uuid()`.
- **Stable keys, not display strings, as identity.** Categories/attributes/options carry a
  language-neutral `stable_key`; all human-readable text lives in `*_translations` tables keyed by
  `language_code`. This is what lets us add a language (Swahili, Arabic, Portuguese, Hausa, Yoruba,
  Amharic...) later without touching application code or existing data. **Never hardcode
  `name_en`/`name_fr`-style columns** the way `data/marktplaats-multilingual-schema*.sql` does — that
  pattern doesn't scale past two languages and is explicitly what we're rejecting from that draft.
- A generic dynamic attribute system (`attributes` / `category_attributes` / `attribute_options` /
  `listing_attribute_values`) so category-specific fields (vehicle mileage, clothing size, property
  bedrooms) don't turn `listings` into a wide, mostly-empty table. Reference field lists per category
  live in `data/README.md` §11 — useful as a starting checklist when seeding `attributes`.
- Money as integer minor units (`price_minor`, `amount_minor`, `*_minor`) with a `currency_code`
  column — never floating point currency.
- Row Level Security as the default authorization model, driven by `current_profile_id()` resolving
  `auth.uid()`. Client code talks to Postgres through RLS-protected tables; privileged writes
  (payments, moderation decisions, outbox processing, search indexing) go through the Supabase
  **service role** from trusted server code only, never from the browser.
- The outbox pattern (`outbox_events`, `search_documents`) for propagating listing changes to a search
  index without dual-write bugs.
- Monthly range-partitioned `audit_logs` — keep the partition-creation function and schedule it (pg_cron
  or a scheduled Edge Function) rather than letting it lapse.

### Required extensions to the base schema for the Africa/AI feature set

The base migrations don't yet cover geospatial proximity search, AI embeddings, or escrow logistics —
those come from `data/schema.sql` (formerly `marktplaats-multilingual-schema-v2.sql`) and `data/smart-locker-integration.md`,
adapted to match the UUID/RLS/i18n conventions above (not copied as-is, since that draft uses `SERIAL`
ids and skips RLS). When scaffolding `supabase/migrations/`, add these as new numbered migrations after
`10_complete_rls.sql`:

- **`11_geospatial.sql`** — enable `postgis`; add a `geography(Point, 4326)` column to `locations`
  (derived from its existing `latitude`/`longitude`) with a GIST index; write the proximity query as
  `ST_DWithin(location::geography, $point, radius_m)` ordered by `ST_Distance`.
- **`12_vector_search.sql`** — enable `vector`; add `title_embedding vector(1536)` and optionally
  `image_embedding vector(512)` to `listings` (or a `listing_embeddings` side table if you'd rather
  keep `listings` lean), with HNSW cosine indexes.
- **`13_ai_listing_metadata.sql`** — a `listing_ai_metadata` table (raw vision-model response,
  confidence score, detected brand/condition, suggested price range, extracted tags), UUID PK
  referencing `listings.id`, RLS scoped to the listing's seller for reads.
- **`14_fulfillment.sql`** — `escrow_status` state on `orders` (or a dedicated `escrow_events` table)
  plus a `locker_shipments` table matching the state machine in §6, UUID keys, RLS limited to the
  order's buyer/seller, writes restricted to the service role (webhook handlers).

### What NOT to port from the reference drafts

Every `.sql` file in `data/` has now been used — either ported directly into `supabase/migrations/`
or mined for the table/column ideas behind migrations `11`-`14` below. The one deliberate exception:

- **`data/08_nl_geography.sql`** — this is a Netherlands-only CBS provinces/municipalities import
  process. Do not adapt it for Africa: there is no equivalent single authoritative admin-boundary
  registry across the launch markets. The existing generic `locations` table
  (`country_code`, `province`, `municipality`, `city`, `postal_code`, `neighborhood`, `latitude`,
  `longitude`) already works across countries — populate it via Mapbox/Google geocoding on listing
  creation rather than a hardcoded region table. Add a structured admin-regions table per country only
  if/when a specific market needs one (e.g. for shipping-zone logic).
- **`data/07_vehicle_catalog.sql`**'s note to backfill from RDW ETL — RDW is the Dutch vehicle
  registry and has no African equivalent. Keep `vehicle_makes`/`vehicle_models` as a manually curated,
  organically-grown catalog; do not block on finding a "RDW-equivalent" data source.
- Hardcoded `name_en`/`name_fr` columns and `SERIAL` integer ids from
  `data/marktplaats-multilingual-schema*.sql` — superseded by the stable-key + translation-table +
  UUID pattern above.
- The Docker Compose / FastAPI backend scaffold in `data/sokocoin-all-in-one-docker.md` and
  `data/sokocoin-ultimate-docker-spec-v2.md` — superseded by the Next.js + Supabase stack in §2. Local
  dev uses the Supabase CLI (`supabase start`), not a hand-rolled `docker-compose.yml` with a bespoke
  Postgres image.

### Legal note carried forward

Per `data/MIGRATION_ORDER.md`: the taxonomy must be an original, marketplace-oriented structure — not
a copy of any competitor's proprietary category tree (this applies equally to Jiji, Jumia, OLX, or
Marktplaats itself). Use the reference category lists in `data/README.md` and
`data/schema.sql` as inspiration for coverage, not as literal seed data to
copy verbatim.

## 5. Core user journeys the app must support

These are the concrete scenarios engineering work should be validated against (adapted from
`data/agent.md`):

**A. AI-assisted listing creation**
1. Seller uploads one or more photos (mobile camera-first UI).
2. Server route sends the image to the vision model, gets back structured JSON: suggested category,
   title, description, condition, price range, tags.
3. Seller reviews/edits the suggestion and publishes. A `listing_ai_metadata` row records the raw
   model output and confidence for later tuning/audit.
4. Text embedding is generated for the listing title+description and stored for semantic search.

**B. Proximity + semantic search**
1. Buyer searches with a free-text query and/or sets a location + radius.
2. Query combines trigram/keyword matching (or vector similarity once embeddings exist) with a PostGIS
   `ST_DWithin` filter, ranked by a blend of relevance, distance, freshness, and promotion level.

**C. Escrow-protected transaction with smart-locker fulfillment**
See the state machine in §6 — this is the trust backbone of the platform and should be implemented
before general payments launch, not bolted on after.

**D. Professional merchant tier**
Business accounts (`businesses` table, already in the base schema) get branding fields, multiple
active-listing limits per subscription tier, and access to paid promotion (`listing_promotions`:
featured / top / homepage / category-highlight / urgent-refresh).

**E. Trust & safety**
Reporting (`reports`), moderation status on both listings and media, blocked users, and audit logging
are not optional add-ons — every table that accepts user-generated content needs a moderation path
before it ships.

## 6. Escrow + smart-locker state machine

From `data/smart-locker-integration.md`, adapted to run on Stripe Connect + Supabase:

| Current state | Trigger | Next state | Action |
|---|---|---|---|
| `payment_requested` | Buyer pays (Stripe `payment_intent.succeeded`) | `funds_escrowed` | Funds held on platform; locker slots reserved; drop-off PIN sent to seller. |
| `funds_escrowed` | Locker webhook `locker.dropped_off` | `item_shipped` | Buyer notified; pickup PIN sent. |
| `item_shipped` | Locker webhook `locker.picked_up` | `funds_released` | Payout executed to seller's connected Stripe account. |
| `funds_escrowed` | Drop-off window expires | `refunded` | Reservation cancelled; funds returned to buyer. |
| `item_shipped` | Buyer disputes | `disputed` | Locked for human review; chat/tracking logs attached to the dispute. |

Non-locker fulfillment (regional courier, local pickup) follows the same `orders`/escrow status model
but substitutes carrier tracking webhooks for locker webhooks as the release trigger — don't build two
separate transaction ledgers for the two fulfillment types.

Webhook handlers (Stripe, locker partner) are the one place allowed to write `escrow_status`/`orders`
directly with the service role — verify signatures (`Stripe-Signature`, locker partner's HMAC header)
before trusting any payload, and always return `200` promptly to avoid provider retry storms.

## 7. Engineering standards

- **Production-grade TypeScript everywhere** — strict mode, no `any` escape hatches without a comment
  explaining why.
- **RLS is the security boundary, not an afterthought.** Every new table holding user data ships with
  its RLS policy in the same migration that creates it.
- **No secrets in the repository, ever.** This was violated once already (a live Stripe MFA recovery
  code was found in `data/stripe_backup_code.txt` and has been deleted). Use `.env.local` (gitignored)
  for local secrets and the hosting platform's secret manager in deployed environments. Add a
  `.env.example` with variable names only. Before any commit, scan for anything that looks like a key,
  token, or recovery code.
- **Money:** integer minor units + ISO currency code, never float. Format for display client-side
  per the user's locale/market.
- **i18n:** stable keys in the schema, display strings only in translation tables (§4). Same
  discipline applies to UI copy — no strings hardcoded to one language in components meant to serve
  multiple markets.
- **Mobile-first:** design and test the small-screen layout first; the bottom tab nav
  (search / messages / post-ad / notifications / profile) is the primary navigation on `<768px`, per
  the existing dashboard mockup in `data/marketplace-dashboard.tsx`.
- Don't add speculative abstractions, config flags, or "future-proofing" for markets/features not yet
  scoped. Three similar lines beat a premature abstraction — this applies to schema design too (don't
  add a table for a feature that isn't in §5 yet).

## 8. Requirements & prerequisites

Checklist of accounts, keys, and tools to go get — grouped by when each is actually needed, not
front-loaded. Status as of this writing: **starting from zero on all external accounts below**; update
this list as each one gets created.

**Needed now (Phase 0/1 — get the app talking to a real database): done.** Dedicated project `afrodeals`
(ref `dqlpcodmfvwipnoyykwc`, org "Atlantean Globals Services", region `eu-west-1`) — created via the
Supabase CLI + a personal access token, not the Supabase dashboard. All 14 migrations are pushed (41
tables, 167 seeded categories, 23 seeded attributes, `postgis`/`vector`/`pg_trgm`/`citext` extensions
confirmed enabled). `apps/web/lib/supabase/database.types.ts` holds real generated types
(`supabase gen types typescript`), not the placeholder. `apps/web/.env.local` (gitignored) has the real
URL + anon + service_role keys.

One incident worth remembering: the project ref first given (`vmsmyljesvoqvnaubzav`) turned out to be
an **existing shared project already running an unrelated CRM-shaped schema** (`clients`, `invoices`,
`leads`, `proposals`, `bookings`, `testimonials` — a different app entirely). The first migration push
against it failed on a `profiles` table name collision and rolled back cleanly (verified via
`supabase db query --linked` — no partial state was left behind), so nothing was damaged, but it's why
a fresh dedicated project was created instead of reusing that one. **Never assume a given Supabase
project ref is dedicated to this app — check `information_schema.tables` first if one is ever handed
over again.**

The database password generated at project-creation time exists only in a local scratch file on the
machine that created it, not in this repo — if direct `psql`/pooler access is ever needed, regenerate
it via the Supabase dashboard rather than hunting for that file.

**One decision, not an account — settle before it touches anything external:**
- Finalize the product name/domain. Working name is "AfroDeals" (from the repo name); earlier docs in
  `data/` used "SokoCoin"/"LokoTrade" (see §1). Pick the real name before it lands in the Supabase
  project name, a Stripe business profile, or any public-facing copy — renaming later is cheap now,
  expensive after real users/receipts exist.

**Needed before Phase 2 (AI-assisted listing + search):**
- An AI vision provider account — **the code side of this is now built** (§12: post-ad photo
  auto-fill, `OPENROUTER_API_KEY` from openrouter.ai/keys — routed through OpenRouter rather than
  Anthropic directly), just needs a real key set in `.env.local`/the hosting env to turn on;
  degrades honestly to a "not set up yet" message without one.
- ~~A Mapbox (or Google Maps) API key for geocoding/address autocomplete and map UI.~~ Not needed
  after all for the listing-location map (§12) — it uses Google's keyless `output=embed` iframe with
  a city+country text query, no API key or geocoding call required. Only revisit this if a future
  feature genuinely needs geocoding (address autocomplete, distance/proximity search).

**Needed before Phase 3 (payments/escrow):**
- A Stripe account with Connect enabled (platform account + connected seller accounts).
- A locker-logistics partner API — likely not available yet in most launch markets. Don't block Phase
  3 on this: carrier-tracking fulfillment is the default, smart-locker escrow is an opt-in upgrade
  wherever a partner exists.

**Needed before general launch, not blocking dev:**
- Resend (transactional email), Sentry (errors), PostHog (product analytics). Free tiers are enough to
  wire up early; nothing else depends on these functioning yet.

**Local tooling status (verified this session):** Node.js and git are already installed. The Supabase
CLI needs no install — `npx supabase <command>` works. Docker is the one missing piece, and only
matters if local-Postgres dev is chosen over a hosted Supabase project.

Populate `.env.example` with these as each account above is created — actual values only ever go in
`.env.local` or the hosting platform's secret store:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-only, never exposed to the client
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
LOCKER_PARTNER_API_KEY=
LOCKER_PARTNER_WEBHOOK_SECRET=
OPENROUTER_API_KEY=              # post-ad photo auto-fill (§12) — wired up, just needs a real key
OPENROUTER_MODEL=                # optional, defaults to anthropic/claude-sonnet-4.5
NEXT_PUBLIC_MAPBOX_TOKEN=        # not currently used by anything (§12) — the location map doesn't need it
RESEND_API_KEY=
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
```

## 9. Reference material index (`data/`)

Everything in `data/` is design input, not application code. Status of each file after this
reconciliation:

| File | Status |
|---|---|
| `00_core.sql` … `07_vehicle_catalog.sql`, `09_triggers_outbox_search.sql`, `10_complete_rls.sql` | **Ported.** Copied verbatim into `supabase/migrations/2026010100{00,01,02,03,04,05,06,07,09,10}00_*.sql`. |
| `08_nl_geography.sql` | **Not ported** — Netherlands-only, see the exclusion note in §4. Left in `data/` as historical reference only. |
| `MIGRATION_ORDER.md` | Reference — documents the ordering rationale for the files above. |
| `README.md` | Reference. Good source for the category/attribute field checklists (§11 of that doc); its "recommended tech stack" section is superseded by §2 of this file. |
| `agent.md` | Reference. Product vision and customer scenarios are still relevant (folded into §5); its FastAPI/Docker persona and file layout are superseded by the stack decision in §2. |
| `deployment-guide.md` | Superseded by §2/§8. Supabase-as-database part is still correct; the FastAPI-on-Render/AWS part is not what we're building. |
| `schema.sql` (renamed from `marktplaats-multilingual-schema-v2.sql` after this review started — that old name is what earlier commits/discussion refer to) | Mined, not ported directly (wrong id/i18n pattern). Its PostGIS/pgvector/escrow/smart-locker ideas became `supabase/migrations/20260101001100_geospatial.sql`, `...001200_vector_search.sql`, `...001300_ai_listing_metadata.sql`, `...001400_fulfillment_escrow.sql`. |
| `smart-locker-integration.md` | **Canonical for the state machine** (§6); its state machine is implemented in `...001400_fulfillment_escrow.sql`. Its FastAPI code samples are illustrative only. |
| `sokocoin-all-in-one-docker.md`, `sokocoin-ultimate-docker-spec-v2.md` | Superseded by §2/§3. Kept for the AI-prompt-per-module ideas in Part 4 of the "ultimate spec" doc, which are still a reasonable way to break up implementation work. |
| `database.types.ts` | Superseded — regenerate real types from the live schema with `supabase gen types typescript` once the project is linked to a Supabase instance; don't hand-maintain this file. |
| `marketplace-dashboard.tsx` | Reference UI mockup — useful for layout/IA and the mobile bottom-nav pattern; not production code (uses mock data, no data fetching). |
| `Marketplace_Architecture_and_Escrow_Workflow.png` | Reference diagram of the escrow flow — matches §6. |
| `stripe_backup_code.txt` | **Deleted** (contained a live Stripe MFA recovery code). If that code hasn't been rotated in the Stripe dashboard yet, do that. |

## 10. Phased roadmap

Each phase states what it unlocks and what it needs from the checklist in §8. Don't parallelize
phases 1-3 across features nobody can use yet — a working listing→search→message loop before payments
exist is more valuable than a payments system with no listings to buy.

**Phase 0 — Foundation: done.** Repo, migrations (pushed to the live `afrodeals` Supabase project),
Next.js scaffold, and the Plesk deploy pipeline (§11) all exist and are verified working end-to-end.
`@supabase/supabase-js` + `@supabase/ssr` are installed; `apps/web/lib/supabase/client.ts` (browser),
`server.ts` (Server Components/Actions, RLS-scoped), and `service.ts` (service-role, trusted-server-only
per §4/§7) are scaffolded; `apps/web/proxy.ts` (renamed from `middleware.ts` — Next.js 16 renamed the
convention) refreshes auth session cookies on every request. Not yet done: no actual sign-in/sign-up UI
or protected routes exist yet — that starts Phase 1.

**Phase 1 — Walking skeleton: done.** Auth (sign up/in/out, email-link callback), listing CRUD with
category/attribute-driven forms, keyword browse/search with category + city filters, favorites,
real photo upload, and in-app messaging all exist and are verified working end-to-end
(Playwright-driven): sign up → post an ad with dynamic category attributes and real photos →
appears in search → edit → delete; separately, message a seller → real-time-ish two-way
conversation → unread badges clear on read (see §12 for both).

## 12. Notes from the Phase 1 build pass

Things that broke silently or non-obviously while building the first real UI on top of the schema —
worth reading before extending this code, since some are gotchas that will resurface.

- **`listing_media` RLS gap.** `10_complete_rls.sql` enabled RLS on `listing_media` but never gave
  it a policy. RLS-enabled-with-zero-policies means default-deny for every role except the service
  role — so listing photos were silently returning zero rows to normal client queries (no error,
  just empty). Fixed in `20260101001700_listing_media_rls.sql`. If any *other* table ever seems to
  silently return nothing despite data being present, check for this exact pattern first.
- **Top-level categories had no English translations.** `04_seed.sql` (part of the original ported
  base) only seeded Dutch names for the 36 top-level categories; only the subcategories
  (`05_subcategories.sql`) got English ones. Fixed in `20260101001600_top_category_en_fr_translations.sql`,
  which also added French since that's a launch language. `lib/categories.ts` falls back to the raw
  UUID when a translation is missing — if raw UUIDs ever show up in the UI again, it's this.
- **Base UI's `Select.Value` does not auto-resolve a label from rendered `SelectItem` children** the
  way Radix's does — by default it shows the raw `value`. Two fixes, and which one applies depends on
  where the `<Select>` is rendered:
  - From a **Client Component** (e.g. `components/listing-form.tsx`): pass a render-function as
    `SelectValue`'s children — `<SelectValue>{(value) => lookupLabel(value)}</SelectValue>`.
  - From a **Server Component** (e.g. `app/page.tsx`): a function can't cross the server→client
    boundary as a prop at all (React throws "Functions are not valid as a child of Client
    Components"). Use `<Select items={[{value, label}, ...]}>` instead — plain serializable data,
    and `SelectValue` resolves the label from it automatically.
- **Listing photos: display exists, upload doesn't yet.** `lib/media.ts`'s `resolveMediaUrl` treats
  `listing_media.storage_key` as either a full external URL (used for demo data — starts with
  `http`) or a real Supabase Storage object path (once upload exists). No schema change was needed
  for this. `next.config.ts`'s `images.remotePatterns` allows both `images.unsplash.com` (demo only)
  and this project's own Supabase Storage domain.
- **Demo/seed listings.** `apps/web/scripts/seed-demo-listings.mjs` creates one demo seller
  (`afrodeals_demo`) and ~12 realistic listings with real (verified-loading) Unsplash photos across
  several categories, so the browse UI isn't empty. Safe to re-run (looks up the demo seller by
  username first). Remove this data before any real launch.
- **Supabase Auth `mailer_autoconfirm` is currently ON** for the `afrodeals` project (toggled via the
  Management API during this build, not the dashboard). This was necessary because the shared/free
  email-sending rate limit made iterating on signup impossible otherwise. **Turn this back off before
  real users sign up** — right now every signup skips email verification entirely. Also note: Supabase
  rejects signups on domains with no real MX records (e.g. `example.com`, made-up test domains) —
  use a real domain for any test signup.
- **New listings could silently vanish from their own category page.** Two independent bugs, both
  found by reproducing the user's exact "0 results" repro rather than guessing:
  - `20260101002200_internal_tables_rls.sql` enabled RLS with zero policies on `outbox_events` (an
    internal CDC table — correct to lock down), but missed that `listing_outbox()`
    (`09_triggers_outbox_search.sql`) is a trigger that writes to it on every listing insert, running
    as the calling user, not a service role. Every listing creation started failing RLS the moment
    that migration landed. Fixed in `20260101002300_fix_outbox_trigger_security_definer.sql` — same
    `SECURITY DEFINER` pattern already used by `handle_new_user()`.
  - `app/categories/[id]/page.tsx`'s listings query embedded `profiles(...)`, which PostgREST can't
    resolve unambiguously once `favorites` also links `listings` to `profiles` — it returned a real
    `PGRST201` error, but the page only destructured `data` from the query result and never checked
    `error`, so the failure silently rendered as "No listings yet" instead of surfacing. Fixed by
    disambiguating to `profiles!listings_seller_id_fkey(...)`, and by logging any future
    `listingsError` instead of swallowing it — a query failure should never again look identical to
    an empty state. **Lesson: always destructure and check `error` from a Supabase query**, even when
    the empty-state UI would otherwise look plausible.
- **Post-an-ad step 2 now implements the reference "chosen category" treatment.** The category is
  shown as a full breadcrumb trail (via `getCategoryPath`, already used elsewhere) in a bordered
  callout with a "Change" link back to step 1, plus a top-right "Post your free ad" shortcut button
  that submits the same form early. See `components/listings/new-listing-step2-form.tsx`.
- **Photo upload: bumped to 24 photos, real drag-to-reorder, cover-photo indicator.**
  `components/listings/photo-upload.tsx` uses native HTML5 drag-and-drop (no library) and a
  `DataTransfer`-synthesized `<input type="file" name="photos">` so the reordered/edited selection
  still reaches the server action's `formData.getAll("photos")` unchanged. One gotcha worth keeping
  in mind if this component is touched again: **`URL.createObjectURL(file)` must not be called
  inline during render** — it mints a distinct, unrevoked blob URL on every call even for the same
  `File`, so calling it in a `.map()` leaks a new URL on every reorder/removal, not just on add. It's
  cached per-`File` in a `useRef` map and revoked once a file drops out of `files` (verified via a
  Playwright test that drags photo 1 onto photo 2's slot and checks the DOM order actually swapped,
  not just that the two blob URLs differ across renders).
- **"Have a photo? Let AI fill this in" (photo-to-listing auto-fill) — now implemented**, on step 1
  of the post-ad wizard (`components/listings/new-listing-step1.tsx`). Uploading a photo there
  resizes it client-side to a sane useful-resolution ceiling (`lib/image.ts`, ~1568px long edge,
  re-encoded as JPEG) and sends it to `app/listings/new/analyze-photo-action.ts`, which calls a
  vision-capable Claude model **through OpenRouter** (`OPENROUTER_API_KEY`, model slug configurable
  via `OPENROUTER_MODEL`, defaults to `anthropic/claude-sonnet-4.5` — OpenRouter chosen over calling
  Anthropic directly so the key isn't tied to one provider's billing account) with the image plus
  the real list of postable leaf category labels (from `getCategoriesAndAttributes`) and asks it to
  return a title, description, and one category **copied verbatim from that list** — grounded to
  the real taxonomy, never a free-generated category name, so it can't suggest something that
  doesn't exist. Without a key, the feature shows an honest "Photo analysis isn't set up on this
  server yet." message rather than faking a result — same treatment as every other
  missing-infrastructure gap in this project (Google OAuth, buyer protection, carrier integration).
  - Since a `File` object can't survive the client-side route change from step 1 to step 2, the
    resized image (as a data URL) and generated description hand off through `sessionStorage`
    (`lib/listing-draft.ts`), keyed to the exact title+category the user continued with so a stale
    draft from an abandoned attempt can never bleed into a different listing. Step 2
    (`new-listing-step2-form.tsx`) picks it up on mount, pre-seeds `PhotoUpload` with the photo
    (`initialFiles` prop, seeded exactly once — a user's own later photo picks are never overwritten)
    and pre-fills the description (via a `key`-forced remount, since `defaultValue` only applies on
    first mount and this arrives from an async `sessionStorage` read that can't resolve before then).
    A small "AI-generated — please review" label sits next to the description whenever this ran, so
    the source of the text is never ambiguous — the user still has to read and submit it themselves,
    nothing posts on their behalf automatically.
  - **A second AI-assist entry point lives on step 2 itself** (Photos section,
    `new-listing-step2-form.tsx`), for anyone who lands there without ever touching step 1's
    version — picked a category manually, then added photos directly on this page. "Fill in title &
    description with AI" runs the same real `analyzeListingPhoto` call against the current cover
    photo (`PhotoUpload`'s new `onFilesChange` callback prop feeds the parent form the live file
    list so this button knows what to analyze) and writes straight into the on-page title/description
    fields — the title via a ref (that field is `defaultValue`-uncontrolled, like the rest of this
    form), the description via the same `key`-remount trick the sessionStorage draft already used.
    If the suggested category differs from the one already chosen on step 1, it says so
    ("might fit better under X — change category") rather than silently swapping the category out
    from under attributes/characteristics already rendered for the current one.
- **Photo upload silently capped at 1 photo — real bug, fixed.** `PhotoUpload`'s `addFiles` used to
  call `Array.from(newFiles)` *inside* the `setFiles` updater function, where `newFiles` is a live
  reference to the file `<input>`'s own `.files` — and the `onChange` handler resets that input's
  `value` (which clears `.files` too) right after calling `addFiles`, so it can be reused for the
  next selection. Depending on exactly when React re-invoked the updater relative to that reset
  (observed happening on every add after the first), `Array.from` could read the now-emptied live
  list instead of the original selection, silently dropping the file. Fixed by snapshotting into a
  plain array *before* calling `setFiles`, immune to the input being cleared afterward. Verified via
  Playwright: sequential single adds (1→2→3) and selecting multiple files in one dialog both work
  correctly now.
- **Second real bug, surfaced *by* fixing the first one: Server Action body size limit.** Once
  multiple real photos could actually be attached, a normal 3-4 photo submission started failing
  outright with Next's default 1MB Server Action body cap ("Body exceeded 1 MB limit") — tiny test
  PNGs never hit this during earlier testing, so it went unnoticed until a real user hit it with
  real phone-camera-sized photos. Fixed via `experimental.serverActions.bodySizeLimit: "50mb"` in
  `next.config.ts`, sized to comfortably cover a full `MAX_PHOTOS=24` listing at a few MB each.
- **AI assist is now an explicit, visible toggle, not just an ignorable button** — a "Use AI"
  checkbox (checked by default) above both step-1's photo-analysis card and step-2's "Fill in title
  & description with AI" button; unchecking hides the AI UI entirely rather than leaving it present
  but unused, so it reads as a genuine choice rather than an assumed default. Purely a display
  toggle — turning it off doesn't clear anything already filled in from an earlier AI run.
- **Logo swapped** (`public/logo.png`, replaced directly on disk, not through a chat upload — noticed
  via a changed mtime) from the "AfroDeals" wordmark to a "marketplace" wordmark (cart + Africa
  silhouette, same navy/orange/green). Only the image changed — all text branding (page titles,
  metadata, footer copyright, this file's own "AfroDeals" references) was deliberately left alone,
  since swapping the image isn't the same ask as renaming the product; revisit if a full rename is
  ever wanted. New file is 1548×592 (was 1762×900) — a different aspect ratio, so the header's
  rendered size needed updating too, not just the file.
  - **`next/image`'s dynamic optimizer served stale bytes after the file changed, even after
    clearing `.next/cache/images` and fully restarting the dev server** — confirmed the raw
    `/logo.png` static file and a fresh `/_next/image?...` request both returned the new file
    correctly, yet the actual browser-rendered request still got a `304 Not Modified` against
    old cached bytes. Root cause not fully pinned down (likely an ETag/conditional-request quirk
    specific to Next's dev-mode image route), but since this could just as easily bite in
    production after a real deploy, the fix was to stop routing this small, rarely-changing static
    asset through the optimizer at all — `components/nav.tsx` now renders it as a plain `<img>`
    tag instead of `next/image`. If any other static asset ever seems to not update after a file
    swap, this is the first thing to suspect.
- **Children & Babies taxonomy rebuilt from a flat 6 leaves to a real 2-level structure** (11
  mid-level groups, 113 leaf categories — `20260101002700_children_babies_taxonomy.sql`), translated
  from the Marktplaats "Kinderen en Baby's" reference the user shared screenshot-by-screenshot. The
  old 6 leaves had zero listings or `category_attributes` mappings (checked before writing the
  migration), so they were deleted outright rather than reparented. This is the deepest category
  branch in the taxonomy now — worth using as the template if another top-level category needs the
  same 2-level treatment later.
- **All category ordering switched from the seeded `sort_order` to alphabetical**, in
  `lib/categories.ts` (the one shared module every category-listing UI reads from — homepage
  sidebar, category directory pages, the post-ad category picker, the footer's grid and each of its
  columns): `categoryOptions`, `topLevelCategories`, `getCategoryDirectory`'s children/grandchildren,
  and `getFooterCategories` all now sort by name (`localeCompare`) instead of the stored integer.
  `sort_order` reflected seed-time insertion order, not a deliberate browsing order, so this is
  simpler to reason about and easier to scan — but it also means `sort_order` is now vestigial for
  every category list in the app; don't bother maintaining it carefully in future category
  migrations (this one didn't).
- **Audio, TV & Photo taxonomy rebuilt the same way** (7 flat leaves → 8 mid-level groups, 63 leaf
  categories — `20260101002800_audio_tv_photo_taxonomy.sql`), translated from the matching
  Marktplaats reference. One existing leaf, `Televisions`, was **reparented** under the new "Film &
  Television" group rather than deleted+recreated, since it was already a real, correctly-named
  category — the other 6 old leaves had zero listings and were replaced outright, same as Children
  & Babies. **One honest gap**: the reference's "Film en Televisie" card had a collapsed "Toon meer"
  in the screenshot the user shared, so only the visible subset got transcribed (Projectors,
  projector accessories, Blu-ray players, Televisions) — if the hidden items ever get shared, add
  them the same way.
- **Category directory cards now collapse long lists** — `components/category-group-card.tsx` (used
  by every `/categories/[id]` directory page, not just this one) shows the first 6 leaves with a
  "Show N more" / "Show less" toggle once a group has more than 6, matching the reference's
  Marktplaats-style behavior; groups with 6 or fewer show no toggle at all (e.g. "Services &
  Professionals" at 3 items). Real client-side expand/collapse (`useState`), not a fake button —
  extracted out of the category page itself since that page is a Server Component and can't hold UI
  state directly.
- **Seller website link + a couple of real listing-detail polish items — implemented.** A seller can
  add an optional website URL (`profiles.website_url`, migration `20260101002400_profile_website_url.sql`
  — applied directly via a pooler `pg` connection since `supabase db push` had no CLI access token in
  this session; not yet reconciled with the CLI's own migration-tracking table, so a future
  `db push` may need `IF NOT EXISTS` added or the table hand-updated) via the Contact details section
  on both the post-ad wizard and the edit form — `normalizeWebsiteUrl()` in `app/listings/actions.ts`
  adds `https://` to a bare domain and validates it actually parses as a URL. It's seller-wide, not
  per-listing, so it shows on every one of their listings. When set, the listing detail page's
  Message button splits into a "Website" (real link, opens in a new tab) + "Message" pair, matching
  the reference's business-seller layout — free rather than gated behind Stripe, since (unlike
  Marktplaats) there's no payment infra here to gate it behind anyway. Two more real (not
  fabricated) additions from the same reference: a live favorite count on the photo (computed from
  `favorites`, not the unmaintained `listings.favorite_count` column — nothing in this schema has
  ever incremented it, so trusting it would just always show 0), and prev/next arrows + an "N/total"
  counter on the main photo (`components/listings/photo-gallery.tsx`), in the main view and the
  lightbox. **Deliberately not built from that same reference**: a star rating/review count (no
  reviews system exists anywhere in this schema) and a specific shipping price like "€7,95" (no
  shipping-cost calculation exists — `delivery_available` is a plain boolean). Both would have to be
  invented to show, which this project has consistently avoided.
- **In-app messaging — now implemented for real**, replacing the honest "coming soon" placeholder.
  `conversations`/`conversation_participants`/`messages` already existed in the schema
  (`20260101000200_marketplace.sql`) with SELECT policies from the original RLS pass, but nothing
  could actually *create* a conversation — no INSERT policy existed on `conversations` or
  `conversation_participants`, by design (nothing should freely insert arbitrary participant rows).
  Fixed with `start_conversation(p_listing_id)` (migration `20260101002500_messaging.sql`,
  `SECURITY DEFINER`, same pattern as `handle_new_user()`/`listing_outbox()`): derives the seller
  from the listing itself (never trusts a client-supplied seller id), refuses to let someone message
  themselves, and reuses an existing conversation for the same buyer+listing instead of creating
  duplicates on every "Message seller" click. A trigger (`touch_conversation()`) bumps
  `conversations.updated_at` on every new message so the inbox sorts by recent activity.
  - **Real bug hit and fixed along the way, pre-existing in the original migration, not something
    this session introduced**: `participant_member_read`'s subquery
    (`...WHERE mine.conversation_id=conversation_id...`) has that bare `conversation_id` resolve to
    the subquery's own `mine.conversation_id` (Postgres binds unqualified columns to the innermost
    scope that has one) rather than the outer row being checked — a self-referencing tautology that,
    because the subquery itself reads `conversation_participants` under that same policy, causes
    genuine infinite recursion: Postgres errors `42P17 infinite recursion detected in policy for
    relation "conversation_participants"` rather than looping forever. This silently blocked *any*
    real read of conversations/participants/messages (all three tables' policies ultimately touch
    `conversation_participants`), which is exactly why messaging never worked despite the tables and
    read policies already existing. Fixed in `20260101002600_fix_conversation_rls_recursion.sql` via
    `is_conversation_participant(p_conversation_id)`, a `SECURITY DEFINER STABLE` function — its
    internal query runs as the function owner, bypassing RLS for that one internal read and breaking
    the recursive cycle, the standard fix for RLS self-reference on the same table. Confirmed fixed
    both by direct authenticated-session testing (two fresh signups, one calls `start_conversation`,
    both can read the resulting rows) and the full Playwright flow below. **If any future policy
    needs to check membership in `conversation_participants` from a policy on that same table (or
    from `conversations`/`messages`), route it through `is_conversation_participant()` — a raw
    correlated subquery on the same table will hit this again.**
  - UI: `/messages` is a two-pane inbox (`components/messages/conversation-list.tsx` +
    the thread view inline in `app/messages/page.tsx`) — conversation list with unread badges (real,
    computed from `messages` vs. the viewer's own `conversation_participants.last_read_at`, not a
    fabricated count) on the left, the open thread on the right; collapses to one pane on mobile
    (list or thread, with a back arrow), matching the reference screenshot's Marktplaats-style
    layout. A safety-tips banner sits above every thread (real link to `/safety`, not a fake
    fraud-detection claim). Sending is a real `messages` INSERT
    (`app/messages/actions.ts::sendMessage`); the composer calls `router.refresh()` after sending —
    `revalidatePath` inside a Server Action invalidates the cache but does **not** make an
    already-mounted page refetch on its own, so without this the sender's own message wouldn't
    appear until an unrelated navigation. Read receipts ("· Read" under a sent bubble) are a real,
    honest approximation from `last_read_at` (message timestamp ≤ the other participant's
    `last_read_at` ⇒ read) — coarser than Marktplaats' per-message receipts, but not fabricated.
  - **No Supabase Realtime subscription** — a `MarkRead` client component
    (`components/messages/mark-read.tsx`) polls `router.refresh()` every 4s while a thread is open
    instead, so a reply shows up within a few seconds without a manual reload. Real and honest (no
    fake "typing…"/"online now" indicators), just not instant push — swapping in a Realtime channel
    subscription on `messages` would be the natural upgrade if this needs to feel snappier later.
  - **Not built** (matches the "Deel foto's"/"Deel adres" quick-actions in the Marktplaats
    reference): sharing a photo or address inline in a message. `messages.attachment_key` exists in
    the schema for this, but wiring up an actual upload path was out of scope for this pass — text
    messaging only for now, rather than a photo/address button that doesn't do anything.
  - Verified with a full Playwright run (seller posts a listing → buyer clicks "Message seller" on
    it → real conversation created and redirected into → buyer sends a message → seller sees it in
    their inbox with an unread badge and in the thread → seller replies → buyer sees the reply and a
    "Read" receipt on their own earlier message → unread badge clears once the seller has opened the
    thread). All 10 checks passing at time of writing.

**Phase 2 — Trust & discovery.** PostGIS proximity ("near me") search; AI-assisted listing creation
(§5 scenario A); semantic search via the pgvector embeddings already migrated in
(`20260101001200_vector_search.sql`). Needs: AI vision provider account, Mapbox/Google Maps key (§8).

**Phase 3 — Transactions.** Stripe Connect payments with escrow hold (§6 state machine); carrier
fulfillment by default; smart-locker fulfillment where a partner exists. Needs: Stripe Connect account,
optionally a locker partner (§8).

**Phase 4 — Growth.** Promotions/boosts, business/merchant subscription tiers, moderation tooling,
notifications. Needs: Resend/Sentry/PostHog wired up (§8) if not already done earlier.

## 11. Deployment — Plesk (`marketplace.apps-pilot.nl`), via FTP

Hosting is a Plesk server (LiteSpeed web server, Node.js via its `lsnode.js` runner) with no SSH
access on this plan — the "Local repository" git-push option in Plesk's Git panel is unavailable
because of that, so deployment is: **build locally, upload the build via FTP**, not git-triggered.

`next.config.ts` sets `output: "standalone"` for this — `next build` produces a self-contained
bundle (its own minimal `node_modules`, a generated `server.js`) that needs no `npm install` on the
server, since FTP-only hosting has no remote build step. `apps/web/app.js` is a one-line shim
(`require("./server.js")`) — confirmed necessary by reading this server's own `stderr.log` over FTP,
which showed its LiteSpeed Node runner hard-coded to look for `app.js` specifically, not `server.js`.

`next.config.ts` also sets `outputFileTracingRoot` to the repo root (added when this repo picked up
a Vercel deploy target alongside Plesk — see the Vercel section below). That's required for Vercel's
build (Root Directory = `apps/web`) to trace files correctly, but it has a side effect here too: the
standalone bundle now nests one level deeper, under **`apps/web/.next/standalone/apps/web/`**
(mirroring the path from the tracing root down to the app), not flatly at `apps/web/.next/standalone/`
like before. Every command and path below already accounts for this — if a `server.js`/`app.js`/etc.
copy step ever fails with "not found" at the old flat path, this is why; adjust to the nested one.

**Build + package for upload, from `apps/web`:**
```
npm run build
cd .next/standalone/apps/web
rm -rf public .next/static app.js
cp -r ../../../../public .
cp -r ../../../../.next/static .next/static
cp ../../../../app.js .
```
(Next's standalone output doesn't include `public/` or `.next/static/` by default, and doesn't know
about the `app.js` shim — all three are copied in fresh every build.) The resulting
`apps/web/.next/standalone/apps/web/` directory is what gets uploaded — its *contents*, not the
`apps/web/` wrapper folder itself — preserving internal structure, to the FTP account's
`marketplace.apps-pilot.nl/` directory (confirmed root via directory listing — this is the actual
document root, distinct from the `/marketplace.apps-pilot.nl` server path shown in the earlier
git-based screenshot).

**Confirmed working FTP connection details (as of 2026-08-21):** host `marketplace.apps-pilot.nl`
(ProFTPD, port 21), user `marketplace`. Its FTP root ("/") **is** the app root directly (app.js,
node_modules, public/, server.js all sit right at "/" for this account) — no domain-name subdirectory
prefix needed in upload URLs, unlike an earlier session where a different account (`edski`) was
chrooted one level up and needed `ftp://marketplace.apps-pilot.nl/marketplace.apps-pilot.nl/<relpath>`.
**`edski` no longer authenticates** (clean `530 Login incorrect`, not a network issue) — don't assume
it still works. Plesk's FTP Access panel apparently has *multiple* accounts here that look
interchangeable but aren't: one named `marketplace` is chrooted to just the `public/` subfolder
(useless for a full deploy — can't reach app.js/.next/node_modules), while a *different* password for
the same `marketplace` username has full access to the actual app root. **Always confirm with a
directory listing** (`curl -u 'user:pass' ftp://marketplace.apps-pilot.nl:21/`) that you see
`app.js`/`node_modules`/`server.js` at top level before trusting an account for a real deploy — don't
assume by name alone. Credentials live only in shell history/scratch files on this machine, never in
this repo or in `.env*`.

**Uploading, from `apps/web/.next/standalone`:** curl can't upload a directory tree directly, and its
default URL-globbing chokes on the literal `[` `]` characters Next puts in some generated chunk
filenames (e.g. `[root-of-the-server]__....js`) — pass `--globoff` (or `-g`). The working pattern is a
generated `-K` config file pairing `url = "ftp://marketplace.apps-pilot.nl/<relpath>"` with
`-T "<relpath>"` per file (both on the **same line** — split across lines silently breaks curl's config
parser), run as one `curl -g --ftp-create-dirs -u 'user:pass' -K config.conf` invocation so the control
connection is reused across all ~1449 files instead of reconnecting per file. **Regenerate the file
list fresh from `.next/standalone` immediately before generating this config, every single time** —
Turbopack's chunk filenames are content-hashed and change between builds, so reusing a file list from
an earlier build points curl at files that no longer exist and aborts the whole upload partway through
(`curl: cannot open '<stale-chunk>.js'`, exit code 26) with no server-side error at all.

**After every upload, the app must be restarted manually** — Plesk → Domains →
`marketplace.apps-pilot.nl` → Node.js → **Restart App**. There is no FTP-triggerable restart hook on
this hosting (no SSH, no git-push deployment action), so this is a required human step after each
deploy; confirm Node.js is enabled there with startup file `app.js`, application root matching the FTP
upload path, Node 20+ (server is currently running Node 23.11.1), mode production, and environment
variables from §8 as each account is created.

**Never use Plesk's "Run script" or "NPM install" buttons on this app — only "Restart App".**
Running the `build` script (`npm run build` → `next build`) directly on the server wiped
`.next/server`, `.next/static`, and the build manifests (Next always clears its own output before
rebuilding) and then failed immediately with `Couldn't find any 'pages' or 'app' directory`, taking
the live site down until the full bundle was re-uploaded from this machine. This isn't a bug to fix —
it's structural: `output: "standalone"` deploys deliberately exclude the source `app/` directory (that's
the whole point, no server-side build step needed), so `next build` can never succeed there even if it
didn't wipe anything first. (It also hit a native-binary mismatch first — `@next/swc-linux-x64-gnu`
needs a newer glibc than this server has — but that's moot since the command should never run here at
all.) If this happens again: re-run the FTP upload from `apps/web/.next/standalone` (no rebuild needed
if the local one is still current) to restore the wiped files, then Restart App.

**Current status: live**, serving the real app (verified via `X-Powered-By: Next.js` and real page
content, not a placeholder). One gotcha hit and resolved early on: a leftover Plesk default
`index.html` in the document root was being served statically by LiteSpeed ahead of the Node.js proxy
(visible via static-file response headers — `Last-Modified`/`Etag`/`Accept-Ranges` — instead of
`X-Powered-By: Next.js`). Renamed it to `index.html.bak` over FTP (not deleted, in case anything
referenced it) and the app started serving immediately. **If a future deploy ever regresses to showing
a static/placeholder page again, check for a static `index.html` re-appearing in the document root
before assuming the Node app itself failed.**

**A second outage happened on 2026-08-21: the whole site 503'd because `.next/` was missing from the
server entirely** (root FTP listing showed `app.js`/`server.js`/`node_modules`/`public/` but no
`.next/` at all). `stderr.log` showed a crash loop — LiteSpeed's `lsnode.js` supervisor kept restarting
the Node process, which immediately died again with "Could not find a production build in the
'./.next' directory", over and over. Root cause unconfirmed (possibly an interrupted earlier upload, or
side-effects of experimenting with Plesk's Git panel the same session — nothing here). Fix was just
uploading a complete, fresh `.next/`; **the app recovered on its own once valid files existed** —
`lsnode.js`'s own crash-retry loop picked up the new build without needing a manual Restart, so a
missing/incomplete `.next/` is worth checking first if the site 503s again, before assuming a manual
restart is required. **Lesson: always verify a deploy landed by checking the live site's HTTP status
*and* grepping its HTML for something from the latest code** (agents.md updates alone don't prove
anything shipped) — this outage sat undetected until a routine post-deploy check caught it.

## 13. Deployment — Vercel (`afrodeals.net`), the permanent production site

**`afrodeals.net` on Vercel is the permanent production site going forward** — the Plesk deploy in
§11 remains documented and (as of writing) still live at `marketplace.apps-pilot.nl`, but new work
ships to Vercel, not there.

**Deploy trigger: git push, not FTP.** Vercel is connected to the `github` remote's `main` branch
(a separate GitHub repo, `edwinchi/marketplace`, pushed to via an SSH deploy-key alias —
`git remote -v` shows both `origin` (Plesk's git panel, unused for actual deploys) and `github`).
Every push to `github main` triggers an automatic production build; there is no manual upload step
like Plesk's FTP dance. Confirm a deploy actually landed with
`cd apps/web && npx vercel ls afrodeals.net` (or `vercel project ls` for the full project list) —
same "don't trust that a push happened, verify the live result" discipline as §11.

**Project setup: Root Directory = `apps/web`.** This is a monorepo (the actual Next.js app lives in
`apps/web`, not the repo root) — Vercel's project settings have Root Directory explicitly set to
`apps/web` so it builds the right subtree. This is also why `next.config.ts` needs
`outputFileTracingRoot` pointed at the repo root (see §11) — Vercel's build needs it to trace files
correctly across the monorepo boundary, even though Vercel's own build process is otherwise
unrelated to Plesk's standalone bundle.

**`output: "standalone"` must NOT apply on Vercel.** `next.config.ts` gates both `output` and
`outputFileTracingRoot` behind `!process.env.VERCEL` (Vercel sets `VERCEL=1` automatically during
its own builds and at runtime) — Plesk needs standalone mode (§11), but Vercel's own serverless
build/routing actively conflicts with it. Two real failures happened before this conditional
existed, in this order:
1. **Build failure**: `ENOENT: no such file or directory, open '.../apps/web/.next/next-server.js.nft.json'`
   — missing `outputFileTracingRoot` for the monorepo. Adding it fixed the build, but then:
2. **Every route 404'd** on the deployed site despite a "successful" build — caused by
   `output: "standalone"` being active on Vercel at all. Vercel does its own serverless
   packaging; a self-contained standalone bundle isn't the shape it expects and it can't route to
   any page. Fixed by making both settings conditional on `!process.env.VERCEL`.

If a future Vercel build either ENOENTs on an `.nft.json` file or succeeds but 404s on every route,
this is almost certainly the same class of problem re-appearing — check `next.config.ts`'s
`isVercel` conditional first before assuming something else broke.

**Local Vercel CLI usage — run every command from `apps/web`, never the repo root.** The Root
Directory setting above means the CLI applies it *relative to wherever you invoke it* — running
`vercel` (or `vercel --prod`, `vercel env ...`) from the repo root causes it to look for
`apps/web/apps/web` (double-nesting the Root Directory on top of itself) and fails with `The
specified Root Directory "apps/web" does not exist`; running it from *inside* `apps/web` with no
further path argument is correct. `cd apps/web && npx vercel link --yes --project afrodeals.net`
once creates the local `.vercel/project.json` link (gitignored); after that, plain `vercel --prod`
from that same directory deploys correctly.

**Environment variables**: `vercel env add NAME production` (piped a value via stdin, e.g.
`echo "value" | npx vercel env add NAME production`) adds one; `vercel env ls` lists what's set per
environment. A newly-added variable is picked up **immediately by already-running production
functions with no redeploy needed** for anything read via plain `process.env.X` in server-only code
(confirmed empirically) — only `NEXT_PUBLIC_*` variables baked into the client bundle at build time
need a fresh deploy to pick up a change.

**Domain**: `afrodeals.net` was registered directly through Vercel's own domain-purchase flow
(`vercel.com/domains`) and attached to the `afrodeals.net` project. Google OAuth's redirect URI and
Supabase Auth's Site URL / Redirect URLs allow-list both had to be updated to include
`https://afrodeals.net` — a code-side origin fix alone isn't sufficient, Supabase silently falls
back to its default Site URL for any `redirect_to` not on that allow-list.

**Current status: live**, confirmed via real page content and successful authenticated
click-through testing (login, search, category browse, listing detail, favoriting, messages,
notifications, my-account pages, the plate-lookup feature) — not just an HTTP 200.
