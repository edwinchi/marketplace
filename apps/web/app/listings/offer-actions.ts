"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { toMinorUnits } from "@/lib/money";

export type OfferFormState = { error: string | null; success?: boolean };

export async function createOffer(_prevState: OfferFormState, formData: FormData): Promise<OfferFormState> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return { error: "Sign in to make an offer." };

  const listingId = String(formData.get("listing_id") ?? "");
  const amount = Number(formData.get("amount"));
  if (!listingId || !amount || amount <= 0) return { error: "Enter a valid offer amount." };

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("seller_id, currency_code, offers_allowed")
    .eq("id", listingId)
    .single();
  if (!listing) return { error: "Listing not found." };
  if (!listing.offers_allowed) return { error: "This seller isn't accepting offers." };
  if (listing.seller_id === profile.id) return { error: "You can't make an offer on your own listing." };

  const { error } = await supabase.from("offers").insert({
    listing_id: listingId,
    buyer_id: profile.id,
    amount_minor: toMinorUnits(amount),
    currency_code: listing.currency_code,
  });
  if (error) return { error: error.message };

  revalidatePath(`/listings/${listingId}`);
  return { error: null, success: true };
}
