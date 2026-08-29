import { createServiceClient } from "./supabase/service";
import { getExchangeRates } from "./exchange-rates";
import { convertMinorUnits } from "./money";

// Every number here comes straight from the live tables via the service-role client (RLS doesn't
// scope admin reads the way it does normal user queries) -- no placeholder/sample data anywhere.
// A young, real platform has small real numbers; that's what this shows, not a padded demo.
export async function getAdminStats() {
  const supabase = createServiceClient();

  const [
    { count: totalUsers },
    { count: businessUsers },
    { count: activeListings },
    { count: deletedListings },
    { count: totalMessages },
    { count: totalConversations },
    { count: totalOffers },
    { count: totalFavorites },
    { count: totalReviews },
    { data: aiUsageRows },
    { data: activeListingPrices },
    { data: categoryBreakdownRaw },
    { data: cityBreakdownRaw },
    { data: recentListings },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("account_type", "business"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "deleted"),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("offers").select("id", { count: "exact", head: true }),
    supabase.from("favorites").select("listing_id", { count: "exact", head: true }),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("ai_photo_analysis_uses"),
    supabase.from("listings").select("price_minor, currency_code").eq("status", "active"),
    supabase
      .from("listings")
      .select("category_id, categories(category_translations(name, language_code))")
      .eq("status", "active"),
    supabase.from("listings").select("locations(city, country_code)").eq("status", "active"),
    supabase
      .from("listings")
      .select("id, title, price_minor, currency_code, status, published_at, profiles!listings_seller_id_fkey(display_name, username)")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(8),
    supabase.from("profiles").select("id, username, display_name, account_type, created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  const totalAiUses = (aiUsageRows ?? []).reduce((sum, r) => sum + (r.ai_photo_analysis_uses ?? 0), 0);

  // Real GMV-style total, converted to a single display currency (USD) via the same live
  // exchange-rate feed the storefront's own currency switcher uses -- not a fabricated figure.
  const rates = await getExchangeRates();
  let totalValueUsd = 0;
  let convertedCount = 0;
  for (const row of activeListingPrices ?? []) {
    if (!row.price_minor) continue;
    const usd = rates ? convertMinorUnits(row.price_minor, row.currency_code, "USD", rates.rates) : row.currency_code === "USD" ? row.price_minor : null;
    if (usd != null) { totalValueUsd += usd; convertedCount++; }
  }

  const categoryCounts = new Map<string, number>();
  for (const row of categoryBreakdownRaw ?? []) {
    const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    const translations = cat?.category_translations ?? [];
    const name = translations.find((t: { language_code: string; name: string }) => t.language_code === "en")?.name;
    if (!name) continue;
    categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
  }
  const topCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const cityCounts = new Map<string, number>();
  for (const row of cityBreakdownRaw ?? []) {
    const loc = Array.isArray(row.locations) ? row.locations[0] : row.locations;
    if (!loc?.city) continue;
    const key = `${loc.city}, ${loc.country_code}`;
    cityCounts.set(key, (cityCounts.get(key) ?? 0) + 1);
  }
  const topCities = [...cityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  return {
    totalUsers: totalUsers ?? 0,
    businessUsers: businessUsers ?? 0,
    privateUsers: (totalUsers ?? 0) - (businessUsers ?? 0),
    activeListings: activeListings ?? 0,
    deletedListings: deletedListings ?? 0,
    totalMessages: totalMessages ?? 0,
    totalConversations: totalConversations ?? 0,
    totalOffers: totalOffers ?? 0,
    totalFavorites: totalFavorites ?? 0,
    totalReviews: totalReviews ?? 0,
    totalAiUses,
    totalValueUsd,
    valueConvertedFrom: convertedCount,
    valueTotalActive: activeListingPrices?.length ?? 0,
    topCategories,
    topCities,
    recentListings: (recentListings ?? []).map((l) => {
      const seller = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;
      return { id: l.id, title: l.title, priceMinor: l.price_minor, currency: l.currency_code, status: l.status, publishedAt: l.published_at, sellerName: seller?.display_name || seller?.username || "Unknown" };
    }),
    recentUsers: (recentUsers ?? []).map((u) => ({ id: u.id, name: u.display_name || u.username, accountType: u.account_type, createdAt: u.created_at })),
  };
}
