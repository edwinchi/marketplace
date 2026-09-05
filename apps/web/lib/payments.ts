import { getNumericSetting } from "./numeric-settings";

// The buyer-side protection fee for a Direct Buy payment (see supabase/migrations/20260101005100_
// stripe_connect.sql) -- mirrors Marktplaats' own Kopersbescherming model: a percentage of the
// item price, clamped to a min/max, paid on top by the buyer so the seller receives the full
// agreed price with nothing deducted. Admin-adjustable from /admin, no code deploy needed.
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
