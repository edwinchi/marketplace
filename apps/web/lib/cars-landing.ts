import { createClient } from "./supabase/server";
import { getCategoryDescendantIds } from "./categories";

export type CarsFilters = {
  type?: string;
  brand?: string;
  city?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
};

export type CarsListing = {
  id: string;
  title: string;
  price_minor: number | null;
  currency_code: string;
  locations: { city: string | null } | { city: string | null }[] | null;
  listing_media: { storage_key: string; sort_order: number }[] | null;
};

// Real attribute ids aren't hardcoded here on purpose -- attribute rows get fresh
// gen_random_uuid() ids on every fresh seed/migration run (same class of bug the footer's
// hardcoded category ids hit after the last Supabase migration), so these are looked up by
// stable_key every call instead.
async function getAttributeIds(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("attributes").select("id, stable_key").in("stable_key", ["brand", "production_year"]);
  return {
    brandId: data?.find((a) => a.stable_key === "brand")?.id ?? null,
    yearId: data?.find((a) => a.stable_key === "production_year")?.id ?? null,
  };
}

export async function getCarsLandingData(carsRootId: string, filters: CarsFilters) {
  const supabase = await createClient();

  const typeDescendantIds = filters.type ? await getCategoryDescendantIds(filters.type) : await getCategoryDescendantIds(carsRootId);

  let query = supabase
    .from("listings")
    .select(
      "id, title, price_minor, currency_code, locations!inner(city), listing_media(storage_key, sort_order)",
    )
    .eq("status", "active")
    .in("category_id", typeDescendantIds)
    .order("published_at", { ascending: false });

  if (filters.city) query = query.eq("locations.city", filters.city);
  if (filters.priceMin != null) query = query.gte("price_minor", Math.round(filters.priceMin * 100));
  if (filters.priceMax != null) query = query.lte("price_minor", Math.round(filters.priceMax * 100));

  const { data: baseListings, error } = await query.limit(48);
  if (error) console.error("Cars landing listings query failed:", error);

  let listings = (baseListings ?? []) as CarsListing[];

  // Brand/year live on listing_attribute_values (free-text brand, numeric year), not columns on
  // listings itself -- filtered in application code rather than a second embedded PostgREST join,
  // since real listing volume here is small enough that this is simpler than fighting PostgREST's
  // one-filter-per-embed limitation for two different attribute_ids on the same related table.
  if ((filters.brand || filters.yearMin != null || filters.yearMax != null) && listings.length > 0) {
    const { brandId, yearId } = await getAttributeIds(supabase);
    const attrIds = [brandId, yearId].filter((x): x is string => !!x);
    if (attrIds.length > 0) {
      const { data: attrValues } = await supabase
        .from("listing_attribute_values")
        .select("listing_id, attribute_id, value_text, value_number")
        .in("listing_id", listings.map((l) => l.id))
        .in("attribute_id", attrIds);

      const brandByListing = new Map<string, string>();
      const yearByListing = new Map<string, number>();
      for (const row of attrValues ?? []) {
        if (row.attribute_id === brandId && row.value_text) brandByListing.set(row.listing_id, row.value_text);
        if (row.attribute_id === yearId && row.value_number != null) yearByListing.set(row.listing_id, row.value_number);
      }

      listings = listings.filter((l) => {
        if (filters.brand && brandByListing.get(l.id)?.toLowerCase() !== filters.brand.toLowerCase()) return false;
        const year = yearByListing.get(l.id);
        if (filters.yearMin != null && (year == null || year < filters.yearMin)) return false;
        if (filters.yearMax != null && (year == null || year > filters.yearMax)) return false;
        return true;
      });
    }
  }

  // Real cities/makes actually represented among Cars-tree listings, not a hardcoded list -- if a
  // city or make has no listings under Cars, it just doesn't appear as a filter option.
  const allCarsDescendantIds = await getCategoryDescendantIds(carsRootId);
  const [{ data: cityRows }, { brandId }] = await Promise.all([
    supabase.from("listings").select("locations!inner(city)").eq("status", "active").in("category_id", allCarsDescendantIds),
    getAttributeIds(supabase),
  ]);
  const cities = [...new Set((cityRows ?? []).flatMap((r) => {
    const loc = Array.isArray(r.locations) ? r.locations[0] : r.locations;
    return loc?.city ? [loc.city] : [];
  }))].filter((c) => c !== "Test City").sort();

  let makes: string[] = [];
  if (brandId) {
    const { data: brandRows } = await supabase
      .from("listing_attribute_values")
      .select("value_text, listings!inner(category_id, status)")
      .eq("attribute_id", brandId)
      .not("value_text", "is", null);
    makes = [...new Set(
      (brandRows ?? [])
        .filter((r) => {
          const l = Array.isArray(r.listings) ? r.listings[0] : r.listings;
          return l?.status === "active" && allCarsDescendantIds.includes(l.category_id);
        })
        .map((r) => r.value_text as string),
    )].sort();
  }

  return { listings, cities, makes };
}
