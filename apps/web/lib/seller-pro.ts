import { getCurrentUserAndProfile } from "./supabase/profile";
import { createClient } from "./supabase/server";
import { isAdminEmail } from "./admin";
import { getSellerProGlobalUnlockSetting } from "./app-settings";
import { isAiFreePeriodActive } from "./ai-free-period";

// Shared gate for the AI features that are Seller Pro-exclusive (description polish, price
// suggestion, translation, performance insights) -- unlike photo autofill, these have no free
// tier at all, matching /my-account/ai-features' own copy ("every AI feature below" is a Seller
// Pro perk, not something a free/top-up account gets a few tries at). Same admin bypass as
// analyze-photo-action.ts's usageFromRow, for the same reason: admins verify features without
// needing a real subscription. Also checks the admin-flippable global unlock (see
// app_settings.seller_pro_global_unlock) -- a signed-in seller with no subscription still gets in
// while that's on, e.g. to make listing translation feel site-wide without every seller actually
// subscribing.
export async function isSellerProSubscriber(): Promise<boolean> {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return false;
  if (isAdminEmail(user.email)) return true;
  if (await getSellerProGlobalUnlockSetting()) return true;

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("ai_subscription_status").eq("id", profile.id).single();
  return data?.ai_subscription_status === "active";
}

// The Seller Pro AI features (polish, price suggestion, translation, seller insights): open to
// every signed-in account during the free AI period (lib/ai-free-period.ts), then back to Seller
// Pro only. Use isSellerProSubscriber() instead for paid perks that aren't AI -- e.g. the new-listing
// broadcast in app/listings/actions.ts must not switch on for everyone during the free period.
export async function canUseSellerProAi(): Promise<boolean> {
  if (isAiFreePeriodActive()) {
    const { user, profile } = await getCurrentUserAndProfile();
    return !!user && !!profile;
  }
  return isSellerProSubscriber();
}
