import { createClient } from "./server";

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
