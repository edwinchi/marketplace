import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { ListingGrid } from "@/components/listing-grid";
import { Button } from "@/components/ui/button";

export default async function FavoritesPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: favorites } = await supabase
    .from("favorites")
    .select(
      "listing_id, listings(id, title, price_minor, currency_code, status, locations(city), listing_media(storage_key, sort_order))",
    )
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  const listings = (favorites ?? []).map((f) => (Array.isArray(f.listings) ? f.listings[0] : f.listings)).filter((l) => !!l);
  const favoritedIds = new Set(listings.map((l) => l.id));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Favorites</h1>
      {listings.length > 0 ? (
        <ListingGrid listings={listings} favoritedIds={favoritedIds} signedIn />
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
