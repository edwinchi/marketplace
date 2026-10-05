import { getNumericSetting } from "./numeric-settings";

// The buyer-side protection fee for a Direct Buy payment (see supabase/migrations/20260101005100_
// stripe_connect.sql) -- a percentage of the item price, clamped to a min/max, paid on top by the
// buyer so the seller receives the full agreed price with nothing deducted. Admin-adjustable from
// /admin, no code deploy needed.
export async function calculateBuyerFeeMinor(itemPriceMinor: number): Promise<number> {
  const [percentX100, minCents, maxCents] = await Promise.all([
    getNumericSetting("buyer_fee_percent_x100"),
    getNumericSetting("buyer_fee_min_cents"),
    getNumericSetting("buyer_fee_max_cents"),
  ]);
  // percentX100 is the percentage times 100 (500 = 5.00%), so dividing by 10000 (100 * 100)
  // converts itemPriceMinor * percentX100 straight into minor units of fee.
  const raw = Math.round((itemPriceMinor * percentX100) / 10000);
  return Math.min(maxCents, Math.max(minCents, raw));
}

// Direct Buy charges exactly the listing's stored price, so it only makes sense for an active,
// fixed-price listing with a real, positive price. Without this, a "bidding" listing could be
// bought outright at its starting price, and a listing with no price at all would charge the buyer
// only the protection fee while the seller's transfer was €0 -- yet the order would still be
// marked paid with a 5-day shipping deadline. Shared by the listing page (whether to show the
// button) and startOrderPayment (re-checked server-side, since a Server Action is directly
// POST-reachable regardless of what the page rendered).
export function isDirectBuyEligible(listing: { status: string; price_type: string; price_minor: number | null }): boolean {
  return listing.status === "active" && listing.price_type === "fixed" && (listing.price_minor ?? 0) > 0;
}
