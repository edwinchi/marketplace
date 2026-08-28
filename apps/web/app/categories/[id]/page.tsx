import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCategoryPath, getCategoryDirectory, getCategoryDescendantIds } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ListingList } from "@/components/listing-list";
import { CategoryGroupCard } from "@/components/category-group-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Non-leaf categories (has children) show a subcategory directory, matching the
// card-per-subcategory-with-leaf-links layout. Leaf categories show actual listings. Works at any
// depth — breadcrumbs walk the parent chain regardless of how many levels deep this is.
export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [path, directory, t] = await Promise.all([getCategoryPath(id), getCategoryDirectory(id), getTranslations("Categories")]);
  if (!directory.self) notFound();

  const breadcrumbPath = path.map((n) => ({ id: n.id, name: n.name }));

  if (directory.children.length > 0) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs path={breadcrumbPath} />
        <h1 className="mb-6 text-2xl font-semibold">{directory.self.name}</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {directory.children.map((child) => (
            <CategoryGroupCard
              key={child.id}
              id={child.id}
              name={child.name}
              leaves={child.children.length > 0 ? child.children : [child]}
            />
          ))}
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { profile } = await getCurrentUserAndProfile();
  const descendantIds = await getCategoryDescendantIds(id);
  const [{ data: listings, error: listingsError }, { data: favorites }] = await Promise.all([
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
  ]);
  // A query error here previously rendered as an indistinguishable "no listings yet" empty state
  // (see agents.md §12) — logging server-side, not swallowing it, is the cheap fix that would
  // have surfaced that bug immediately instead of needing a manual repro to find it.
  if (listingsError) console.error("Category listings query failed:", listingsError);
  const favoritedIds = new Set((favorites ?? []).map((f) => f.listing_id));

  // Removable filter chips, one per breadcrumb level — × on a chip goes up to its parent
  // category (or Home for the top-level chip), approximating "remove this filter".
  const chips = breadcrumbPath.map((crumb, i) => ({ ...crumb, removeHref: i === 0 ? "/" : `/categories/${breadcrumbPath[i - 1].id}` }));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* listings?.length, not a separate exact-count query — accurate up to the limit(24) below;
          revisit once real pagination exists for categories with more than a page of listings. */}
      <Breadcrumbs path={breadcrumbPath} resultCount={listings?.length ?? 0} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <Link key={chip.id} href={chip.removeHref} className="transition-transform duration-150 hover:-translate-y-0.5">
            <Badge variant="secondary" className="gap-1">
              {chip.name} ×
            </Badge>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent>
          <ListingList listings={listings ?? []} favoritedIds={favoritedIds} signedIn={!!profile} />
          {!listings?.length && <p className="py-8 text-center text-muted-foreground">{t("noListingsInCategory")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
