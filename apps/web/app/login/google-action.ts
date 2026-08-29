"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";

// Requires the Google provider to be configured in the Supabase dashboard (Authentication ->
// Providers -> Google, with a real Google Cloud OAuth Client ID/Secret) — agents.md §8 tracks
// this as an outstanding account/credential to set up. The code path itself is complete: once
// that's configured, this works with no further changes.
export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=google_not_configured");
  redirect(data.url);
}
