import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { ListingGrid } from "@/components/listing-grid";
import { Button } from "@/components/ui/button";

export default async function RecentlyViewedPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: rows }, { data: favorites }] = await Promise.all([
    supabase
      .from("recently_viewed_listings")
      .select(
        "listing_id, viewed_at, listings(id, title, price_minor, currency_code, locations(city), listing_media(storage_key, sort_order))",
      )
      .eq("profile_id", profile.id)
      .order("viewed_at", { ascending: false })
      .limit(48),
    supabase.from("favorites").select("listing_id").eq("profile_id", profile.id),
  ]);

  const listings = (rows ?? []).map((r) => (Array.isArray(r.listings) ? r.listings[0] : r.listings)).filter((l) => !!l);
  const favoritedIds = new Set((favorites ?? []).map((f) => f.listing_id));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Recently viewed</h1>
      {listings.length ? (
        <ListingGrid listings={listings} favoritedIds={favoritedIds} signedIn />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Eye className="size-10 text-muted-foreground" />
          <p className="font-medium">Nothing viewed yet.</p>
          <p className="max-w-sm text-sm text-muted-foreground">Listings you open will show up here.</p>
          <Link href="/">
            <Button className="mt-2">Browse listings</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
