"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";

// Requires the Google provider to be configured in the Supabase dashboard (Authentication ->
// Providers -> Google, with a real Google Cloud OAuth Client ID/Secret) — confirmed live and
// working as of 2026-09-14 (Supabase's /auth/v1/settings reports google:true and its
// /authorize endpoint returns a valid Google consent-screen redirect for both marketitnow.net
// and afrodeals.net).
export async function signInWithGoogle(next: string) {
  // Only a same-site relative path is honored — see the identical check in login/page.tsx.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}` },
  });
  if (error || !data.url) redirect("/login?error=google_not_configured");
  redirect(data.url);
}
