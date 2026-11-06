import { cache } from "react";
import { createClient } from "./server";

// Uncached: Server Actions and route handlers use this, because some of them change the session
// or the profile and must then read the new state within the same request.
export async function getCurrentUserAndProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, account_type, website_url")
    .eq("auth_user_id", user.id)
    .single();

  return { user, profile };
}

// Rendering only (pages, layouts, Server Components): memoised per request with React cache(),
// so the header, footer, layout and page share ONE auth check + profile query. Before this each
// of them ran its own: 3-4 identical Supabase round trips per signed-in page view.
export const getCurrentUserAndProfileForRender = cache(getCurrentUserAndProfile);
