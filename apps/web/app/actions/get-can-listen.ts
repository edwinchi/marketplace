"use server";

import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getListenFreeAccessSetting } from "@/lib/app-settings";

// Listen (read-aloud) is a Seller Pro perk -- the same "unlimited" entitlement
// analyze-photo-action.ts already checks for the AI photo-analysis cap, admins included, rather
// than inventing a second concept. A Server Action (not a prop threaded down from each page) so
// ListenButton stays a single self-contained component usable from both server pages (welcome,
// help, terms, safety) and the one client page it's also placed on (feedback) without needing
// page-specific data-fetching plumbing everywhere it's dropped in.
export async function getCanListen(): Promise<boolean> {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return false;
  if (isAdminEmail(user.email)) return true;

  // Admin-flippable promotional override (see lib/app-settings.ts) -- while on, every signed-in
  // user gets Listen regardless of subscription status, no per-account changes needed.
  if (await getListenFreeAccessSetting()) return true;

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("ai_subscription_status").eq("id", profile.id).single();
  return data?.ai_subscription_status === "active";
}
