import { getCurrentUserAndProfile } from "./supabase/profile";
import { createClient } from "./supabase/server";
import { isAdminEmail } from "./admin";

// Shared gate for the AI features that are Seller Pro-exclusive (description polish, price
// suggestion, translation, performance insights) -- unlike photo autofill, these have no free
// tier at all, matching /my-account/ai-features' own copy ("every AI feature below" is a Seller
// Pro perk, not something a free/top-up account gets a few tries at). Same admin bypass as
// analyze-photo-action.ts's usageFromRow, for the same reason: admins verify features without
// needing a real subscription.
export async function isSellerProSubscriber(): Promise<boolean> {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return false;
  if (isAdminEmail(user.email)) return true;

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("ai_subscription_status").eq("id", profile.id).single();
  return data?.ai_subscription_status === "active";
}
