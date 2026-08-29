// Money is stored as integer minor units (agents.md §7) — these are the only places that should
// ever multiply/divide by 100 or format currency for display.
export const SUPPORTED_CURRENCIES = ["NGN", "KES", "XOF", "XAF", "GHS", "ZAR", "EGP", "USD", "EUR"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DISPLAY_CURRENCY_COOKIE = "display_currency";

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
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
