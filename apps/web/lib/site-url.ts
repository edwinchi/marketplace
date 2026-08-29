import { headers } from "next/headers";

// The `Origin` header isn't reliably present on a Server Action POST behind Plesk's reverse proxy
// (confirmed: signup confirmation links kept resolving to the Supabase project's default Site URL
// even after building emailRedirectTo from it). x-forwarded-host/x-forwarded-proto (or plain Host)
// are what the proxy actually always sets, so derive the origin from those instead.
export async function getSiteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}
