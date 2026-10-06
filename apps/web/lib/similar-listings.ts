import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export const SIMILAR_LISTING_SELECT = "id, title, price_minor, currency_code, locations(city), listing_media(storage_key, sort_order)";

// "Similar listings" under a listing page -- Marktplaats shows comparable ads under every ad, and a
// buyer who lands on one listing from search is the most likely person to want the next one.
// Ranked by meaning first: the listing's own title_embedding (written for every listing, see
// app/listings/actions.ts's enqueueEmbedding) fed back through match_listings_by_embedding, kept to
// the same category so "iPhone 13" suggests phones, not phone cases. Topped up with the newest
// listings in that category when a listing has no embedding yet or too few semantic neighbours.
// Request-scoped client on purpose: listing_read RLS already limits everything to active listings.
export async function getSimilarListings(supabase: Client, listingId: string, categoryId: string, limit = 12) {
  let ids: string[] = [];

  const { data: self } = await supabase.from("listings").select("title_embedding").eq("id", listingId).maybeSingle();
  if (self?.title_embedding) {
    const { data: matches } = await supabase.rpc("match_listings_by_embedding", {
      query_embedding: self.title_embedding,
      filter_category_ids: [categoryId],
      match_count: limit + 1,
    });
    ids = (matches ?? []).map((m) => m.id).filter((id) => id !== listingId).slice(0, limit);
  }

  if (ids.length < limit) {
    const { data: newest } = await supabase
      .from("listings")
      .select("id")
      .eq("status", "active")
      .eq("category_id", categoryId)
      .not("id", "in", `(${[listingId, ...ids].join(",")})`)
      .order("published_at", { ascending: false })
      .limit(limit - ids.length);
    ids = [...ids, ...(newest ?? []).map((l) => l.id)];
  }

  if (ids.length === 0) return [];
  const { data: rows } = await supabase.from("listings").select(SIMILAR_LISTING_SELECT).in("id", ids).eq("status", "active");
  const rank = new Map(ids.map((id, i) => [id, i]));
  return [...(rows ?? [])].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
}
