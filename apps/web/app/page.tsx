import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { getCategoriesAndAttributes, getCategoryDescendantIds } from "@/lib/categories";
import { CategoryIcon } from "@/lib/category-icons";
import { ListingGrid } from "@/components/listing-grid";
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

  // Filtering by an embedded resource's column (locations.city) requires an inner join in
  // PostgREST's embed syntax — a plain left-embed silently ignores that filter.
  let query = supabase
    .from("listings")
    .select(
      city
        ? "id, title, price_minor, currency_code, locations!inner(city), listing_media(storage_key, sort_order)"
        : "id, title, price_minor, currency_code, locations(city), listing_media(storage_key, sort_order)",
    )
    .eq("status", "active")
    .order("published_at", { ascending: false })
    .limit(24);

  if (category && category !== "all") {
    // Match the category itself and every descendant — a listing tagged under a leaf like "Cars >
    // Passenger cars" should still show up when filtering by the top-level "Cars".
    query = query.in("category_id", await getCategoryDescendantIds(category));
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

  return (
    <div className="flex flex-1 flex-col">
      {/* Search hero */}
      <div className="border-b bg-linear-to-b from-muted/60 to-muted/20">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 sm:px-6 lg:px-8">
          <form className="flex flex-col gap-2 rounded-xl border bg-background p-2 shadow-sm sm:flex-row sm:items-center">
            <Input type="search" name="q" placeholder="Search listings…" defaultValue={q} className="border-0 shadow-none sm:flex-1" />
            {/* items (plain data, not a render function) is required here because this Select is
                rendered from a Server Component — a function child can't cross that boundary. */}
            <Select
              name="category"
              defaultValue={category ?? "all"}
              items={[{ value: "all", label: "All categories" }, ...categoryOptions.map((c) => ({ value: c.id, label: c.label }))]}
            >
              <SelectTrigger className="border-0 shadow-none sm:w-56">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="text" name="city" placeholder="City" defaultValue={city} className="border-0 shadow-none sm:w-40" />
            <Button type="submit" className="sm:px-6">Search</Button>
          </form>

          {/* Category quick-nav */}
          <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            {topLevelCategories.map((c) => (
              <Link
                key={c.id}
                href={`/categories/${c.id}`}
                className="group flex shrink-0 flex-col items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="flex size-11 items-center justify-center rounded-full border bg-background shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:shadow-md">
                  <CategoryIcon stableKey={c.stableKey} className="size-5 transition-colors group-hover:text-primary" />
                </span>
                <span className="max-w-16 truncate">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 md:block">
          <h2 className="mb-2 px-2 text-sm font-semibold">Categories</h2>
          <ul className="flex flex-col gap-0.5 text-sm">
            <li>
              <Link
                href="/"
                className={`block rounded-md px-2 py-1.5 transition-colors ${!category ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                All categories
              </Link>
            </li>
            {topLevelCategories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/categories/${c.id}`}
                  className={`block rounded-md px-2 py-1.5 transition-colors ${category === c.id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
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
            <h1 className="text-xl font-bold tracking-tight">{selectedCategory ? selectedCategory.label : q ? `Results for "${q}"` : "Recent listings"}</h1>
            <div className="flex items-center gap-3">
              {profile && (q || (category && category !== "all")) && (
                <form action={saveSearch}>
                  {q && <input type="hidden" name="q" value={q} />}
                  {category && <input type="hidden" name="category" value={category} />}
                  {city && <input type="hidden" name="city" value={city} />}
                  <input type="hidden" name="returnTo" value="/" />
                  <Button type="submit" variant="outline" size="sm">Save this search</Button>
                </form>
              )}
              {category && category !== "all" && (
                <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-primary hover:underline">
                  Clear filter ×
                </Link>
              )}
            </div>
          </div>

          <ListingGrid listings={listings ?? []} favoritedIds={favoritedIds} signedIn={!!profile} />

          {!listings?.length && (
            <div className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
              <p className="text-muted-foreground">No listings yet.</p>
              <Link href="/listings/new" className="font-medium text-primary underline underline-offset-4 hover:no-underline">
                Be the first to post one.
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
