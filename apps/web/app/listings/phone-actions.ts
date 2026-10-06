"use server";

import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";

// One seller's number at a time, on an explicit click, for a signed-in user, rate-limited.
// profiles_public used to return phone_number for EVERY profile to any signed-in session, so one
// throwaway account could download the whole user base's phone numbers in a single REST call (a
// GDPR exposure, and a ready-made spam/scam list). The view now always returns null for it
// (supabase/migrations/20260101009000), and this is the only way a number leaves the server.
// Scoped to an active listing's seller, not an arbitrary profile id, so it can't be walked across
// buyers who never published their number anywhere.
const REVEALS_PER_HOUR = 30;

export async function revealSellerPhone(listingId: string): Promise<{ phone: string | null; error: string | null }> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return { phone: null, error: "Sign in to see this number." };

  if (!(await checkRateLimit(`reveal-phone:${profile.id}`, REVEALS_PER_HOUR, 3600))) {
    return { phone: null, error: "You've viewed a lot of numbers recently — try again later." };
  }

  const supabase = createServiceClient();
  const { data: listing } = await supabase.from("listings").select("seller_id, status").eq("id", listingId).maybeSingle();
  if (!listing || listing.status !== "active") return { phone: null, error: "This listing isn't available." };

  const { data: seller } = await supabase.from("profiles").select("phone_number").eq("id", listing.seller_id).maybeSingle();
  if (!seller?.phone_number) return { phone: null, error: "This seller hasn't shared a number." };

  return { phone: seller.phone_number, error: null };
}
