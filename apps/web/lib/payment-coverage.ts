// Which countries can actually complete Stripe Connect Express onboarding today. Confirmed against
// Stripe's own country-availability page plus its 2024 Paystack acquisition, which extends Connect
// (same API, same "express" account type) into five more African markets as a partner rail. Every
// other country in lib/countries.ts's ANCHOR_COUNTRIES has no real Stripe payout path yet -- see
// the "Payment Rails Roadmap" plan for what's next for them (a mobile-money aggregator).
//
// This is the fix for a real gap found by auditing the live onboarding flow: stripe.accounts.create()
// was called with no country at all, so a seller from any of the 99 anchor countries could start
// Connect onboarding and hit a broken/rejected flow with no explanation. Both the account-creation
// call and the "enable payments" page now check this list before ever showing/using the button.
const STRIPE_ELIGIBLE_COUNTRIES = new Set([
  // Europe -- Stripe-native account creation
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LI", "LT", "LU", "MT", "NL", "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "CH", "GB",
  // Africa -- Stripe's Paystack-powered extended network
  "CI", "GH", "KE", "NG", "ZA",
]);

export function isStripeEligibleCountry(countryCode: string): boolean {
  return STRIPE_ELIGIBLE_COUNTRIES.has(countryCode);
}
