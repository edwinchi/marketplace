import { headers } from "next/headers";

// The one customer-facing address (owner's rule, agents.md §13). Every link production generates
// (signup/reset emails, OAuth redirectTo, Stripe success/cancel URLs, share links) uses it, whatever
// host the request came in on, so nothing ever points customers at afrodeals.net, a *.vercel.app
// URL or the retired Plesk host. It also closes Host-header link poisoning: a request with a forged
// Host / X-Forwarded-Host can no longer make a password-reset email link to someone else's domain.
export const CANONICAL_ORIGIN = "https://marketitnow.net";

// Outside production (local dev, Vercel previews) links follow the request host so they stay
// testable. x-forwarded-host/x-forwarded-proto first: the `Origin` header isn't reliably present
// on a Server Action POST behind a reverse proxy (confirmed on the old Plesk host: signup links
// fell back to Supabase's default Site URL).
export async function getSiteOrigin() {
  if (process.env.VERCEL_ENV === "production") return CANONICAL_ORIGIN;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}
