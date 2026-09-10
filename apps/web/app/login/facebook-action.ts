"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";

// Mirrors google-action.ts exactly. Requires the Facebook provider to be configured in the
// Supabase dashboard (Authentication -> Providers -> Facebook, with a real Meta App ID/Secret) --
// the code path itself is complete: once that's configured, this works with no further changes.
export async function signInWithFacebook() {
  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=facebook_not_configured");
  redirect(data.url);
}
