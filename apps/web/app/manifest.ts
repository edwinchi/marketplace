import type { MetadataRoute } from "next";

// Makes the site installable on a phone's home screen (Add to Home Screen / PWA install prompt)
// -- app/icon.png already gives every page a favicon via Next's own icon.png convention, and
// app/apple-icon.png covers Apple's separate apple-touch-icon convention; this manifest is what
// browsers actually read for the install prompt itself, standalone display, and theme colour.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MarketitNow",
    short_name: "MarketitNow",
    description: "Buy and sell from anywhere in the world.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    // Matches --primary in app/globals.css -- the brand's actual orange/gold, not a placeholder.
    theme_color: "#e89818",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
