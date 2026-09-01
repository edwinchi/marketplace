import path from "path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Self-contained build output (server.js + a pruned node_modules) — the right shape for
  // uploading via FTP to Plesk, since there's no server-side `npm install`/build step there.
  // See agents.md §11.
  output: "standalone",
  // This is a monorepo (repo root -> apps/web) — without this, Next's file-tracing step doesn't
  // reliably know where the true project root is when the build runs from apps/web specifically
  // (e.g. Vercel with Root Directory set to apps/web), and can emit an incomplete .next/ output —
  // confirmed live: a Vercel build failed with ENOENT on .next/next-server.js.nft.json, a trace
  // file that should exist but didn't. Doesn't change the standalone output shape itself, so the
  // Plesk FTP deploy (agents.md §11) is unaffected.
  outputFileTracingRoot: path.join(__dirname, "../.."),
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
