import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { getCategoriesAndAttributes } from "@/lib/categories";
import { slugPath } from "@/lib/slug";

// A fixed canonical origin, not request-derived (see lib/site-url.ts's getSiteOrigin, which is
// deliberately request-scoped for auth-redirect purposes -- a sitemap needs one stable declared
// domain regardless of which host header a crawler request happened to arrive on).
const SITE_ORIGIN = "https://afrodeals.net";

const STATIC_ROUTES = ["", "/welcome", "/help", "/terms", "/safety"];

// Only top-level categories (36 of them) are included, not the ~2,630 imported subcategories --
// most of those have no listings yet and would bloat the sitemap without real SEO value. Add
// individual subcategories here later if/when they carry real traffic.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();

  const [{ topLevelCategories }, { data: listings }] = await Promise.all([
    getCategoriesAndAttributes("en"),
    supabase.from("listings").select("id, title, updated_at").eq("status", "active").order("published_at", { ascending: false }).limit(5000),
  ]);

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

  const listingEntries: MetadataRoute.Sitemap = (listings ?? []).map((l) => ({
    url: `${SITE_ORIGIN}/listings/${slugPath(l.title, l.id)}`,
    lastModified: l.updated_at ?? undefined,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...categoryEntries, ...listingEntries];
}
