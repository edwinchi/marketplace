"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { isSellerProSubscriber } from "@/lib/seller-pro";
import { callFreeTextModel, parseJsonResponse } from "@/lib/ai-text";
import { checkRateLimit } from "@/lib/rate-limit";
import { LISTING_TRANSLATION_TARGETS } from "@/lib/listing-translations";
import { buildTranslationPrompt, translationRowsFromParsed } from "@/lib/listing-auto-translate";

async function fetchOwnListing(listingId: string, profileId: string) {
  const supabase = await createClient();
  const { data: listing } = await supabase.from("listings").select("id, title, description, seller_id").eq("id", listingId).single();
  if (!listing || listing.seller_id !== profileId) return null;
  return { supabase, listing };
}

// Seller Pro exclusive (see lib/seller-pro.ts) -- this is the manual, user-triggered "Translate"
// button on the edit-listing page. Stores results in listing_translations rather than returning
// them for the seller to paste in themselves -- the point of "for a wider audience" is that a
// visitor in any of the site's other languages sees it automatically on the listing page itself
// (see the display-side read in app/listings/[...slug]/page.tsx), not that the seller gets a
// one-off draft. One combined AI call for every target language rather than one call per language
// -- same content/context, and cuts real AI usage (see feedback_ai_api_cost_management memory).
export async function translateListing(listingId: string): Promise<{ error: string | null }> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return { error: "Sign in to use this." };
  if (!(await isSellerProSubscriber())) {
    return { error: "Listing translation is a Seller Pro feature — see /my-account/ai-features to subscribe." };
  }
  if (!(await checkRateLimit(`translate-listing:${profile.id}`, 20, 3600))) {
    return { error: "You've used this a lot in the last hour — try again shortly." };
  }

  const found = await fetchOwnListing(listingId, profile.id);
  if (!found) return { error: "Listing not found." };
  const { supabase, listing } = found;

  const { text, error } = await callFreeTextModel(buildTranslationPrompt(listing.title, listing.description, LISTING_TRANSLATION_TARGETS), 3600);
  if (error || !text) return { error: error ?? "Couldn't translate that listing — try again." };

  const parsed = parseJsonResponse<Record<string, { title?: string; description?: string }>>(text);
  const rows = translationRowsFromParsed(parsed, LISTING_TRANSLATION_TARGETS, listingId);
  if (rows.length === 0) return { error: "Couldn't make sense of that translation — try again." };

  const { error: upsertError } = await supabase.from("listing_translations").upsert(rows);
  if (upsertError) return { error: upsertError.message };

  revalidatePath("/listings/[...slug]", "page");
  revalidatePath(`/listings/edit/${listingId}`);
  return { error: null };
}
