import { getNumericSetting } from "./numeric-settings";
import { getExchangeRates } from "./exchange-rates";
import { convertMinorUnits } from "./money";

// The buyer-side protection fee for a Direct Buy payment (see supabase/migrations/20260101005100_
// stripe_connect.sql) -- a percentage of the item price, clamped to a min/max, paid on top by the
// buyer so the seller receives the full agreed price with nothing deducted. Admin-adjustable from
// /admin, no code deploy needed.
//
// The min/max settings are EUR cents (that's how /admin presents them). They used to be applied
// as-is in whatever currency the listing is priced in -- a "€0.50 minimum" became 0.50 XOF (about
// €0.001) on an XOF listing, and the "€25 maximum" capped a NGN listing's fee at 25 naira. They're
// now converted into the listing's currency at the current rate; if no rate is available (rates API
// down, or a currency it doesn't cover) the bounds fall back to the old unconverted behavior rather
// than blocking checkout.
export async function calculateBuyerFeeMinor(itemPriceMinor: number, currencyCode = "EUR"): Promise<number> {
  const [percentX100, minCents, maxCents, rates] = await Promise.all([
    getNumericSetting("buyer_fee_percent_x100"),
    getNumericSetting("buyer_fee_min_cents"),
    getNumericSetting("buyer_fee_max_cents"),
    currencyCode === "EUR" ? Promise.resolve(null) : getExchangeRates(),
  ]);
  const toListingCurrency = (eurCents: number) =>
    rates ? (convertMinorUnits(eurCents, "EUR", currencyCode, rates.rates) ?? eurCents) : eurCents;
  const minFee = toListingCurrency(minCents);
  const maxFee = toListingCurrency(maxCents);
  // percentX100 is the percentage times 100 (500 = 5.00%), so dividing by 10000 (100 * 100)
  // converts itemPriceMinor * percentX100 straight into minor units of fee.
  const raw = Math.round((itemPriceMinor * percentX100) / 10000);
  return Math.min(maxFee, Math.max(minFee, raw));
}

// Direct Buy charges exactly the listing's stored price, so it only makes sense for an active,
// fixed-price listing with a real, positive price. Without this, a "bidding" listing could be
// bought outright at its starting price, and a listing with no price at all would charge the buyer
// only the protection fee while the seller's transfer was €0 -- yet the order would still be
// marked paid with a 5-day shipping deadline. Shared by the listing page (whether to show the
// button) and startOrderPayment (re-checked server-side, since a Server Action is directly
// POST-reachable regardless of what the page rendered).
// A reserved listing (is_reserved) is being held for one buyer, so it can't be bought outright.
export function isDirectBuyEligible(listing: { status: string; price_type: string; price_minor: number | null; is_reserved?: boolean | null }): boolean {
  return listing.status === "active" && listing.price_type === "fixed" && (listing.price_minor ?? 0) > 0 && !listing.is_reserved;
}
