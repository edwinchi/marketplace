"use client";

import { useEffect } from "react";

// Fires once per page load, mounted once in the root layout so it covers every real page render
// site-wide. keepalive lets the request finish even if the visitor navigates away or closes the
// tab immediately -- otherwise a fast bounce would silently undercount. Renders nothing; this is
// pure telemetry, see app/api/track-visit/route.ts for what actually decides whether it's a new
// count for today.
export function VisitTracker() {
  useEffect(() => {
    fetch("/api/track-visit", { method: "POST", keepalive: true }).catch(() => {});
  }, []);
  return null;
}
