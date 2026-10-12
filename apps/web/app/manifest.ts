import type { MetadataRoute } from "next";

// Makes the site installable on a phone's home screen -- this manifest is what Android/desktop
// Chrome and Edge read for their real install prompt (surfaced by components/pwa/install-app.tsx
// on /app), and what iOS Safari reads for Share -> Add to Home Screen. app/icon.png and
// app/apple-icon.png cover the favicon and apple-touch-icon conventions separately; apple-icon is
// deliberately opaque white, since iOS fills a transparent home-screen icon's background with black.
// The service worker (public/sw.js, registered by components/pwa/service-worker-register.tsx)
// adds the offline fallback page on top of this.
//
// /manifest.webmanifest is in proxy.ts's PUBLIC_PATHS -- without that, a signed-out visitor's
// browser was redirected to /login when fetching it while "require login" is on, so the site
// silently wasn't installable for exactly the people most worth reaching.
export default function manifest(): MetadataRoute.Manifest {
  return {
    // A stable id means a future start_url change doesn't make browsers treat it as a new app.
    id: "/",
    name: "MarketitNow",
    short_name: "MarketitNow",
    description: "Buy and sell from anywhere in the world.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    // Matches --primary in app/globals.css -- the brand's actual orange/gold, not a placeholder.
    theme_color: "#e89818",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Artwork shrunk into the centre safe zone, so Android's circle/squircle mask doesn't clip
      // the cart handle the way it would with the edge-to-edge icon above.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home-screen icon (Android) for these.
    shortcuts: [
      { name: "Post an ad", url: "/listings/new", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Messages", url: "/messages", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Favorites", url: "/my-account/favorites", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
