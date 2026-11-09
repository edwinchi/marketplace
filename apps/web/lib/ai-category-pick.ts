// Chooses a category for a listing in two steps, used by both the AI photo analysis and the
// "Find category" button on step 1 of posting an ad:
//
// 1. Shortlist: nearest categories by embedding (match_category_by_embedding), once for a short
//    "what is it" phrase and once for the listing text, merged.
// 2. Pick: a fast text model chooses one category from that numbered shortlist.
//
// Why not just take the nearest embedding: a listing's own words (a place, a brand, a film) match
// leaf categories that share the name. Confirmed live 2026-11-09: a Dutch novel set in a harbour was
// filed under Stamps & Coins › Letters and Envelopes › Netherlands, and a Harry Potter book set
// under Collectibles › Harry Potter. Tested on 24 photo-style and 28 typed-title items (en/nl/fr):
// nearest-embedding alone got 22/24 and 14/28 right; shortlist + pick got 24/24 and 28/28.
//
// The model can only answer with a number from the list, so it can't invent a category. When the
// text model or its reply fails, the shortlist's similarity order is used as is.
import { createClient } from "@/lib/supabase/server";
import { getTextEmbedding } from "@/lib/embeddings";
import { callFreeTextModel } from "@/lib/ai-text";
import { getCategoryPaths } from "@/lib/categories";
import { buildCategoryPickPrompt, buildItemPrompt, mergeShortlists, parseCategoryChoice, parseItemReply } from "@/lib/category-choice";

const ITEM_MATCHES = 8;
const TEXT_MATCHES = 6;
const MAX_CANDIDATES = 14;

async function nearestCategoryIds(text: string, count: number): Promise<string[]> {
  const embedding = await getTextEmbedding(text);
  if (!embedding) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_category_by_embedding", { query_embedding: embedding as unknown as string, match_count: count });
  if (error) console.error("match_category_by_embedding failed:", error);
  return (data ?? []).map((row) => row.id);
}

// "Roman van Herman Koch" -> "novel". Null when the text model is unavailable.
export async function describeItem(title: string): Promise<string | null> {
  const { text } = await callFreeTextModel(buildItemPrompt(title), 300);
  return parseItemReply(text);
}

// Category ids, best first. useModel=false skips step 2 (used when a seller has hit the rate limit).
export async function rankCategories(
  listing: { title: string; description?: string; item?: string | null },
  { useModel = true }: { useModel?: boolean } = {},
): Promise<string[]> {
  const listingText = listing.description ? `${listing.title}\n${listing.description}` : listing.title;
  const [byItem, byText] = await Promise.all([
    listing.item ? nearestCategoryIds(listing.item, ITEM_MATCHES) : Promise.resolve([]),
    nearestCategoryIds(listingText, TEXT_MATCHES),
  ]);
  const shortlist = mergeShortlists([byItem, byText], MAX_CANDIDATES);
  if (!useModel || shortlist.length < 2) return shortlist;

  const paths = await getCategoryPaths(shortlist, "en");
  const candidates = shortlist.filter((id) => paths.has(id));
  if (candidates.length < 2) return shortlist;

  const { text } = await callFreeTextModel(
    buildCategoryPickPrompt(listing, candidates.map((id) => paths.get(id)!.join(" › "))),
    300,
  );
  const choice = parseCategoryChoice(text, candidates.length);
  if (choice == null) return shortlist;
  const picked = candidates[choice];
  return [picked, ...shortlist.filter((id) => id !== picked)];
}
