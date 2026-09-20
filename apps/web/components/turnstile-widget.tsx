"use client";

import Script from "next/script";

// Renders nothing at all when the site key isn't set -- matches lib/turnstile.ts's own fail-open
// stance server-side (an unconfigured integration should be invisible, not a broken empty box).
// NEXT_PUBLIC_TURNSTILE_SITE_KEY is inlined at build time like every other NEXT_PUBLIC_ var in
// this app, safe to read directly in a Client Component -- it's the public half of the pair, not
// the secret used for server-side verification (lib/turnstile.ts's TURNSTILE_SECRET_KEY).
//
// Implicit rendering (a plain .cf-turnstile div, no imperative render() call) -- Cloudflare's own
// script scans the DOM for it once loaded, which is simpler and more resilient across Next's
// client-side navigations than manually managing a widget id/lifecycle. The div's own name
// ("cf-turnstile-response") is what lands in the surrounding <form>'s FormData on submit, read
// server-side by verifyTurnstileToken.
export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" />
    </>
  );
}
