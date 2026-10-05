import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { callFreeTextModel, parseJsonResponse } from "@/lib/ai-text";
import { slugPath } from "@/lib/slug";
import { LISTING_TRANSLATION_TARGETS } from "@/lib/listing-translations";

// Deliberately NOT a "use server" module. Everything exported from a "use server" file becomes a
// publicly POST-able Server Action endpoint, which is how translateListingForAllVisitors used to be
// reachable by anyone, unauthenticated, with an arbitrary title/description -- each call a real AI
// provider request. Living here, it's only callable from server code that imports it
// (createListing/updateListing in app/listings/actions.ts).

const LANGUAGE_NAMES: Record<string, string> = { fr: "French", nl: "Dutch" };

export function buildTranslationPrompt(title: string, description: string, targets: readonly string[]) {
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

export function translationRowsFromParsed(
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

// Background, automatic version used by createListing/updateListing (see app/listings/actions.ts)
// -- deliberately NOT gated by isSellerProSubscriber(). Per explicit request, every posted listing
// should be translated regardless of the seller's subscription tier: this is a site-wide
// SEO/reach feature (a French- or Dutch-locale visitor should be able to read any real listing,
// not just ones from paying sellers), not a per-seller productivity perk the way the manual
// button (app/listings/translate-action.ts) still is. No rate limit either -- this runs once per
// real create/update (createListing itself is rate-limited), not on a clickable button.
export async function translateListingForAllVisitors(listingId: string, title: string, description: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { text, error } = await callFreeTextModel(buildTranslationPrompt(title, description, LISTING_TRANSLATION_TARGETS), 3600);
  if (error || !text) return { error: error ?? "Couldn't translate that listing." };

  const parsed = parseJsonResponse<Record<string, { title?: string; description?: string }>>(text);
  const rows = translationRowsFromParsed(parsed, LISTING_TRANSLATION_TARGETS, listingId);
  if (rows.length === 0) return { error: "Couldn't make sense of that translation." };

  const { error: upsertError } = await supabase.from("listing_translations").upsert(rows);
  if (upsertError) return { error: upsertError.message };

  revalidatePath("/listings/[...slug]", "page");
  revalidatePath(`/listings/edit/${listingId}`);
  return { error: null };
}
