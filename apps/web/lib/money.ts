// Money is stored as integer minor units (agents.md §7) — these are the only places that should
// ever multiply/divide by 100 or format currency for display.
//
// Every real ISO 4217 currency used by a country in lib/countries.ts's ANCHOR_COUNTRIES list --
// expanded from the original 9 (which only covered a handful of anchor markets) once currency
// became derived from country rather than freely chosen (see getCurrencyForCountry in
// lib/countries.ts). open.er-api.com (lib/exchange-rates.ts) carries live rates for all of these,
// so display-currency conversion keeps working for the newly added codes too.
export const SUPPORTED_CURRENCIES = [
  "USD", "EUR", "GBP", "CHF",
  // Africa
  "NGN", "DZD", "AOA", "XOF", "BWP", "BIF", "CVE", "XAF", "KMF", "CDF", "DJF", "EGP", "ERN", "SZL",
  "ETB", "GMD", "GHS", "GNF", "KES", "LSL", "LRD", "LYD", "MGA", "MWK", "MRU", "MUR", "MAD", "MZN",
  "NAD", "RWF", "STN", "SCR", "SLE", "SOS", "ZAR", "SSP", "SDG", "TZS", "TND", "UGX", "ZMW", "ZWG",
  // Europe
  "ALL", "BYN", "BAM", "BGN", "CZK", "DKK", "HUF", "ISK", "MDL", "MKD", "NOK", "PLN", "RON", "RUB",
  "RSD", "SEK", "UAH",
] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DISPLAY_CURRENCY_COOKIE = "display_currency";

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

// Stripe's amount convention isn't always "×100" like this app's own minor units (toMinorUnits
// above stores every currency ×100). Passing price_minor straight through as a Stripe unit_amount
// overcharged zero-decimal currencies 100× (a 5,000 XOF item charged as 500,000 XOF -- Côte d'Ivoire
// is Stripe-eligible, see lib/payment-coverage.ts) and undercharged three-decimal TND 10×.
// Source: docs.stripe.com/currencies (zero-decimal, special-case and three-decimal lists),
// intersected with SUPPORTED_CURRENCIES.
const STRIPE_ZERO_DECIMAL = new Set(["BIF", "DJF", "GNF", "KMF", "MGA", "RWF", "XAF", "XOF"]);
// Zero-decimal in practice, but Stripe requires them sent ×100 and divisible by 100.
const STRIPE_WHOLE_UNITS_AS_TWO_DECIMAL = new Set(["ISK", "UGX"]);
const STRIPE_THREE_DECIMAL = new Set(["TND"]);

export function toStripeAmount(minorUnits: number, currency: string): number {
  const code = currency.toUpperCase();
  if (STRIPE_ZERO_DECIMAL.has(code)) return Math.round(minorUnits / 100);
  if (STRIPE_WHOLE_UNITS_AS_TWO_DECIMAL.has(code)) return Math.round(minorUnits / 100) * 100;
  if (STRIPE_THREE_DECIMAL.has(code)) return minorUnits * 10;
  return minorUnits;
}

export function fromStripeAmount(stripeAmount: number, currency: string): number {
  const code = currency.toUpperCase();
  if (STRIPE_ZERO_DECIMAL.has(code)) return stripeAmount * 100;
  if (STRIPE_THREE_DECIMAL.has(code)) return Math.round(stripeAmount / 10);
  return stripeAmount;
}

export function formatPrice(minorUnits: number, currency: string, locale = "en") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}

// Converts via USD-based rates from getExchangeRates() -- display-only (a listing's own
// price_minor/currency_code never changes). Returns null if either currency is missing from the
// feed, so callers can fall back to showing the native price with no conversion rather than a
// wrong number.
export function convertMinorUnits(minorUnits: number, from: string, to: string, rates: Record<string, number>): number | null {
  if (from === to) return minorUnits;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return null;
  return Math.round((minorUnits / fromRate) * toRate);
}
