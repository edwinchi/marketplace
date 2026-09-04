import { formatPrice, convertMinorUnits } from "@/lib/money";

type Props = {
  minorUnits: number;
  currency: string;
  displayCurrency: string | null;
  rates: Record<string, number> | null;
  locale?: string;
};

// Once the viewer has explicitly chosen a display currency, show only that -- no native-currency
// parenthetical. Mixed native currencies (FCFA/NGN/EUR side by side across a grid of listings from
// different sellers) is confusing to scan; a chosen currency should read cleanly as one number, not
// two. Falls back to each listing's own native currency only when nothing has been chosen yet
// (displayCurrency null) or conversion isn't possible (no rate available) -- there's no honest
// single currency to default to for a viewer who hasn't expressed a preference.
export function Price({ minorUnits, currency, displayCurrency, rates, locale }: Props) {
  const native = formatPrice(minorUnits, currency, locale);
  if (!displayCurrency || displayCurrency === currency || !rates) return <>{native}</>;

  const converted = convertMinorUnits(minorUnits, currency, displayCurrency, rates);
  if (converted == null) return <>{native}</>;

  return <>{formatPrice(converted, displayCurrency, locale)}</>;
}
