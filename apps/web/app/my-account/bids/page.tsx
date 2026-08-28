import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { formatPrice } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Offers this profile has made as a buyer — the seller-side view of offers already exists inline
// on each of the seller's own listing pages (offer-box.tsx); this is the buyer's equivalent, one
// list across every listing they've made an offer on, rather than having to revisit each listing.
export default async function OffersPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: offers } = await supabase
    .from("offers")
    .select("id, amount_minor, currency_code, status, created_at, listings(id, title, price_minor, currency_code, status)")
    .eq("buyer_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Offers</h1>
      {offers?.length ? (
        <div className="flex flex-col gap-3">
          {offers.map((o) => {
            const listing = Array.isArray(o.listings) ? o.listings[0] : o.listings;
            if (!listing) return null;
            return (
              <Card key={o.id}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <Link href={`/listings/${listing.id}`} className="font-medium hover:underline">
                      {listing.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Offered {formatPrice(o.amount_minor, o.currency_code)} · {new Date(o.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={o.status === "accepted" ? "default" : o.status === "declined" ? "outline" : "secondary"} className="capitalize shrink-0">
                    {o.status}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Handshake className="size-10 text-muted-foreground" />
          <p className="font-medium">No offers yet.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Offers you make on a seller&apos;s listing will show up here.
          </p>
          <Link href="/">
            <Button className="mt-2">Browse listings</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
