import Link from "next/link";
import { redirect } from "next/navigation";
import { Images } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { formatPrice } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListingRowActions } from "@/components/listing-row-actions";
import { slugPath } from "@/lib/slug";

export default async function MyListingsPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, price_minor, currency_code, status")
    .eq("seller_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">My listings</h1>
      {listings?.length ? (
        <ul className="flex flex-col divide-y">
          {listings.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex flex-col gap-1">
                <Link href={`/listings/${slugPath(l.title, l.id)}`} className="font-medium hover:underline">
                  {l.title}
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant={l.status === "active" ? "default" : "outline"}>{l.status}</Badge>
                  <span className="text-sm text-muted-foreground">{formatPrice(l.price_minor ?? 0, l.currency_code)}</span>
                </div>
              </div>
              <ListingRowActions listingId={l.id} status={l.status} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Images className="size-10 text-muted-foreground" />
          <p className="font-medium">You don&apos;t have any listings yet.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Sell things you no longer use and make someone else&apos;s day — every listing helps.
          </p>
          <Link href="/listings/new">
            <Button className="mt-2">Post an ad</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
