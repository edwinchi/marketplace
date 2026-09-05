import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { getCategoriesAndAttributes, getCategoryDescendantIds } from "@/lib/categories";
import { getTextEmbedding } from "@/lib/embeddings";
import { slugPath } from "@/lib/slug";
import { ListingGrid } from "@/components/listing-grid";
import { CategoryQuickNav } from "@/components/category-quicknav";
import { saveSearch } from "@/app/my-account/saved-searches/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; city?: string }>;
}) {
  const { q, category, city } = await searchParams;
  const supabase = await createClient();
  const { profile } = await getCurrentUserAndProfile();
  const t = await getTranslations("Home");

  // Filtering by an embedded resource's column (locations.city) requires an inner join in
  // PostgREST's embed syntax — a plain left-embed silently ignores that filter.
  const listingSelect = city
    ? "id, title, price_minor, currency_code, locations!inner(city), listing_media(storage_key, sort_order)"
    : "id, title, price_minor, currency_code, locations(city), listing_media(storage_key, sort_order)";
  let query = supabase
    .from("listings")
    .select(listingSelect)
    .eq("status", "active")
    .order("published_at", { ascending: false })
    .limit(90);

  const categoryIds = category && category !== "all" ? await getCategoryDescendantIds(category) : null;
  if (categoryIds) {
    // Match the category itself and every descendant — a listing tagged under a leaf like "Cars >
    // Passenger cars" should still show up when filtering by the top-level "Cars".
    query = query.in("category_id", categoryIds);
  }
  if (city) query = query.ilike("locations.city", city);
  if (q) {
    // Commas would otherwise break PostgREST's .or() filter syntax.
    const term = q.replaceAll(",", " ").replaceAll("%", "");
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const [{ data: listings }, { categoryOptions, topLevelCategories }, { data: favorites }] = await Promise.all([
    query,
    getCategoriesAndAttributes(),
    profile
      ? supabase.from("favorites").select("listing_id").eq("profile_id", profile.id)
      : Promise.resolve({ data: [] as { listing_id: string }[] | null }),
  ]);
  const favoritedIds = new Set((favorites ?? []).map((f) => f.listing_id));
  const selectedCategory = categoryOptions.find((c) => c.id === category);

  // Semantic search: surfaces listings that mean the same thing as the query without sharing its
  // exact words (e.g. "phone" -> "smartphone"/"iPhone" listings) as a "related" tier below the
  // keyword matches above, rather than replacing them — a plain substring match on an exact brand
  // or model name is still the more precise result and should stay first. Skipped entirely (no
  // fabricated "related" section) whenever there's no query, or the embedding call fails/isn't
  // configured -- see lib/embeddings.ts's own best-effort design.
  let relatedListings: NonNullable<typeof listings> = [];
  if (q) {
    const matchedIds = new Set((listings ?? []).map((l) => l.id));
    const embedding = await getTextEmbedding(q);
    if (embedding) {
      const { data: matches } = await supabase.rpc("match_listings_by_embedding", {
        query_embedding: embedding as unknown as string,
        filter_category_ids: categoryIds,
        filter_city: city || null,
        match_count: 30,
      });
      const relatedIds = (matches ?? []).map((m) => m.id).filter((id) => !matchedIds.has(id));
      if (relatedIds.length > 0) {
        const { data: relatedRows } = await supabase.from("listings").select(listingSelect).in("id", relatedIds);
        const rankById = new Map((matches ?? []).map((m, i) => [m.id, i]));
        relatedListings = [...(relatedRows ?? [])].sort((a, b) => (rankById.get(a.id) ?? 0) - (rankById.get(b.id) ?? 0));
      }
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Search hero */}
      <div className="border-b bg-linear-to-b from-muted/60 to-muted/20">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-7 sm:px-6 lg:px-8">
          <form className="flex flex-col gap-2 rounded-xl border bg-background p-2 shadow-sm sm:flex-row sm:items-center">
            <Input type="search" name="q" placeholder={t("searchPlaceholder")} defaultValue={q} className="border-0 shadow-none sm:flex-1" />
            {/* items (plain data, not a render function) is required here because this Select is
                rendered from a Server Component — a function child can't cross that boundary. */}
            <Select
              name="category"
              defaultValue={category ?? "all"}
              items={[{ value: "all", label: t("allCategories") }, ...categoryOptions.map((c) => ({ value: c.id, label: c.label }))]}
            >
              <SelectTrigger className="border-0 shadow-none sm:w-56">
                <SelectValue placeholder={t("allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCategories")}</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="text" name="city" placeholder={t("city")} defaultValue={city} className="border-0 shadow-none sm:w-40" />
            <Button type="submit" className="sm:px-6 transition-transform duration-150 hover:-translate-y-0.5">{t("search")}</Button>
          </form>

          <CategoryQuickNav categories={topLevelCategories} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 md:block">
          <h2 className="mb-2 px-2 text-sm font-semibold">{t("categories")}</h2>
          <ul className="flex flex-col gap-0.5 text-sm">
            <li>
              <Link
                href="/"
                className={`block rounded-md px-2 py-1.5 transition-all duration-150 ${!category ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:translate-x-0.5 hover:bg-muted hover:text-foreground"}`}
              >
                {t("allCategories")}
              </Link>
            </li>
            {topLevelCategories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/categories/${slugPath(c.label, c.id)}`}
                  className={`block rounded-md px-2 py-1.5 transition-all duration-150 ${category === c.id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:translate-x-0.5 hover:bg-muted hover:text-foreground"}`}
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Results */}
        <main className="flex-1">
          <div className="mb-5 flex items-center justify-between border-b pb-4">
            <h1 className="text-xl font-bold tracking-tight">{selectedCategory ? selectedCategory.label : q ? t("resultsFor", { q }) : t("recentListings")}</h1>
            <div className="flex items-center gap-3">
              {profile && (q || (category && category !== "all")) && (
                <form action={saveSearch}>
                  {q && <input type="hidden" name="q" value={q} />}
                  {category && <input type="hidden" name="category" value={category} />}
                  {city && <input type="hidden" name="city" value={city} />}
                  <input type="hidden" name="returnTo" value="/" />
                  <Button type="submit" variant="outline" size="sm" className="transition-transform duration-150 hover:-translate-y-0.5">{t("saveSearch")}</Button>
                </form>
              )}
              {category && category !== "all" && (
                <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-primary hover:underline">
                  {t("clearFilter")}
                </Link>
              )}
            </div>
          </div>

          <ListingGrid listings={listings ?? []} favoritedIds={favoritedIds} signedIn={!!profile} />

          {relatedListings.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 border-b pb-4 text-sm font-semibold text-muted-foreground">{t("relatedToYourSearch")}</h2>
              <ListingGrid listings={relatedListings} favoritedIds={favoritedIds} signedIn={!!profile} />
            </div>
          )}

          {!listings?.length && !relatedListings.length && (
            <div className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
              <p className="text-muted-foreground">{t("noListingsYet")}</p>
              <Link href="/listings/new" className="font-medium text-primary underline underline-offset-4 hover:no-underline">
                {t("beTheFirst")}
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
