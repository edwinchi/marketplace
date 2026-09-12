import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { getCategoriesAndAttributes, getCategoryDescendantIds } from "@/lib/categories";
import { getTextEmbedding } from "@/lib/embeddings";
import { slugPath } from "@/lib/slug";
import { ListingGrid } from "@/components/listing-grid";
import { CategoryQuickNav } from "@/components/category-quicknav";
import { SearchQueryInput } from "@/components/search-query-input";
import { SortSelect } from "@/components/sort-select";
import { saveSearch } from "@/app/my-account/saved-searches/actions";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SORT_OPTIONS = { newest: "newest", price_asc: "price_asc", price_desc: "price_desc" } as const;
type SortOption = keyof typeof SORT_OPTIONS;
const PAGE_SIZE = 60;
// Real seeded stable_keys for the "condition" attribute (attribute_options table) -- not a fixed
// enum on the listings table itself (condition_code is a plain unconstrained varchar, set from
// whichever of these an attribute value resolved to at listing-creation time), so this list is
// kept in sync with the actual seeded options rather than invented.
const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "as_new", label: "As new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "for_parts", label: "For parts" },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; city?: string; sort?: string; page?: string; priceMin?: string; priceMax?: string; condition?: string }>;
}) {
  const { q, category, city, sort: sortParam, page: pageParam, priceMin, priceMax, condition } = await searchParams;
  const sort: SortOption = sortParam && sortParam in SORT_OPTIONS ? (sortParam as SortOption) : "newest";
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();
  const { profile } = await getCurrentUserAndProfile();
  const t = await getTranslations("Home");

  // Filtering by an embedded resource's column (locations.city) requires an inner join in
  // PostgREST's embed syntax — a plain left-embed silently ignores that filter.
  const listingSelect = city
    ? "id, title, price_minor, currency_code, pickup_available, delivery_available, published_at, locations!inner(city), listing_media(storage_key, sort_order)"
    : "id, title, price_minor, currency_code, pickup_available, delivery_available, published_at, locations(city), listing_media(storage_key, sort_order)";
  // "exact" count with head:false still returns the full row payload -- this is the one query
  // whose real total the results heading (and pagination) needs, so it's worth the (small,
  // already-filtered) extra cost rather than leaving a silent cutoff with no indication more exist.
  let query = supabase
    .from("listings")
    .select(listingSelect, { count: "exact" })
    .eq("status", "active")
    .order(sort === "price_asc" || sort === "price_desc" ? "price_minor" : "published_at", { ascending: sort === "price_asc" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

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
  const priceMinMinor = priceMin ? Math.round(Number(priceMin) * 100) : null;
  const priceMaxMinor = priceMax ? Math.round(Number(priceMax) * 100) : null;
  if (priceMinMinor != null && Number.isFinite(priceMinMinor)) query = query.gte("price_minor", priceMinMinor);
  if (priceMaxMinor != null && Number.isFinite(priceMaxMinor)) query = query.lte("price_minor", priceMaxMinor);
  if (condition) query = query.eq("condition_code", condition);

  const [{ data: listings, count: totalCount }, { categoryOptions, topLevelCategories }, { data: favorites }] = await Promise.all([
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
      <div className="brand-lattice relative border-b bg-muted/30">
        <div className="hero-enter relative mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-7 sm:px-6 lg:px-8">
          {/* This was previously just the search form below with no headline or CTA at all --
              anyone landing here (an ad click, a shared link, organic search) saw a functional
              search bar and nothing telling them MarketitNow is also where they'd sell. Solid brand
              color, not a gradient/glow -- restrained enough to still read as a trustworthy
              classifieds marketplace, not a SaaS landing page. The real-photo collage behind it
              (.brand-lattice::before, see globals.css) is the actual differentiator from
              Marktplaats' plain header band. */}
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="hero-text-halo text-brand-gold text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t("heroHeadline")}
              </h1>
              <p className="hero-text-halo mt-1.5 text-base font-medium text-[#046637] sm:text-lg">{t("heroSubtext")}</p>
            </div>
            <Link
              href="/listings/new"
              className={buttonVariants({ size: "lg", className: "shrink-0 gap-1.5 whitespace-nowrap" })}
            >
              <PackagePlus className="size-4" />
              {t("heroCta")}
            </Link>
          </div>

          <form className="flex flex-col gap-2 rounded-xl border bg-background p-2 shadow-sm sm:flex-row sm:items-center">
            <SearchQueryInput name="q" placeholder={t("searchPlaceholder")} defaultValue={q} />
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
                className={`block rounded-md px-2 py-1.5 transition-all duration-150 ${!category ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:translate-x-0.5 hover:bg-brand-green/10 hover:text-foreground"}`}
              >
                {t("allCategories")}
              </Link>
            </li>
            {topLevelCategories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/categories/${slugPath(c.label, c.id)}`}
                  className={`block rounded-md px-2 py-1.5 transition-all duration-150 ${category === c.id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:translate-x-0.5 hover:bg-brand-green/10 hover:text-foreground"}`}
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Previously the only filters on this page were category (in the hero form above) and a
              free-text city -- no price range or condition, despite condition_code already being
              stored on every listing. A plain GET form: submitting resets to page 1 (a new filter
              set makes any existing page number meaningless) while q/category/city/sort survive
              as hidden inputs so this doesn't clobber whatever's already applied. */}
          <form className="mt-6 flex flex-col gap-4 border-t pt-4 text-sm">
            {q && <input type="hidden" name="q" value={q} />}
            {category && <input type="hidden" name="category" value={category} />}
            {city && <input type="hidden" name="city" value={city} />}
            {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
            <div>
              <p className="mb-2 font-semibold">Price</p>
              <div className="flex items-center gap-2">
                <Input type="number" name="priceMin" placeholder="Min" min="0" defaultValue={priceMin} className="h-8" />
                <span className="text-muted-foreground">–</span>
                <Input type="number" name="priceMax" placeholder="Max" min="0" defaultValue={priceMax} className="h-8" />
              </div>
            </div>
            <div>
              <p className="mb-2 font-semibold">Condition</p>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input type="radio" name="condition" value="" defaultChecked={!condition} className="accent-primary" />
                  Any
                </label>
                {CONDITIONS.map((c) => (
                  <label key={c.value} className="flex items-center gap-2 text-muted-foreground">
                    <input type="radio" name="condition" value={c.value} defaultChecked={condition === c.value} className="accent-primary" />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" size="sm" variant="outline">Apply filters</Button>
          </form>
        </aside>

        {/* Results */}
        <main className="flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
            <div>
              {/* h2, not h1 -- the hero above already carries the page's one h1 (t("heroHeadline")). */}
              <h2 className="text-xl font-bold tracking-tight">{selectedCategory ? selectedCategory.label : q ? t("resultsFor", { q }) : t("recentListings")}</h2>
              {/* Previously a silent .limit(90) cutoff with no indication more listings existed at
                  all -- a real count from the same query's exact-count, not a guess. */}
              {totalCount != null && <p className="mt-0.5 text-xs text-muted-foreground">{totalCount.toLocaleString()} results</p>}
            </div>
            <div className="flex items-center gap-3">
              <SortSelect sort={sort} />
              {profile && (q || (category && category !== "all") || city) && (
                <form action={saveSearch}>
                  {q && <input type="hidden" name="q" value={q} />}
                  {category && <input type="hidden" name="category" value={category} />}
                  {city && <input type="hidden" name="city" value={city} />}
                  <input type="hidden" name="returnTo" value="/" />
                  <Button type="submit" variant="outline" size="sm" className="transition-transform duration-150 hover:-translate-y-0.5">{t("saveSearch")}</Button>
                </form>
              )}
              {/* Previously only shown for a category filter -- a text or city search with no
                  category had no way back to the unfiltered feed except editing the URL. */}
              {(q || (category && category !== "all") || city) && (
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

          {/* Real pagination, not a silent 90-item cutoff -- pageHref preserves every other active
              param (q/category/city/sort/price/condition) so paging never resets a filter. */}
          {totalCount != null && totalCount > PAGE_SIZE && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
              {(() => {
                const totalPages = Math.ceil(totalCount / PAGE_SIZE);
                const pageHref = (p: number) => {
                  const params = new URLSearchParams();
                  if (q) params.set("q", q);
                  if (category) params.set("category", category);
                  if (city) params.set("city", city);
                  if (sort !== "newest") params.set("sort", sort);
                  if (priceMin) params.set("priceMin", priceMin);
                  if (priceMax) params.set("priceMax", priceMax);
                  if (condition) params.set("condition", condition);
                  if (p > 1) params.set("page", String(p));
                  const qs = params.toString();
                  return qs ? `/?${qs}` : "/";
                };
                // A compact window around the current page rather than every page number -- with
                // up to hundreds of pages possible at PAGE_SIZE=60, listing every one would be its
                // own usability problem.
                const windowStart = Math.max(1, page - 2);
                const windowEnd = Math.min(totalPages, page + 2);
                const pages = Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i);
                return (
                  <>
                    <Link
                      href={pageHref(page - 1)}
                      aria-disabled={page <= 1}
                      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-brand-green/10"}`}
                    >
                      Previous
                    </Link>
                    {windowStart > 1 && <span className="px-1 text-sm text-muted-foreground">…</span>}
                    {pages.map((p) => (
                      <Link
                        key={p}
                        href={pageHref(p)}
                        className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${p === page ? "border-primary bg-primary/10 font-semibold text-primary" : "hover:bg-brand-green/10"}`}
                      >
                        {p}
                      </Link>
                    ))}
                    {windowEnd < totalPages && <span className="px-1 text-sm text-muted-foreground">…</span>}
                    <Link
                      href={pageHref(page + 1)}
                      aria-disabled={page >= totalPages}
                      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-brand-green/10"}`}
                    >
                      Next
                    </Link>
                  </>
                );
              })()}
            </nav>
          )}
        </main>
      </div>
    </div>
  );
}
