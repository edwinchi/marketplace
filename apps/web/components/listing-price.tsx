import { getTranslations } from "next-intl/server";
import { Price } from "@/components/price";
import { PRICE_TYPE_DISPLAY_KEYS, parsePriceType } from "@/lib/price-types";

type Props = {
  priceType?: string | null;
  minorUnits: number | null;
  currency: string;
  displayCurrency: string | null;
  rates: Record<string, number> | null;
  locale?: string;
};

// A listing's price as buyers see it: the amount for fixed/bidding listings, or the price type's
// own label ("Free", "Swap", "See description", "Price on request") for the rest -- never "€0".
export async function ListingPrice({ priceType, minorUnits, currency, displayCurrency, rates, locale }: Props) {
  const type = parsePriceType(priceType);
  if (type in PRICE_TYPE_DISPLAY_KEYS) {
    const t = await getTranslations("Listing");
    return <>{t(PRICE_TYPE_DISPLAY_KEYS[type as keyof typeof PRICE_TYPE_DISPLAY_KEYS])}</>;
  }
  return <Price minorUnits={minorUnits ?? 0} currency={currency} displayCurrency={displayCurrency} rates={rates} locale={locale} />;
}
