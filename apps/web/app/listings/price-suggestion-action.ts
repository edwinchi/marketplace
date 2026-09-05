"use server";

import { createClient } from "@/lib/supabase/server";
import { isSellerProSubscriber } from "@/lib/seller-pro";

export type PriceSuggestion = { minMinor: number; medianMinor: number; maxMinor: number; count: number; currencyCode: string };

// Deliberately a real database query, not an AI call -- an LLM asked to "suggest a price" would
// either make one up outright or launder a guess through confident-sounding language, and this
// project holds "real data only" everywhere else (reviews, top categories, admin stats). A range
// computed from actual active listings is honest even when it's boring; a fabricated one isn't,
// no matter how plausible it reads. Same category + currency only (not city too) -- narrowing
// further would shrink most categories' comparable sets below the honesty threshold below.
export async function suggestPrice(categoryId: string, currencyCode: string, excludeListingId?: string): Promise<PriceSuggestion | { error: string }> {
  if (!(await isSellerProSubscriber())) {
    return { error: "Price suggestions are a Seller Pro feature — see /my-account/ai-features to subscribe." };
  }
  if (!categoryId) return { error: "Choose a category first." };

  const supabase = await createClient();
  let query = supabase
    .from("listings")
    .select("price_minor")
    .eq("category_id", categoryId)
    .eq("status", "active")
    .eq("currency_code", currencyCode)
    .not("price_minor", "is", null)
    .gt("price_minor", 0)
    .limit(200);
  if (excludeListingId) query = query.neq("id", excludeListingId);

  const { data } = await query;
  const prices = (data ?? []).map((l) => l.price_minor as number).sort((a, b) => a - b);

  // Fewer than 3 comparable listings isn't enough to call anything a "range" honestly -- a spread
  // of two prices could just be one seller pricing high and one pricing low, not a real market.
  if (prices.length < 3) {
    return { error: "Not enough similar active listings in this category yet to suggest a price range." };
  }

  return {
    minMinor: prices[0],
    medianMinor: prices[Math.floor(prices.length / 2)],
    maxMinor: prices[prices.length - 1],
    count: prices.length,
    currencyCode,
  };
}
