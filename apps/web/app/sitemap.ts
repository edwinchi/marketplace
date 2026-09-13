import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { getCategoriesAndAttributes } from "@/lib/categories";
import { TARGET_CITIES } from "@/lib/target-cities";
import { slugPath } from "@/lib/slug";

// A fixed canonical origin, not request-derived (see lib/site-url.ts's getSiteOrigin, which is
// deliberately request-scoped for auth-redirect purposes -- a sitemap needs one stable declared
// domain regardless of which host header a crawler request happened to arrive on).
const SITE_ORIGIN = "https://marketitnow.net";

const STATIC_ROUTES = ["", "/welcome", "/help", "/terms", "/safety"];

// All 36 top-level categories are included unconditionally (they're real, permanent landing
// pages regardless of current listing count), plus any of the ~2,630 imported subcategories that
// actually carry at least one active listing right now -- most don't yet, and indexing an empty
// subcategory page is exactly the kind of thin-content page that drags down a site's overall
// crawl-quality signal in Google's eyes. This list grows on its own as real listings land in new
// subcategories, with nothing to maintain by hand.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();

  const [{ topLevelCategories }, { data: listings }, { data: activeCategoryIds }] = await Promise.all([
    getCategoriesAndAttributes("en"),
    supabase.from("listings").select("id, title, updated_at").eq("status", "active").order("published_at", { ascending: false }).limit(5000),
    // Distinct category_ids carrying at least one real active listing -- of the ~2,630 imported
    // subcategories, most have none yet (see comment below); indexing those would be exactly the
    // kind of thin/empty-content page that hurts a site's overall crawl quality signal, so this
    // only surfaces the ones that actually have something to show a visitor or a crawler.
    supabase.from("listings").select("category_id").eq("status", "active"),
  ]);
  const topLevelIds = new Set(topLevelCategories.map((c) => c.id));
  const subcategoryIdsWithListings = [...new Set((activeCategoryIds ?? []).map((r) => r.category_id).filter((id) => !topLevelIds.has(id)))];

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_ORIGIN}${path}`,
    changeFrequency: path === "" ? "hourly" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));

  const categoryEntries: MetadataRoute.Sitemap = topLevelCategories.map((c) => ({
    url: `${SITE_ORIGIN}/categories/${slugPath(c.label, c.id)}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // idFromSlugParam only ever looks at the trailing UUID (lib/slug.ts) -- every segment before it
  // is purely decorative -- so a subcategory URL only needs the subcategory's own name+id, not the
  // full ancestor chain, exactly like the top-level entries above.
  const { data: subcategoryNames } =
    subcategoryIdsWithListings.length > 0
      ? await supabase.from("category_translations").select("category_id, name").eq("language_code", "en").in("category_id", subcategoryIdsWithListings)
      : { data: [] };
  const subcategoryEntries: MetadataRoute.Sitemap = (subcategoryNames ?? []).map((c) => ({
    url: `${SITE_ORIGIN}/categories/${slugPath(c.name, c.category_id)}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const cityEntries: MetadataRoute.Sitemap = TARGET_CITIES.map((c) => ({
    url: `${SITE_ORIGIN}/cities/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const listingEntries: MetadataRoute.Sitemap = (listings ?? []).map((l) => ({
    url: `${SITE_ORIGIN}/listings/${slugPath(l.title, l.id)}`,
    lastModified: l.updated_at ?? undefined,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...categoryEntries, ...subcategoryEntries, ...cityEntries, ...listingEntries];
}
