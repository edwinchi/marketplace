import Link from "next/link";
import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { formatPrice } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Real schema (orders/payments, RLS already in place from 02_marketplace.sql) — just no checkout
// flow creates rows yet (Stripe Connect is a later phase per agents.md §10), so this is honestly
// empty today rather than showing fabricated transaction history.
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
  let query = supabase
    .from("orders")
    .select(
      "id, total_minor, currency_code, status, created_at, listings(id, title), payments(status, refunded_at, paid_at)",
    )
    .eq(tab === "sold" ? "seller_id" : "buyer_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: orders } = await query;

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
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${status === f.key ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"}`}
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
            return (
              <Card key={o.id}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    {listing ? (
                      <Link href={`/listings/${listing.id}`} className="font-medium hover:underline">
                        {listing.title}
                      </Link>
                    ) : (
                      <p className="font-medium">Order</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(o.total_minor, o.currency_code)} · {new Date(o.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={payment?.refunded_at ? "outline" : payment?.paid_at ? "default" : "secondary"} className="shrink-0 capitalize">
                    {payment?.refunded_at ? "Refunded" : payment?.paid_at ? "Paid" : o.status}
                  </Badge>
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
