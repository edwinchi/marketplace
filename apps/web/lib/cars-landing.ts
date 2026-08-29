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
  mileageMin?: number;
  mileageMax?: number;
  fuelType?: string[];
  transmission?: string[];
  condition?: string[];
  sellerType?: "private" | "business";
  priceType?: "fixed" | "bidding";
  page?: number;
};

export type CarsListing = {
  id: string;
  title: string;
  price_minor: number | null;
  currency_code: string;
  price_type: string;
  published_at: string | null;
  city: string | null;
  photoStorageKey: string | null;
  seller: { name: string; websiteUrl: string | null; accountType: string | null };
  brand: string | null;
  year: number | null;
  mileage: number | null;
  fuelType: string | null;
  transmission: string | null;
  condition: string | null;
};

const FACET_ATTRIBUTE_KEYS = ["brand", "production_year", "mileage", "fuel_type", "transmission", "condition"] as const;
const PAGE_SIZE = 10;

async function getAttributeMeta(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: attrs } = await supabase.from("attributes").select("id, stable_key").in("stable_key", FACET_ATTRIBUTE_KEYS);
  const idByKey = new Map((attrs ?? []).map((a) => [a.stable_key, a.id]));
  const { data: options } = await supabase
    .from("attribute_options")
    .select("id, stable_key, attribute_id, attribute_option_translations(label, language_code)")
    .in("attribute_id", [...idByKey.values()]);
  const optionLabelById = new Map(
    (options ?? []).map((o) => [
      o.id,
      o.attribute_option_translations?.find((t) => t.language_code === "en")?.label ?? o.stable_key,
    ]),
  );
  return { idByKey, optionLabelById };
}

function firstOf<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function getCarsLandingData(carsRootId: string, filters: CarsFilters) {
  const supabase = await createClient();

  const scopeIds = filters.type ? await getCategoryDescendantIds(filters.type) : await getCategoryDescendantIds(carsRootId);

  let query = supabase
    .from("listings")
    .select(
      "id, title, price_minor, currency_code, price_type, published_at, locations!inner(city), listing_media(storage_key, sort_order), profiles!listings_seller_id_fkey(display_name, username, website_url, account_type)",
    )
    .eq("status", "active")
    .in("category_id", scopeIds);

  if (filters.city) query = query.eq("locations.city", filters.city);
  if (filters.priceMin != null) query = query.gte("price_minor", Math.round(filters.priceMin * 100));
  if (filters.priceMax != null) query = query.lte("price_minor", Math.round(filters.priceMax * 100));
  if (filters.priceType) query = query.eq("price_type", filters.priceType);

  const { data: rawListings, error } = await query.order("published_at", { ascending: false }).limit(500);
  if (error) console.error("Cars landing listings query failed:", error);

  const { idByKey, optionLabelById } = await getAttributeMeta(supabase);
  const attrIds = [...idByKey.values()];
  const idToKey = new Map([...idByKey.entries()].map(([k, v]) => [v, k]));

  const listingIds = (rawListings ?? []).map((l) => l.id);
  const { data: attrValues } = attrIds.length && listingIds.length
    ? await supabase
        .from("listing_attribute_values")
        .select("listing_id, attribute_id, value_text, value_number, value_option_id")
        .in("listing_id", listingIds)
        .in("attribute_id", attrIds)
    : { data: [] as { listing_id: string; attribute_id: string; value_text: string | null; value_number: number | null; value_option_id: string | null }[] };

  const facetsByListing = new Map<string, { brand: string | null; year: number | null; mileage: number | null; fuelType: string | null; transmission: string | null; condition: string | null }>();
  for (const row of attrValues ?? []) {
    const key = idToKey.get(row.attribute_id);
    if (!key) continue;
    const entry = facetsByListing.get(row.listing_id) ?? { brand: null, year: null, mileage: null, fuelType: null, transmission: null, condition: null };
    if (key === "brand") entry.brand = row.value_text;
    if (key === "production_year") entry.year = row.value_number;
    if (key === "mileage") entry.mileage = row.value_number;
    if (key === "fuel_type" && row.value_option_id) entry.fuelType = optionLabelById.get(row.value_option_id) ?? null;
    if (key === "transmission" && row.value_option_id) entry.transmission = optionLabelById.get(row.value_option_id) ?? null;
    if (key === "condition" && row.value_option_id) entry.condition = optionLabelById.get(row.value_option_id) ?? null;
    facetsByListing.set(row.listing_id, entry);
  }

  const all: CarsListing[] = (rawListings ?? []).map((l) => {
    const facets = facetsByListing.get(l.id) ?? { brand: null, year: null, mileage: null, fuelType: null, transmission: null, condition: null };
    const seller = firstOf(l.profiles);
    const media = [...(l.listing_media ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: l.id,
      title: l.title,
      price_minor: l.price_minor,
      currency_code: l.currency_code,
      price_type: l.price_type,
      published_at: l.published_at,
      city: firstOf(l.locations)?.city ?? null,
      photoStorageKey: media?.storage_key ?? null,
      seller: { name: seller?.display_name || seller?.username || "Seller", websiteUrl: seller?.website_url ?? null, accountType: seller?.account_type ?? null },
      ...facets,
    };
  });

  // Facet counts computed over the full category-scope set (before brand/fuel/etc filters) --
  // matches what most faceted search UIs show: "how many results if you add this filter", not
  // "how many results remain in an already-narrowed set".
  const countBy = <T,>(pick: (l: CarsListing) => T | null) => {
    const counts = new Map<string, number>();
    for (const l of all) {
      const v = pick(l);
      if (v == null || v === "") continue;
      const key = String(v);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };
  const brandCounts = countBy((l) => l.brand);
  const fuelTypeCounts = countBy((l) => l.fuelType);
  const transmissionCounts = countBy((l) => l.transmission);
  const conditionCounts = countBy((l) => l.condition);
  const sellerTypeCounts = countBy((l) => l.seller.accountType);

  const filtered = all.filter((l) => {
    if (filters.brand && l.brand?.toLowerCase() !== filters.brand.toLowerCase()) return false;
    if (filters.yearMin != null && (l.year == null || l.year < filters.yearMin)) return false;
    if (filters.yearMax != null && (l.year == null || l.year > filters.yearMax)) return false;
    if (filters.mileageMin != null && (l.mileage == null || l.mileage < filters.mileageMin)) return false;
    if (filters.mileageMax != null && (l.mileage == null || l.mileage > filters.mileageMax)) return false;
    if (filters.fuelType?.length && (!l.fuelType || !filters.fuelType.includes(l.fuelType))) return false;
    if (filters.transmission?.length && (!l.transmission || !filters.transmission.includes(l.transmission))) return false;
    if (filters.condition?.length && (!l.condition || !filters.condition.includes(l.condition))) return false;
    if (filters.sellerType && l.seller.accountType !== filters.sellerType) return false;
    return true;
  });

  const page = Math.max(1, filters.page ?? 1);
  const totalMatches = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalMatches / PAGE_SIZE));
  const listings = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Real cities/makes actually represented among the whole Cars tree (not just the current
  // type-filtered scope), for the site-wide "browse by city"/"browse by brand" sections.
  const allCarsDescendantIds = await getCategoryDescendantIds(carsRootId);
  const { data: cityRows } = await supabase.from("listings").select("locations!inner(city)").eq("status", "active").in("category_id", allCarsDescendantIds);
  const cities = [...new Set((cityRows ?? []).flatMap((r) => {
    const loc = firstOf(r.locations);
    return loc?.city ? [loc.city] : [];
  }))].filter((c) => c !== "Test City").sort().slice(0, 33);

  const brandId = idByKey.get("brand");
  let siteWideMakes: string[] = [];
  if (brandId) {
    const { data: brandRows } = await supabase
      .from("listing_attribute_values")
      .select("value_text, listings!inner(category_id, status)")
      .eq("attribute_id", brandId)
      .not("value_text", "is", null);
    siteWideMakes = [...new Set(
      (brandRows ?? [])
        .filter((r) => {
          const l = firstOf(r.listings);
          return l?.status === "active" && allCarsDescendantIds.includes(l.category_id);
        })
        .map((r) => r.value_text as string),
    )].sort();
  }

  return {
    listings,
    totalMatches,
    totalUnfiltered: all.length,
    page,
    totalPages,
    cities,
    makes: siteWideMakes,
    brandCounts,
    fuelTypeCounts,
    transmissionCounts,
    conditionCounts,
    sellerTypeCounts,
  };
}
