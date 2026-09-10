"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { isSellerProSubscriber } from "@/lib/seller-pro";
import { callFreeTextModel, parseJsonResponse } from "@/lib/ai-text";
import { checkRateLimit } from "@/lib/rate-limit";
import { slugPath } from "@/lib/slug";

const LANGUAGE_NAMES: Record<string, string> = { en: "English", fr: "French" };

// Seller Pro exclusive (see lib/seller-pro.ts). Stores the result in listing_translations rather
// than returning it for the seller to paste in themselves -- the point of "for a wider audience"
// is that a French-locale visitor sees it automatically on the listing page itself (see the
// display-side read in app/listings/[...slug]/page.tsx), not that the seller gets a one-off draft.
//
// Rate limit added for the same reason polish-description-action.ts has one -- this had no cap of
// any kind, so a signed-in subscriber (or every signed-in user, if the admin's
// seller_pro_global_unlock toggle is on) could call it an unlimited number of times. 20/hour per
// account covers legitimately re-translating several real listings in a session.
export async function translateListing(listingId: string, targetLang: "en" | "fr"): Promise<{ error: string | null }> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return { error: "Sign in to use this." };
  if (!(await isSellerProSubscriber())) {
    return { error: "Listing translation is a Seller Pro feature — see /my-account/ai-features to subscribe." };
  }
  if (!(await checkRateLimit(`translate-listing:${profile.id}`, 20, 3600))) {
    return { error: "You've used this a lot in the last hour — try again shortly." };
  }

  const supabase = await createClient();
  const { data: listing } = await supabase.from("listings").select("id, title, description, seller_id").eq("id", listingId).single();
  if (!listing || listing.seller_id !== profile.id) return { error: "Listing not found." };

  const prompt = `Translate the following classifieds listing into ${LANGUAGE_NAMES[targetLang]}. Preserve any markdown formatting ("## " headers, "- " bullet points) exactly as structure, translating only the text. Respond with ONLY a JSON object with exactly these keys: {"title": "translated title", "description": "translated description"} — no markdown fences, no commentary.

Title: ${listing.title}
Description:
"""
${listing.description}
"""`;

  const { text, error } = await callFreeTextModel(prompt, 900);
  if (error || !text) return { error: error ?? "Couldn't translate that listing — try again." };

  const parsed = parseJsonResponse<{ title?: string; description?: string }>(text);
  if (!parsed) return { error: "Couldn't make sense of that translation — try again." };
  if (!parsed.title || !parsed.description) return { error: "That translation came back incomplete — try again." };

  const title = parsed.title.slice(0, 160);
  const { error: upsertError } = await supabase.from("listing_translations").upsert({
    listing_id: listingId,
    language_code: targetLang,
    title,
    description: parsed.description,
    slug: slugPath(title, listingId),
    translation_status: "published",
    translated_by: "ai",
  });
  if (upsertError) return { error: upsertError.message };

  revalidatePath("/listings/[...slug]", "page");
  revalidatePath(`/listings/edit/${listingId}`);
  return { error: null };
}
