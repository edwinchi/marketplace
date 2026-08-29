// Free, no-key rate feed (open.er-api.com) covering every currency in SUPPORTED_CURRENCIES,
// including the African currencies an ECB-based feed (e.g. Frankfurter) doesn't carry. Cached via
// Next's fetch cache and revalidated hourly -- rates are approximate/for display only, never used
// to compute anything a seller is actually paid.
const RATES_URL = "https://open.er-api.com/v6/latest/USD";

export type ExchangeRates = { base: string; rates: Record<string, number> };

export async function getExchangeRates(): Promise<ExchangeRates | null> {
  try {
    const res = await fetch(RATES_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.result !== "success" || !json.rates) return null;
    return { base: json.base_code, rates: json.rates };
  } catch {
    return null;
  }
}
