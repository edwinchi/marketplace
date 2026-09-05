import Stripe from "stripe";

// Returns null rather than throwing when unconfigured -- same "not set up yet" pattern as
// OPENROUTER_API_KEY (app/listings/new/analyze-photo-action.ts): callers show an honest message
// instead of a crash until a real Stripe account exists and STRIPE_SECRET_KEY is set.
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

// Price IDs come from env, not hardcoded -- they're created in the Stripe Dashboard once a real
// account exists (Products -> Seller Pro, recurring; AI top-up, one-time) and only then wired in
// here. Both undefined until that happens, which is what gates the upgrade buttons on
// /my-account/ai-features from showing at all.
export const SELLER_PRO_PRICE_ID = process.env.STRIPE_SELLER_PRO_PRICE_ID;
export const AI_TOPUP_PRICE_ID = process.env.STRIPE_TOPUP_PRICE_ID;
export const AI_TOPUP_USES = 10;

// Reads the real, current price from Stripe rather than hardcoding an amount a second time --
// the whole reason this needed fixing once already (the page showed "$7.99"/"$1.99" placeholders
// that drifted from the actual €6.93/€3.99 prices set up in the Dashboard). Formats "€6.93/mo" or
// "€3.99" -- recurring vs one-time is read straight off the Price object, not assumed by caller.
export async function getPriceDisplay(stripe: Stripe, priceId: string): Promise<string | null> {
  try {
    const price = await stripe.prices.retrieve(priceId);
    if (price.unit_amount == null) return null;
    const amount = (price.unit_amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const symbol = price.currency.toUpperCase() === "EUR" ? "€" : price.currency.toUpperCase() === "USD" ? "$" : `${price.currency.toUpperCase()} `;
    const suffix = price.recurring ? `/${price.recurring.interval === "month" ? "mo" : price.recurring.interval}` : "";
    return `${symbol}${amount}${suffix}`;
  } catch {
    return null;
  }
}
