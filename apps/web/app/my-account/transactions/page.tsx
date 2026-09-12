import Link from "next/link";
import { redirect } from "next/navigation";
import { Receipt, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { formatPrice } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { slugPath } from "@/lib/slug";
import { MarkShippedForm } from "@/components/mark-shipped-form";

// A seller has this many days from payment (order status funds_escrowed) to mark an order
// shipped -- see mark_order_shipped in 20260101006900_shipping_sla_and_price_drop_alerts.sql,
// which is the actual enforcement; this is just the same number for the UI's deadline display.
const SHIP_BY_DAYS = 5;

// Real schema (orders/payments, RLS already in place from 02_marketplace.sql) — rows now come
// from Direct Buy (app/listings/payment-actions.ts + the webhook's order_payment handler). Still
// honestly empty until a real order is actually paid for, same as before.
export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const { tab: rawTab, status: rawStatus } = await searchParams;
  const tab = rawTab === "bought" ? "bought" : "sold";
  const status = rawStatus === "paid" || rawStatus === "refunded" ? rawStatus : "all";

  const supabase = await createClient();
  const query = supabase
    .from("orders")
    .select(
      "id, total_minor, currency_code, status, created_at, listings(id, title), payments(status, refunded_at, paid_at), shipments(carrier, tracking_number, shipped_at)",
    )
    .eq(tab === "sold" ? "seller_id" : "buyer_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: orders } = await query;
  const now = new Date();

  const filtered = (orders ?? []).filter((o) => {
    if (status === "all") return true;
    const payment = Array.isArray(o.payments) ? o.payments[0] : o.payments;
    if (status === "refunded") return !!payment?.refunded_at;
    if (status === "paid") return !!payment?.paid_at && !payment?.refunded_at;
    return true;
  });

  const tabs = [
    { key: "sold", label: "Sold items" },
    { key: "bought", label: "Bought items" },
  ] as const;
  const filters = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "refunded", label: "Refunded" },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>

      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/my-account/transactions?tab=${t.key}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={`/my-account/transactions?tab=${tab}${f.key === "all" ? "" : `&status=${f.key}`}`}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${status === f.key ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-primary/10"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {filtered.length ? (
        <div className="flex flex-col gap-3">
          {filtered.map((o) => {
            const listing = Array.isArray(o.listings) ? o.listings[0] : o.listings;
            const payment = Array.isArray(o.payments) ? o.payments[0] : o.payments;
            const shipment = Array.isArray(o.shipments) ? o.shipments[0] : o.shipments;
            const shipByDate = new Date(new Date(o.created_at).getTime() + SHIP_BY_DAYS * 24 * 60 * 60 * 1000);
            const isOverdue = o.status === "funds_escrowed" && shipByDate < now;

            return (
              <Card key={o.id}>
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      {listing ? (
                        <Link href={`/listings/${slugPath(listing.title, listing.id)}`} className="font-medium hover:underline">
                          {listing.title}
                        </Link>
                      ) : (
                        <p className="font-medium">Order</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(o.total_minor, o.currency_code)} · {new Date(o.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={payment?.refunded_at ? "outline" : o.status === "item_shipped" ? "default" : "secondary"} className="shrink-0">
                      {payment?.refunded_at
                        ? "Refunded"
                        : o.status === "item_shipped"
                          ? "Shipped"
                          : o.status === "funds_escrowed"
                            ? "Paid"
                            : "Awaiting payment"}
                    </Badge>
                  </div>

                  {o.status === "funds_escrowed" && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2">
                      <p className={`text-xs ${isOverdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                        {tab === "sold"
                          ? isOverdue
                            ? `Overdue — should have shipped by ${shipByDate.toLocaleDateString()}`
                            : `Ship by ${shipByDate.toLocaleDateString()}`
                          : "Waiting for the seller to ship."}
                      </p>
                      {tab === "sold" && <MarkShippedForm orderId={o.id} />}
                    </div>
                  )}

                  {o.status === "item_shipped" && shipment && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Truck className="size-3.5" />
                      Shipped {shipment.shipped_at && new Date(shipment.shipped_at).toLocaleDateString()}
                      {shipment.carrier && ` · ${shipment.carrier}`}
                      {shipment.tracking_number && ` · ${shipment.tracking_number}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Receipt className="size-10 text-muted-foreground" />
          <p className="font-medium">You don&apos;t have any transactions yet.</p>
        </div>
      )}
    </div>
  );
}
