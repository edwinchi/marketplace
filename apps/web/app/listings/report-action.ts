"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

export type ReportListingState = { sent: boolean; error: string | null };

const REASON_CODES = new Set(["prohibited_item", "scam_or_fraud", "spam", "wrong_category", "offensive_content", "already_sold", "other"]);

export async function reportListing(listingId: string, reasonCode: string, description: string): Promise<ReportListingState> {
  if (!REASON_CODES.has(reasonCode)) return { sent: false, error: "Choose a reason." };

  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return { sent: false, error: "Sign in to report a listing." };

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: profile.id,
    reported_listing_id: listingId,
    reason_code: reasonCode,
    description: description.trim() || null,
  });

  if (error) {
    console.error("reportListing failed:", error.message);
    return { sent: false, error: "Couldn't send your report — try again in a moment." };
  }
  return { sent: true, error: null };
}
