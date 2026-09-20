import path from "path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// output: "standalone" produces the self-contained server.js + pruned node_modules that the Plesk
// FTP deploy needs (agents.md §11), since there's no server-side `npm install`/build step there.
// Vercel needs the exact opposite: it builds its own serverless functions from Next's regular
// output, and standalone mode's self-contained shape actively confuses Vercel's routing in a
// monorepo -- confirmed live, a build that succeeded with standalone on still 404'd on every route
// once deployed. Vercel sets its own VERCEL env var during every build, so that's what gates this.
const isVercel = !!process.env.VERCEL;

const nextConfig: NextConfig = {
  ...(isVercel
    ? {}
    : {
        output: "standalone" as const,
        // This is a monorepo (repo root -> apps/web) — without this, Next's file-tracing step
        // doesn't reliably know where the true project root is when the build runs from apps/web
        // specifically, and can emit an incomplete .next/ output — confirmed live: a local build
        // matching Vercel's Root Directory setup failed with ENOENT on
        // .next/next-server.js.nft.json, a trace file that should exist but didn't. Only relevant
        // to the standalone/Plesk path; Vercel resolves its own monorepo root from its Root
        // Directory project setting and doesn't need this.
        outputFileTracingRoot: path.join(__dirname, "../.."),
      }),
  experimental: {
    // Next's default Server Action body cap is 1MB — fine for text fields, but createListing's
    // form submits real photo files (up to MAX_PHOTOS=24, components/listings/photo-upload.tsx)
    // as part of the same FormData. Once multi-photo upload actually worked (agents.md §12), even
    // 2-3 real phone photos routinely exceeded 1MB and the whole submission failed with "Body
    // exceeded 1 MB limit" — not a fake/theoretical limit, a real user hit this. 50mb comfortably
    // covers a full 24-photo listing at a few MB each without leaving the limit effectively
    // unbounded.
    serverActions: { bodySizeLimit: "50mb" },
  },
  images: {
    remotePatterns: [
      // Demo/seed listing photos (scripts/seed-demo-listings.mjs) — remove once real listing
      // photo uploads exist and demo data is gone.
      { protocol: "https", hostname: "images.unsplash.com" },
      // Real listing photos, once upload exists (Supabase Storage public URLs).
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  // No security headers existed at all before this -- confirmed live (curl -I marketitnow.net had
  // none of these). CSP is the one genuinely risky one to get wrong (a too-strict policy silently
  // breaks real functionality) -- confirmed live even after scoping this to exactly what a grep
  // for every https:// URL in the codebase turned up: the listing page's pickup-location map is a
  // plain Google Maps iframe embed (www.google.com/maps?...&output=embed), not something grep
  // catches as cleanly as a fetch() URL, and it got silently blocked by the first version of this
  // policy until a live Playwright console-error pass caught it. (NEXT_PUBLIC_MAPBOX_TOKEN exists
  // in Vercel's env but is never actually referenced anywhere in this codebase -- leftover from an
  // abandoned integration, not a real dependency; left out of this policy on purpose.)
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        // 2 years, includes subdomains -- safe to set unconditionally since the site has been
        // HTTPS-only on Vercel from day one; there's no live HTTP variant this could break.
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        // SAMEORIGIN, not DENY -- Stripe Checkout/Connect return-navigations are same-origin, and
        // DENY would be strictly safer but has a real chance of breaking one of those without a
        // way to verify every embed path from here.
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // 'unsafe-inline'/'unsafe-eval' on scripts is broader than ideal, but Next.js's own
            // inline hydration scripts and Mapbox GL's runtime both need it -- a nonce-based CSP
            // is the tighter fix, and a real enough restructuring (every inline script in the app
            // would need it threaded through) that it belongs in its own follow-up, not bundled
            // into this first pass of "no headers at all" -> "a real, working CSP".
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com",
            "connect-src 'self' https://*.supabase.co https://api.stripe.com",
            "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://connect.stripe.com https://www.google.com",
            "object-src 'none'",
            "base-uri 'self'",
          ].join("; "),
        },
      ],
    },
  ],
  redirects: async () => {
    // Final step of the afrodeals.net -> marketitnow.net domain migration (agents.md §13). This
    // must stay off (returns []) until marketitnow.net is fully verified: attached as a domain on
    // the Vercel project, and added to Supabase Auth's Redirect URLs allow-list + Google Cloud
    // Console's OAuth redirect URIs. Flipping it on before then would redirect 100% of
    // afrodeals.net's live traffic to a domain that isn't serving anything yet, taking the whole
    // site down. Enable by setting REDIRECT_AFRODEALS_TO_MARKETITNOW=1 in Vercel's Production env
    // vars and redeploying — do not remove this gate, just satisfy it.
    if (!process.env.REDIRECT_AFRODEALS_TO_MARKETITNOW) return [];
    return [
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: "afrodeals.net" }],
        destination: "https://marketitnow.net/:path*",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
