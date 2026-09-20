// Cloudflare Turnstile -- free, no-payment-method-required bot-protection widget. Same
// optional-env-var pattern as every AI provider key in lib/ai-providers.ts: the feature is fully
// wired and activates automatically the moment TURNSTILE_SECRET_KEY is set in Vercel, and fails
// OPEN (never blocks a real signup/listing) until then, since an unconfigured integration should
// degrade to "no bot check yet", never to "nobody can sign up" -- same reasoning as
// lib/rate-limit.ts's own fail-open default.
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstileToken(token: string | null, remoteIp: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Not configured yet -- see file comment.
  if (!token) return false; // Configured, but the widget never handed back a token -- a real failure.

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: remoteIp }),
    });
    if (!res.ok) return true; // Cloudflare's own service hiccuping isn't the visitor's fault.
    const json = await res.json();
    return json?.success === true;
  } catch {
    return true; // Network blip -- fail open, same as above.
  }
}
