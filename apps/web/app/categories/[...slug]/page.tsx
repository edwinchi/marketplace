import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCategoryPath, getCategoryDirectory, getCategoryDescendantIds, getCategoryGallery } from "@/lib/categories";
import { getCarsLandingData, type CarsFilters } from "@/lib/cars-landing";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ListingGrid } from "@/components/listing-grid";
import { CategoryDirectoryGrid } from "@/components/category-directory-grid";
import { CategoryGallery } from "@/components/category-gallery";
import { CarsLanding } from "@/components/cars-landing";
import { Badge } from "@/components/ui/badge";
import { idFromSlugSegments, breadcrumbSlugPath } from "@/lib/slug";

const CARS_TYPE_STABLE_KEYS = new Set([
  "cars-passenger-cars",
  "cars-electric-cars",
  "cars-classic-cars",
  "cars-convertibles",
  "cars-suvs-and-crossovers",
  "cars-vans-and-commercial-vehicles",
]);

function parseNum(v: string | undefined) {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toArray(v: string | string[] | undefined): string[] | undefined {
  if (!v) return undefined;
  const arr = Array.isArray(v) ? v : [v];
  return arr.length > 0 ? arr : undefined;
}

// Non-leaf categories (has children) show a subcategory directory, matching the
// card-per-subcategory-with-leaf-links layout. Leaf categories show actual listings. "Cars"
// specifically gets a dedicated, richer landing page (see components/cars-landing.tsx) — real
// filters, real listings, real brand/city browse, no fabricated stats or content. Works at any
// depth — breadcrumbs walk the parent chain regardless of how many levels deep this is.
//
// The URL mirrors the full breadcrumb chain (e.g. /categories/home-interior/kitchen-tableware) —
// only the trailing segment's id suffix is actually looked up (idFromSlugSegments), every segment
// before it is purely decorative, so a stale ancestor slug in a bookmarked/shared link never
// breaks the page.
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{
    type?: string; brand?: string; city?: string;
    priceMin?: string; priceMax?: string; yearMin?: string; yearMax?: string;
    mileageMin?: string; mileageMax?: string;
    fuelType?: string | string[]; transmission?: string | string[]; condition?: string | string[];
    sellerType?: string; priceType?: string; page?: string;
  }>;
}) {
  const { slug } = await params;
  const id = idFromSlugSegments(slug);
  const [path, directory, t] = await Promise.all([getCategoryPath(id), getCategoryDirectory(id), getTranslations("Categories")]);
  if (!directory.self) notFound();

  const breadcrumbPath = path.map((n) => ({ id: n.id, name: n.name }));

  if (directory.self.stableKey === "cars") {
    const sp = await searchParams;
    const filters: CarsFilters = {
      type: sp.type || undefined,
      brand: sp.brand || undefined,
      city: sp.city || undefined,
      priceMin: parseNum(sp.priceMin),
      priceMax: parseNum(sp.priceMax),
      yearMin: parseNum(sp.yearMin),
      yearMax: parseNum(sp.yearMax),
      mileageMin: parseNum(sp.mileageMin),
      mileageMax: parseNum(sp.mileageMax),
      fuelType: toArray(sp.fuelType),
      transmission: toArray(sp.transmission),
      condition: toArray(sp.condition),
      sellerType: sp.sellerType === "private" || sp.sellerType === "business" ? sp.sellerType : undefined,
      priceType: sp.priceType === "fixed" || sp.priceType === "bidding" ? sp.priceType : undefined,
      page: parseNum(sp.page),
    };
    const supabase = await createClient();
    const { profile } = await getCurrentUserAndProfile();
    const [
      carsRootDescendantIds,
      { data: favorites },
      { listings, totalMatches, totalUnfiltered, page, totalPages, cities, brandCounts, fuelTypeCounts, transmissionCounts, conditionCounts, sellerTypeCounts },
      { data: browseMakes },
    ] = await Promise.all([
      getCategoryDescendantIds(id),
      profile
        ? supabase.from("favorites").select("listing_id").eq("profile_id", profile.id)
        : Promise.resolve({ data: [] as { listing_id: string }[] | null }),
      getCarsLandingData(id, filters),
      supabase.from("vehicle_makes").select("id, name").order("name"),
    ]);
    const { count: activeCount } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .in("category_id", carsRootDescendantIds);

    return (
      <>
        <div className="mx-auto w-full max-w-[1760px] px-4 pt-2 sm:px-6 lg:px-8">
          <Breadcrumbs path={breadcrumbPath} />
        </div>
        <CarsLanding
          carsRootId={id}
          // The 6 real vehicle-type subcategories this page's pills/tiles were designed around, by
          // explicit stable_key allowlist -- the Marktplaats taxonomy import added ~93 more direct
          // children under Cars (brand names, "Trucks", "Delivery Vans", etc.), most without any
          // "-grp-" marker to filter on, so an allowlist is the only reliable way to keep just these six.
          subcategories={directory.children
            .filter((c) => CARS_TYPE_STABLE_KEYS.has(c.stableKey))
            .map((c) => ({ id: c.id, name: c.name, stableKey: c.stableKey, href: `/categories/${breadcrumbSlugPath(breadcrumbPath, c.name, c.id)}` }))}
          listings={listings}
          totalMatches={totalMatches}
          totalUnfiltered={totalUnfiltered}
          page={page}
          totalPages={totalPages}
          brandCounts={brandCounts}
          fuelTypeCounts={fuelTypeCounts}
          transmissionCounts={transmissionCounts}
          conditionCounts={conditionCounts}
          sellerTypeCounts={sellerTypeCounts}
          cities={cities}
          browseMakes={browseMakes ?? []}
          favoritedIds={new Set((favorites ?? []).map((f) => f.listing_id))}
          signedIn={!!profile}
          filters={filters}
          totalActiveCount={activeCount ?? 0}
        />
      </>
    );
  }

  if (directory.children.length > 0) {
    // Every group and leaf link mirrors the full breadcrumb chain down to itself -- groups sit one
    // level under the current page (breadcrumbPath), their leaves one level further under the group.
    const groups = directory.children.map((group) => ({
      id: group.id,
      name: group.name,
      href: `/categories/${breadcrumbSlugPath(breadcrumbPath, group.name, group.id)}`,
      children: group.children.map((leaf) => ({
        id: leaf.id,
        name: leaf.name,
        href: `/categories/${breadcrumbSlugPath([...breadcrumbPath, { id: group.id, name: group.name }], leaf.name, leaf.id)}`,
      })),
    }));

    return (
      <div className="mx-auto w-full max-w-[1760px] px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs path={breadcrumbPath} />
        <h1 className="mb-6 text-2xl font-semibold">{directory.self.name}</h1>
        <CategoryDirectoryGrid groups={groups} />
      </div>
    );
  }

  const supabase = await createClient();
  const { profile } = await getCurrentUserAndProfile();
  const descendantIds = await getCategoryDescendantIds(id);
  const [{ data: listings, error: listingsError }, { data: favorites }, galleryImages] = await Promise.all([
    supabase
      .from("listings")
      .select(
        // profiles!listings_seller_id_fkey (not just "profiles"): favorites also links listings
        // to profiles (many-to-many via profile_id/listing_id), so PostgREST can't tell which
        // relationship "profiles(...)" means once both exist — it errors rather than picking one.
        "id, title, description, price_minor, currency_code, pickup_available, delivery_available, locations(city), profiles!listings_seller_id_fkey(display_name, username), listing_media(storage_key, sort_order)",
      )
      .eq("status", "active")
      .in("category_id", descendantIds)
      .order("published_at", { ascending: false })
      .limit(24),
    profile
      ? supabase.from("favorites").select("listing_id").eq("profile_id", profile.id)
      : Promise.resolve({ data: [] as { listing_id: string }[] | null }),
    getCategoryGallery(id),
  ]);
  // A query error here previously rendered as an indistinguishable "no listings yet" empty state
  // (see agents.md §12) — logging server-side, not swallowing it, is the cheap fix that would
  // have surfaced that bug immediately instead of needing a manual repro to find it.
  if (listingsError) console.error("Category listings query failed:", listingsError);
  const favoritedIds = new Set((favorites ?? []).map((f) => f.listing_id));

  // Removable filter chips, one per breadcrumb level — × on a chip goes up to its parent
  // category (or Home for the top-level chip), approximating "remove this filter".
  const chips = breadcrumbPath.map((crumb, i) => ({
    ...crumb,
    removeHref: i === 0 ? "/" : `/categories/${breadcrumbSlugPath(breadcrumbPath.slice(0, i - 1), breadcrumbPath[i - 1].name, breadcrumbPath[i - 1].id)}`,
  }));

  return (
    <div className="mx-auto w-full max-w-[1760px] px-4 py-8 sm:px-6 lg:px-8">
      {/* listings?.length, not a separate exact-count query — accurate up to the limit(24) below;
          revisit once real pagination exists for categories with more than a page of listings. */}
      <Breadcrumbs path={breadcrumbPath} resultCount={listings?.length ?? 0} />

      <CategoryGallery images={galleryImages} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <Link key={chip.id} href={chip.removeHref} className="transition-transform duration-150 hover:-translate-y-0.5">
            <Badge variant="secondary" className="gap-1">
              {chip.name} ×
            </Badge>
          </Link>
        ))}
      </div>

      <ListingGrid listings={listings ?? []} favoritedIds={favoritedIds} signedIn={!!profile} />
      {!listings?.length && <p className="py-8 text-center text-muted-foreground">{t("noListingsInCategory")}</p>}
    </div>
  );
}
