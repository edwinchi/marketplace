import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
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

  const [t, locale] = await Promise.all([getTranslations("Bids"), getLocale()]);
  const supabase = await createClient();
  const { data: offers } = await supabase
    .from("offers")
    .select("id, amount_minor, currency_code, status, created_at, listings(id, title, price_minor, currency_code, status)")
    .eq("buyer_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      {offers?.length ? (
        <div className="flex flex-col gap-3">
          {offers.map((o) => {
            const listing = Array.isArray(o.listings) ? o.listings[0] : o.listings;
            if (!listing) return null;
            return (
              <Card key={o.id} className="transition-shadow duration-200 hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <Link href={`/listings/${listing.id}`} className="font-medium transition-colors hover:text-[#008848] hover:underline">
                      {listing.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {t("offered", { amount: formatPrice(o.amount_minor, o.currency_code), date: new Date(o.created_at).toLocaleDateString(locale) })}
                    </p>
                  </div>
                  <Badge variant={o.status === "accepted" ? "default" : o.status === "declined" ? "outline" : "secondary"} className="shrink-0">
                    {o.status === "pending" ? t("statusPending") : o.status === "accepted" ? t("statusAccepted") : o.status === "declined" ? t("statusDeclined") : o.status}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Handshake className="size-10 text-muted-foreground" />
          <p className="font-medium">{t("noOffers")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("noOffersBody")}</p>
          <Link href="/">
            <Button className="mt-2 transition-transform duration-150 hover:-translate-y-0.5">{t("browseListings")}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
