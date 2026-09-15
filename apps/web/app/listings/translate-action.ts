"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { isSellerProSubscriber } from "@/lib/seller-pro";
import { callFreeTextModel, parseJsonResponse } from "@/lib/ai-text";
import { checkRateLimit } from "@/lib/rate-limit";
import { slugPath } from "@/lib/slug";

const LANGUAGE_NAMES: Record<string, string> = { fr: "French", nl: "Dutch" };
// Every listing is authored in English (createListing hardcodes source_language: "en"), so these
// are the only real translation targets -- English itself is already what's stored on the listing
// row directly, no listing_translations row needed for it.
export const LISTING_TRANSLATION_TARGETS = ["fr", "nl"] as const;
export type ListingTranslationTarget = (typeof LISTING_TRANSLATION_TARGETS)[number];

async function fetchOwnListing(listingId: string, profileId: string) {
  const supabase = await createClient();
  const { data: listing } = await supabase.from("listings").select("id, title, description, seller_id").eq("id", listingId).single();
  if (!listing || listing.seller_id !== profileId) return null;
  return { supabase, listing };
}

function buildPrompt(title: string, description: string, targets: readonly string[]) {
  const langList = targets.map((l) => `"${l}" (${LANGUAGE_NAMES[l]})`).join(" and ");
  const exampleShape = Object.fromEntries(targets.map((l) => [l, { title: "translated title", description: "translated description" }]));
  return `Translate the following classifieds listing into ${langList}. Preserve any markdown formatting ("## " headers, "- " bullet points) exactly as structure, translating only the text. Respond with ONLY a JSON object keyed by language code, matching exactly this shape (no markdown fences, no commentary):
${JSON.stringify(exampleShape)}

Title: ${title}
Description:
"""
${description}
"""`;
}

function rowsFromParsed(
  parsed: Record<string, { title?: string; description?: string }> | null,
  targets: readonly string[],
  listingId: string,
): { listing_id: string; language_code: string; title: string; description: string; slug: string; translation_status: "published"; translated_by: "ai" }[] {
  if (!parsed) return [];
  const rows = [];
  for (const lang of targets) {
    const entry = parsed[lang];
    if (!entry?.title || !entry?.description) continue; // skip a language the model dropped rather than failing the whole batch
    const title = entry.title.slice(0, 160);
    rows.push({
      listing_id: listingId,
      language_code: lang,
      title,
      description: entry.description,
      slug: slugPath(title, listingId),
      translation_status: "published" as const,
      translated_by: "ai" as const,
    });
  }
  return rows;
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

  const { text, error } = await callFreeTextModel(buildPrompt(listing.title, listing.description, LISTING_TRANSLATION_TARGETS), 3600);
  if (error || !text) return { error: error ?? "Couldn't translate that listing — try again." };

  const parsed = parseJsonResponse<Record<string, { title?: string; description?: string }>>(text);
  const rows = rowsFromParsed(parsed, LISTING_TRANSLATION_TARGETS, listingId);
  if (rows.length === 0) return { error: "Couldn't make sense of that translation — try again." };

  const { error: upsertError } = await supabase.from("listing_translations").upsert(rows);
  if (upsertError) return { error: upsertError.message };

  revalidatePath("/listings/[...slug]", "page");
  revalidatePath(`/listings/edit/${listingId}`);
  return { error: null };
}

// Background, automatic version used by createListing/updateListing (see app/listings/actions.ts)
// -- deliberately NOT gated by isSellerProSubscriber(). Per explicit request, every posted listing
// should be translated regardless of the seller's subscription tier: this is a site-wide
// SEO/reach feature (a French- or Dutch-locale visitor should be able to read any real listing,
// not just ones from paying sellers), not a per-seller productivity perk the way the manual
// button above still is. No rate limit either -- this runs once per real create/update, not on a
// clickable button, so it's already bounded by how often people actually post/edit listings.
export async function translateListingForAllVisitors(listingId: string, title: string, description: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { text, error } = await callFreeTextModel(buildPrompt(title, description, LISTING_TRANSLATION_TARGETS), 3600);
  if (error || !text) return { error: error ?? "Couldn't translate that listing." };

  const parsed = parseJsonResponse<Record<string, { title?: string; description?: string }>>(text);
  const rows = rowsFromParsed(parsed, LISTING_TRANSLATION_TARGETS, listingId);
  if (rows.length === 0) return { error: "Couldn't make sense of that translation." };

  const { error: upsertError } = await supabase.from("listing_translations").upsert(rows);
  if (upsertError) return { error: upsertError.message };

  revalidatePath("/listings/[...slug]", "page");
  revalidatePath(`/listings/edit/${listingId}`);
  return { error: null };
}
