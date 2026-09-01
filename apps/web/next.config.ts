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
};

export default withNextIntl(nextConfig);
