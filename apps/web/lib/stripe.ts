import Stripe from "stripe";

// Explicit list, not Stripe's default "dynamic payment methods" (omitting this field entirely) --
// confirmed live that dynamic mode was silently excluding iDEAL from small EUR checkouts (the
// ad-bump/tier-upgrade flat fees) even though it's enabled in the Dashboard and every documented
// requirement (EUR currency, NL/EU business location) is met. Stripe's own dynamic-payment-methods
// docs attribute this to its AI-driven eligibility model, not a hard per-method minimum (none is
// documented for iDEAL) -- an explicit list bypasses that model entirely. Every string here is
// Stripe's own literal API value, verified against docs.stripe.com/payments/payment-methods/
// payment-method-support (the "API support" table's backtick-quoted column), not guessed --
// getting one wrong throws at session-creation time instead of just omitting that one method, so
// this list is deliberately only what's both enabled in the Dashboard's Payment methods page and
// individually confirmed here.
// p24 removed: confirmed live it throws "payment method type provided: p24 is invalid... ensure
// the provided type is activated in your dashboard" despite the Dashboard's Payment methods page
// showing it enabled -- crashed every checkout using this list until caught (2026-09-19). blik was
// enabled in the exact same Dashboard action as p24 and has NOT been independently confirmed
// working, so it's left out too until verified in isolation rather than risking the same crash
// class twice. Every string still in this list has been directly confirmed live: card/klarna/
// bancontact/revolut_pay/multibanco/mb_way/satispay/eps all rendered successfully under Stripe's
// default dynamic mode before this list existed; ideal was confirmed by this list itself.
export const EUR_CHECKOUT_PAYMENT_METHOD_TYPES: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = [
  "card",
  "ideal",
  "klarna",
  "bancontact",
  "revolut_pay",
  "eps",
  "multibanco",
  "mb_way",
  "satispay",
];

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
export const BUSINESS_PRICE_ID = process.env.STRIPE_BUSINESS_PRICE_ID;

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
