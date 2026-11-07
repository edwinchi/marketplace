# ADR-0003: Security headers, and a CSP without unsafe-eval

**Status:** Accepted (2026-11-06; wss fix 2026-11-07)

**Context:** The live site sent no security headers.

**Decision:** `next.config.ts` sets HSTS (2 years, preload), `X-Content-Type-Options`,
`X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, a `Permissions-Policy` (no camera, mic,
geolocation, usb, topics; payment only for Stripe) and a CSP that lists exactly the third
parties in use (Stripe, Turnstile, Google Maps embed, Supabase including `wss://` for Realtime).
`'unsafe-eval'` is allowed only in development. `'unsafe-inline'` for scripts stays until a
nonce-based CSP is built (risk R4, backlog E3).

**Consequences:** Any new third-party script, frame or API host must be added to the CSP, or it
is silently blocked. Check the browser console on the page that uses it (that's how the Realtime
`wss://` block was found).
