import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { ListingGrid } from "@/components/listing-grid";
import { CategoryFilterSelect } from "@/components/category-filter-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const { category } = await searchParams;

  const supabase = await createClient();
  const { data: favorites } = await supabase
    .from("favorites")
    .select(
      "listing_id, listings(id, title, price_minor, currency_code, status, category_id, locations(city), listing_media(storage_key, sort_order))",
    )
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  const allListings = (favorites ?? []).map((f) => (Array.isArray(f.listings) ? f.listings[0] : f.listings)).filter((l) => !!l);

  const categoryIds = [...new Set(allListings.map((l) => l.category_id))];
  const { data: categoryTranslations } = categoryIds.length
    ? await supabase.from("category_translations").select("category_id, name").eq("language_code", "en").in("category_id", categoryIds)
    : { data: [] };
  const categoryNameById = new Map((categoryTranslations ?? []).map((t) => [t.category_id, t.name]));
  const categories = categoryIds
    .map((id) => ({ id, name: categoryNameById.get(id) ?? "Uncategorized" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const listings = category ? allListings.filter((l) => l.category_id === category) : allListings;
  const favoritedIds = new Set(listings.map((l) => l.id));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Favorites</h1>

      {allListings.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Filter by category</Label>
          <CategoryFilterSelect categories={categories} selected={category ?? "all"} basePath="/my-account/favorites" />
        </div>
      )}

      {listings.length > 0 ? (
        <ListingGrid listings={listings} favoritedIds={favoritedIds} signedIn />
      ) : allListings.length > 0 ? (
        <p className="text-sm text-muted-foreground">No favorites in this category.</p>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Heart className="size-10 text-muted-foreground" />
          <p className="font-medium">No favorites yet.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Tap the heart on any listing to save it here for later.
          </p>
          <Link href="/">
            <Button className="mt-2">Browse listings</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
