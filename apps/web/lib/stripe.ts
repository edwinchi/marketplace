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
// account exists (Products -> Seller Pro, recurring $7.99/mo; AI top-up, one-time $1.99) and only
// then wired in here. Both undefined until that happens, which is what gates the upgrade buttons
// on /my-account/ai-features from showing at all.
export const SELLER_PRO_PRICE_ID = process.env.STRIPE_SELLER_PRO_PRICE_ID;
export const AI_TOPUP_PRICE_ID = process.env.STRIPE_TOPUP_PRICE_ID;
export const AI_TOPUP_USES = 10;
