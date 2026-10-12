"use client";

import { useEffect } from "react";
import { captureInstallPrompt } from "@/lib/pwa-install";

// Mounted once in app/layout.tsx. Registers public/sw.js (offline fallback + static-asset cache)
// and starts listening for the browser's install prompt as early as possible -- see
// lib/pwa-install.ts for why that can't wait until the /app page mounts.
//
// Production only: in `next dev`, a service worker caching /_next/static/ would fight hot reload,
// and a stale worker left behind in a dev browser profile is a confusing thing to debug.
export function ServiceWorkerRegister() {
  useEffect(() => {
    captureInstallPrompt();
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.error("Service worker registration failed", err);
    });
  }, []);
  return null;
}
