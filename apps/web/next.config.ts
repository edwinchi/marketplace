import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Self-contained build output (server.js + a pruned node_modules) — the right shape for
  // uploading via FTP to Plesk, since there's no server-side `npm install`/build step there.
  // See agents.md §11.
  output: "standalone",
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
