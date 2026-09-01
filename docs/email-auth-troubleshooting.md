# AfroDeals Dev & Troubleshooting Log

Started as an email/auth incident log (2026-08-29); scope has grown to cover the rest of the work from that same stretch — admin dashboard, URL slugs, mobile nav, sharing, and the Plesk deployment saga. Kept in Q&A form for whoever debugs the next issue on this project. For the canonical deployment *procedure* (exact commands), see `agents.md` §11 — this file covers the *why* and the incident history, not a copy of the recipe.

## Contents

- [Email & Auth](#email--auth)
- [Admin Dashboard (`/admin`)](#admin-dashboard-admin)
- [Login/Signup Redesign](#loginsignup-redesign)
- [Listing & Category URL Slugs](#listing--category-url-slugs)
- [Category Data Caching](#category-data-caching)
- [Cars Search & Category Browse](#cars-search--category-browse)
- [Mobile Navigation Header](#mobile-navigation-header)
- [Share Feature](#share-feature)
- [Production Deployment & the Outage](#production-deployment--the-outage)

---

## Email & Auth

## Q: A customer got "Email rate limit exceeded" while signing up. Why?

Supabase Auth was still using its own built-in default mailer for signup confirmation emails, instead of a real SMTP provider. That default mailer is explicitly meant for testing only and is capped at a couple of emails per hour per project (confirmed via `supabase/config.toml`'s `auth.rate_limit.email_sent = 2`, which mirrors the hosted default). Once more than ~2 people tried to sign up in the same hour, Supabase started rejecting new signups outright.

**Fix**: connect a real transactional email provider via Supabase's custom SMTP setting.

## Q: What provider did we use, and how was it set up?

[Resend](https://resend.com) (free tier: 3,000 emails/month). Steps:

1. Create a Resend account, add the domain to send from (we used the root `apps-pilot.nl`, not a specific subdomain).
2. Add the DNS records Resend shows (one DKIM TXT record at `resend._domainkey`, two CNAME records at `rsend` and `send`) in Plesk → Websites & Domains → [domain] → DNS Settings, at the **root domain's zone**, not a subdomain-specific one.
3. Wait for Resend to show the domain as **Verified**.
4. Create an API key in Resend → API Keys.
5. In Supabase Dashboard → Authentication → Settings → **SMTP Settings**, enable custom SMTP:
   - Host: `smtp.resend.com`, Port: `465`, Username: `resend`, Password: the Resend API key.
   - Sender email: `no-reply@apps-pilot.nl`, Sender name: `AfroDeals`.

## Q: Does verifying `apps-pilot.nl` in Resend also cover subdomains like `marketplace.apps-pilot.nl`?

Yes. DKIM/DMARC verification is scoped to the organizational domain; mail servers accept it as covering subdomains under standard "relaxed" alignment. No extra Resend setup is needed to send as `no-reply@marketplace.apps-pilot.nl` instead, if that's ever preferred.

## Q: We added the DNS records but Resend still showed the domain as unverified. Why?

Two distinct mistakes happened while setting this up, worth knowing about since they're easy to repeat:

1. **Host mismatch** — the records were first added under `*.marketplace.apps-pilot.nl` (e.g. `resend._domainkey.marketplace`) while the domain registered in Resend was the bare root `apps-pilot.nl`. DNS records for a root-domain verification must be at the root zone (`resend._domainkey`, `rsend`, `send` — no subdomain prefix).
2. **Value vs. reference confusion** — when re-adding the records at the root, the *values* got set to literal strings like `"resend._domainkey.marketplace"` / `"rsend.marketplace."` instead of the actual DKIM key / real CNAME target (`rsend-euw1.forge.rmta.net`). TXT records can't "point" to another record the way a CNAME can — the value has to be the literal content Resend shows.

Verify anytime with a public DNS lookup (works without any Resend/Plesk access):
```
curl -s "https://dns.google/resolve?name=resend._domainkey.apps-pilot.nl&type=TXT"
```
A `"Status":3` in the response means NXDOMAIN — the record isn't live yet, regardless of what any dashboard says.

## Q: SMTP was fixed and signups worked, but the confirmation email still linked to `http://localhost:3000`. Why?

Two layered bugs, found in this order:

1. **`signup()` never set `emailRedirectTo`** — `apps/web/app/signup/actions.ts` called `supabase.auth.signUp()` without it, so Supabase fell back to the project's default **Site URL**, which was still the untouched default (`http://localhost:3000`). `forgot-password/actions.ts` already had the correct pattern (build `redirectTo` from the request), signup just never got the same treatment.
2. **Even after adding `emailRedirectTo`, it was still localhost** — because Supabase validates any `redirectTo`/`emailRedirectTo` against an **allow-list** (Authentication → URL Configuration → Redirect URLs) before honoring it, and silently falls back to the default Site URL if the value isn't on that list. `https://marketplace.apps-pilot.nl/**` had to be added there too — a code fix alone wasn't sufficient.
3. **Still localhost after both of those** — the code was building the redirect URL from the `Origin` request header (`headers().get("origin")`), which turned out to be unreliable behind Plesk's reverse proxy for Server Action POSTs. Confirmed by testing: the link stayed on `localhost:3000` even with the emailRedirectTo code live and the Supabase allow-list updated. Fixed by deriving the origin from `x-forwarded-host`/`x-forwarded-proto` (or plain `Host`) instead — see `apps/web/lib/site-url.ts`. This also affected password reset and Google OAuth sign-in, which used the same fragile pattern; all three now share the one helper (`getSiteOrigin()`).

**Lesson**: don't trust `Origin` for building absolute URLs server-side behind a reverse proxy. Use `x-forwarded-host`/`x-forwarded-proto`. This same helper is now also used to build absolute Open Graph image/URL values for listing-page share previews — see [Share Feature](#share-feature).

## Q: How do we verify signup/email end-to-end without spamming a real inbox?

Use a disposable public inbox (Mailinator) with a unique timestamped address, drive the signup form with Playwright, then poll Mailinator's public JSON API:
```
curl -s "https://www.mailinator.com/api/v2/domains/public/inboxes/<inbox-name>"
```
and fetch the individual message by its `id` to inspect the actual link/content, not just "an email arrived."

## Q: Why did anonymous visitors see a "Categories" footer full of dead links on the login page?

Separate issue, found while testing: the site was (and by default still is) locked down to require sign-in for every page except a short allowlist (`/login`, `/signup`, `/help`, `/terms`, `/safety`, `/auth`, `/admin` — see `apps/web/proxy.ts`). Since `/login` is the only page an anonymous visitor can actually reach, and the global `<Footer>` component always rendered the full category list with real links, those links just bounced back to `/login` when clicked. Fixed by only rendering the category links (and skipping the query behind them) when a user is signed in — `apps/web/components/footer.tsx`.

## Q: Is the site permanently locked down to require sign-in for browsing?

No — this was a deliberate, temporary, pre-launch decision. It's now a runtime toggle: **Admin Dashboard (`/admin`) → "Require sign-in to browse"** switch, backed by an `app_settings` table (migration `20260101004100_app_settings.sql`) that `proxy.ts` reads on every request. Turning it off restores the original design (browsing is public; posting an ad, messaging, and other actions still require sign-in via their own independent page-level checks — those were never affected by this toggle). Defaults to locked-down if the settings row is ever missing or unreadable — **as of this writing the migration has not been confirmed run against the live database, so it's currently locked down by default.**

## Q: Where do the Resend/Supabase credentials live?

- `RESEND_API_KEY` — in `apps/web/.env.local` (git-ignored). Not currently consumed by app code directly; it's used as the SMTP password entered directly into the Supabase dashboard. Kept in `.env.local` for future in-app transactional email use.
- Supabase SMTP settings and the Redirect URLs allow-list live in the Supabase Dashboard only (Authentication → Settings / URL Configuration) — not in this repo, not in any env var.

---

## Admin Dashboard (`/admin`)

## Q: How do you get to the admin panel, and how is it different from a normal user login?

`/admin` is a dedicated login screen and dashboard, not a repurposed `/login`. It's explicitly exempted from the site-wide "require sign-in to browse" lockdown in `proxy.ts` so it's always reachable regardless of that toggle's state. Its login action (`apps/web/app/admin/login-action.ts`) returns the same generic error for "wrong password" and "correct password but not an admin account" — deliberately, so the login form can't be used to enumerate which accounts have admin rights.

## Q: What can an admin actually do from `/admin` right now?

Toggle **"Require sign-in to browse"** site-wide (see the Email & Auth section above), and see recent listings. It shares the same navy-to-green gradient background as `/login` (`apps/web/app/admin/page.tsx`, `apps/web/components/admin/admin-login-form.tsx`) — kept in sync deliberately after an explicit request to make the two look like one product rather than two different systems.

---

## Login/Signup Redesign

## Q: What does the current `/login` layout look like, structurally?

One full-bleed background (navy-to-green gradient with decorative blur blobs + a dot-grid pattern), not a split-screen. A centered logo, "Welcome to AfroDeals" heading, and three benefit cards (Handshake/Globe2/ShieldCheck icons from lucide) sit on the background, with the actual sign-in/sign-up card (`apps/web/components/auth/auth-card.tsx`) floating on top as an elevated frosted-glass panel (`bg-card/95 backdrop-blur-xl border-white/20 shadow-2xl ring-1 ring-black/5`). The card itself uses a pill-style sliding tab switcher between Sign in / Sign up, and icon-prefixed inputs (`auth-field.tsx`).

This went through an earlier split-screen version first; the current single-background version was an explicit request to merge the two visual layers into one.

---

## Listing & Category URL Slugs

## Q: Why do listing and category URLs look like `/listings/home-interior/kitchen-tableware/fruit-bowl-large-<uuid>` instead of just `/listings/<uuid>`?

Deliberate, site-wide feature: every listing and category URL mirrors its full breadcrumb path as human-readable slug segments, with the real UUID only on the trailing segment (modeled after Marktplaats' URL scheme). Only that trailing segment is actually parsed to look anything up — everything before it is decorative. This means a stale category name or listing title baked into a bookmarked/shared link never breaks the page; only the final id matters.

Core logic lives in `apps/web/lib/slug.ts`:
- `slugPath(name, id)` → `"slug-id"` for a single segment.
- `breadcrumbSlugPath(ancestors, finalName, finalId)` → the full mirrored path.
- `idFromSlugSegments(segments)` → pulls the id back out of a catch-all route's trailing segment via regex.

## Q: Why are `apps/web/app/listings/[...slug]/page.tsx` and `apps/web/app/categories/[...slug]/page.tsx` catch-all routes instead of `[id]`?

Because the URL now has a variable number of decorative segments in front of the id. The catch-all is the *only* part of the route that changes per request; the id-extraction logic (`idFromSlugSegments`) is what actually resolves the page.

## Q: Why does listing edit live at `/listings/edit/[id]`, not `/listings/[...slug]/edit`?

Next.js rejects nesting a static segment after a catch-all — "Catch-all must be the last part of the URL." The edit route also has no reason to carry decorative slug segments anyway (it's owner-only, never shared), so it's a plain sibling route with a bare id. Watch for this if anything ever links to the old `/listings/{id}/edit` shape — it was still turning up as a stale hardcoded link in `listing-row-actions.tsx` after the route moved, and would 404 under the new scheme (the trailing "edit" segment gets misread as if it were the id).

---

## Category Data Caching

## Q: Are category/attribute lookups cached, or hitting Supabase on every request?

Cached. `apps/web/lib/categories.ts`'s `loadCategoryNodes`, `getCategoriesAndAttributes`, and `getCategoryGallery` are all wrapped in `unstable_cache` from `next/cache` (tag: `"categories"`, 300s revalidate).

## Q: What broke when adding `unstable_cache` here, and why?

`unstable_cache` can't touch cookies/headers inside the cached function body — Next enforces this at the type level once you're inside that closure. Two things followed from that:

1. The Supabase client had to switch from the cookie-based `createClient()` to `createServiceClient()` (bypasses RLS, fine here since category/attribute data is public and identical for every visitor).
2. Anything that legitimately does vary per request — locale, in this case — has to be resolved *outside* the cached function and passed in as a plain argument, not read from `cookies()`/`headers()` inside it.

---

## Cars Search & Category Browse

## Q: What changed in the Cars category browsing/search UI?

Several incremental requests, all in `apps/web/components/cars-landing.tsx` / `cars-search-results.tsx`:
- The brand and city dropdowns were expanded to include every make/city, not a short curated list.
- A "Clear" button was added to the quick-filter form.
- "Browse by brand" (90 makes) got a show-more/show-less control (`CarsBrandGrid`) instead of always rendering all 90 at once.

`CarsBrandGrid`'s `href` per brand is precomputed server-side and passed down as a prop — category link functions (`slugPath`, etc.) can't cross the Server→Client component boundary directly, so the parent Server Component builds the URLs and hands the client component plain data.

---

## Mobile Navigation Header

## Q: Why does the mobile header use `position: fixed` with a spacer div instead of `position: sticky`?

`sticky` needs its own containing block (here, the `<header>`) to be *taller* than the sticky element for there to be any room to "stick" within. On mobile, the desktop nav row directly below is `hidden`, which contributes zero height — so the header's containing block ended up exactly as tall as the sticky bar itself, and `sticky` silently did nothing; the bar just scrolled away with the page. Confirmed via `getBoundingClientRect()` before/after scroll showing the bar's `top` moving with scroll despite `position: sticky` being applied. Fixed by switching to `position: fixed` plus a same-height spacer div directly below it, so the fixed bar doesn't overlap the content that follows.

## Q: A "Post an ad" button had a `hidden` class that wasn't hiding it on mobile. Why?

`buttonVariants()` (a `cva()` call) invoked *standalone* — not through the `<Button>` component — never passes through `cn()`'s tailwind-merge dedup. Tailwind's generated CSS put the base `inline-flex` after the utility `hidden` in stylesheet order, so `inline-flex` won even though `hidden` came later in the className string. Confirmed via an isolated `twMerge()` test: correct dedup only happened when `buttonVariants()`'s output was wrapped through `cn()` — calling it raw skips that step entirely. Fixed at that one call site by wrapping explicitly: `cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")`. Other unrelated raw `buttonVariants()` call sites elsewhere weren't touched, since they weren't combined with a conflicting utility class.

## Q: The mobile logo looked squished/distorted after being sized up. Why, and how was it fixed? (2026-08-30)

The mobile header used an equal three-column CSS grid (`grid-cols-3`, i.e. `repeat(3, minmax(0, 1fr))`) to keep the centered logo mathematically centered regardless of the hamburger and messages/notifications groups having different widths. The catch: Tailwind's grid utilities always use `minmax(0, 1fr)`, which lets a track shrink *below* its content's natural size — so when the logo (at its intended rendered height) needed more width than the equal-thirds column could give it, the browser's default `img { max-width: 100% }` (from Tailwind's Preflight reset) clamped its rendered width down to fit the column, while its explicit CSS height stayed fixed — stretching/distorting the image out of its true aspect ratio. Confirmed empirically: `getBoundingClientRect()` on the logo showed a rendered width/height ratio that didn't match `naturalWidth`/`naturalHeight`.

**Fix**: switched the mobile header from `grid grid-cols-3` to `flex justify-between`, with the logo taken out of flow entirely via `absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2` on its `<Link>`. Absolute positioning isn't constrained by a flex/grid track's width, so the logo renders at its true intrinsic proportions, while still landing dead-center on the bar regardless of the side groups' differing widths. Verified across 360–430px viewports: no distortion (rendered ratio == natural ratio, checked directly), no overflow, and 12–48px of clearance between the logo and the nearest icon at every width tested.

## Q: Why was the mobile logo cropped into a separate `logo-compact.png` instead of reusing `logo.png`?

`logo.png` (1400×474) includes a decorative swoosh curve underneath the wordmark. At the compact height needed for the mobile bar, keeping the swoosh made the whole mark read as more "squeezed" than the desktop version. `logo-compact.png` is the same source art with just the swoosh removed (painted out — see below), same 1400px-wide resolution, no downscaling.

**First attempt at this crop was wrong**: a plain top-down crop (`.extract({ top: 0, height: 388 })`) was used to cut off the swoosh, but the swoosh's vertical position overlaps the cart icon's wheels — a rectangular top-crop can't remove one without also cutting into the other, since they're at different X positions but overlapping Y ranges. That first version genuinely clipped the cart handle and dropped both wheels entirely, which is a real, visible defect (reported as "the whole logo is still not showing").

**Correct fix**: instead of cropping by height, a white rectangle was composited directly over just the swoosh's bounding box (found empirically by scanning pixel darkness per-row/column with `sharp().raw()`: swoosh occupies roughly x:520–1358, y:381–454, safely clear of both the wordmark text — which ends by y≈347 — and the cart icon, which stays under x≈460). This leaves the full cart (both wheels), the full Africa map graphic, and the full wordmark intact, with only the swoosh painted out. Result is still 1400×474 (nothing left to trim — the artwork already touches the canvas edges on every side, confirmed via `sharp().trim()` returning the same dimensions unchanged).

---

## Share Feature

## Q: How does the Share button on a listing page work?

`apps/web/components/listings/save-share-bar.tsx`'s `ShareMenu`. On a touch device it uses the browser's native Web Share API (`navigator.share()`) sheet. Everywhere else it opens a custom dropdown with WhatsApp / Facebook / X / Email / Copy link — implemented as an anchored panel (`absolute` positioned, click-outside + Escape to close), not a portal/modal.

## Q: The Share button did nothing when clicked on desktop Chrome/Edge on Windows. Why? (2026-08-30)

`navigator.share()` exists on desktop Chrome/Edge on Windows too — it isn't touch-only. When present, the original code always tried it first and only opened the custom dropdown if `navigator.share` was entirely absent from the browser. On Windows, calling it hands off to the OS-level Share flyout, which depends on Share-provider infrastructure that isn't present on every Windows install — notably **Windows Server SKUs** (confirmed on this project's own dev/deploy machine, Windows Server 2025), where the call either opens a near-empty flyout or the returned promise never settles at all (reproduced directly: an automated Playwright/Chrome click on the Share button hung for the full 30s test timeout with no dropdown ever appearing and no error thrown).

**Fix, two parts:**
1. Gate native share behind an actual touch-device check (`window.matchMedia("(pointer: coarse)").matches`) in addition to `!!navigator.share`, so desktop/mouse browsers always get the reliable custom dropdown, and native share is reserved for phones/tablets where it's genuinely well-supported.
2. Defense in depth: if `navigator.share()` *does* run and throws something other than `AbortError` (the user closing the sheet themselves), fall through to opening the dropdown instead of silently doing nothing.

## Q: How do the "AfroDeals" logo and site link end up in a shared listing? (2026-08-30)

Two different mechanisms, because different share channels behave differently:

1. **Facebook, X (and anything else that renders a link preview — iMessage, Slack, Telegram, etc.)** read Open Graph / Twitter Card meta tags directly from the shared URL; nothing the share menu itself passes matters for these. `apps/web/app/listings/[...slug]/page.tsx` now exports `generateMetadata`, setting `og:title`/`og:description`/`og:site_name` ("AfroDeals") and `og:image` (an absolute URL to `/logo.png`, built via the same `getSiteOrigin()` helper used for email redirect links — see [Email & Auth](#email--auth)), plus the matching `twitter:card = summary_large_image` fields.
2. **WhatsApp and Email** don't reliably render link previews from OG tags (WhatsApp usually does; many email clients never fetch them at all), so those two get an explicit signature appended to the share text itself: `via AfroDeals — <site origin>`, built client-side from `new URL(url).origin`. "Copy link" and the native share sheet's `url` field are left as the plain listing URL — deliberately not decorated, since that's the expected paste-into-address-bar behavior.

---

## Production Deployment & the Outage

## Q: How does a code change actually get from this repo to `https://marketplace.apps-pilot.nl`?

Build locally, upload the build via FTP — not git-triggered, not a server-side build. Full recipe (build flags, the exact `curl -K` upload pattern, restart step) lives in `agents.md` §11; don't duplicate it here, it drifts. Short version: `next.config.ts` sets `output: "standalone"`, `next build` produces a self-contained `apps/web/.next/standalone/` bundle (own `node_modules`, generated `server.js`), `public/` and `.next/static/` get copied in manually (standalone output excludes both by default), and the whole directory gets uploaded over FTP to the Plesk account's document root. **There is no SSH on this hosting plan and no FTP-triggerable restart hook** — restarting the Node app after a deploy is a manual step in Plesk → Domains → Node.js → Restart App.

## Q: Why is running `npm install`/`npm run build` directly on the Plesk server forbidden?

Confirmed the hard way: it wiped `.next/server` and `.next/static` (Next always clears its own output before rebuilding) and then failed immediately with `Couldn't find any 'pages' or 'app' directory` — a standalone deploy deliberately excludes the source `app/` directory, so a server-side build can never succeed there even before considering that the server's `@next/swc-linux-x64-gnu` native binary needs a newer glibc than the box has. Recovery in that scenario is just re-uploading `apps/web/.next/standalone` from a machine that still has it — no rebuild needed if the local copy is current.

## Q: What actually caused the extended outage across 2026-08-2x–2026-08-30, and is it fixed?

**Not fully fixed as of 2026-08-30.** Multiple distinct problems stacked on top of each other during this incident; each is individually understood, but the root blocker is still live:

1. **A server-side build attempt** (see above) wiped the live `.next/` and briefly took the site down. Recovered by re-uploading.
2. **`node_modules` got deleted at the docroot** during recovery, on the assumption it was corrupted. Restored via FTP.
3. **Plesk's "Application Startup File" was misconfigured** as `apps.js` (typo) instead of `app.js` — a real, separate misconfiguration the user fixed directly in the Plesk UI.
4. **OS-level process-limit exhaustion (`ulimit -u` — max user processes)** — the actual root cause, and the one still unresolved. Confirmed via `stderr.log` fetched over FTP: repeated `lscgid: execve():/opt/plesk/node/23/bin/node: Resource temporarily unavailable` (`EAGAIN`), meaning the server can't spawn **any** new process, Node included. This blocks the Node app from starting at all, and — as of the most recent check — has escalated to also blocking new FTP control connections outright (`ftplib` raising `EOFError` on connect, twice, with no login prompt at all). This is beyond what Plesk-panel/FTP-only access can fix; it needs the hosting provider to clear or raise the limit server-side (kill stuck processes, or a plan-level ceiling that needs raising). **No SSH access exists on this plan to investigate or clear it directly.**
5. **A leftover static `index.html`** in the document root was, at one point, being served by LiteSpeed ahead of the Node proxy (visible via static-file response headers — `Last-Modified`/`Etag`/`Accept-Ranges` instead of `X-Powered-By: Next.js`). A professional "under maintenance" page now intentionally occupies that same `index.html` as a stopgap while (4) is unresolved — if a future deploy shows a placeholder page again, check for this file resurfacing before assuming the Node app itself failed.
6. **A previous incident (2026-08-21)** had the whole site 503 because `.next/` was missing from the server entirely (root FTP listing showed `app.js`/`server.js`/`node_modules`/`public/` but no `.next/`) — `lsnode.js`'s crash-retry loop picked the new build up on its own once a complete `.next/` was re-uploaded, no manual restart needed that time.

## Q: What's the current state of the docroot, as of the last check (2026-08-30)?

Broken at the entrypoint level, not just missing a build: `app.js`, `server.js`, `package.json`, and `package-lock.json` all read **0 bytes**, and there is no `.next/` directory present at all. There's also a `git`, `apps`, `data`, `docs`, `supabase` folder and an `agents.md`/`marktplaats_structure.txt` sitting directly in the docroot alongside the app files — looks like a raw source-tree upload landed on top of (or instead of) the flattened standalone bundle at some point, rather than being deleted deliberately; left in place rather than removed, since deleting things on a live docroot without being sure of their purpose is exactly the kind of action worth confirming with the user first, and the empty entrypoint files are the actually-blocking problem, not those extra folders.

A fresh, complete standalone build (including the mobile logo, Share button, and Share-branding fixes from the same day) was rebuilt locally and an upload was attempted, but a large fraction of individual file transfers failed mid-flight (`curl: (56) response reading failed`) — consistent with the same process-exhaustion issue interfering with the FTP daemon's ability to spawn per-transfer workers. **The uploaded state should be treated as unverified/possibly partial until a clean FTP connection and a full fresh upload can be confirmed** — don't assume the last upload attempt fully replaced the broken files.

**Bottom line: the site will not come back up from any file-level fix alone.** The process-limit exhaustion needs to clear (or be cleared by the host) before the Node app — or a clean FTP re-upload — can succeed. Check `stderr.log` for whether the `execve(): Resource temporarily unavailable` lines are still recent before spending time on anything else; if they've stopped, re-attempt the full FTP upload from a current local build and restart the app in Plesk.
