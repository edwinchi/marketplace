import { formatPrice, convertMinorUnits } from "@/lib/money";

type Props = {
  minorUnits: number;
  currency: string;
  displayCurrency: string | null;
  rates: Record<string, number> | null;
  locale?: string;
};

// Native price always renders -- a chosen display currency adds a converted figure alongside it,
// never replaces the actual listed price (that would misrepresent what the seller priced it at).
export function Price({ minorUnits, currency, displayCurrency, rates, locale }: Props) {
  const native = formatPrice(minorUnits, currency, locale);
  if (!displayCurrency || displayCurrency === currency || !rates) return <>{native}</>;

  const converted = convertMinorUnits(minorUnits, currency, displayCurrency, rates);
  if (converted == null) return <>{native}</>;

  return (
    <>
      {formatPrice(converted, displayCurrency, locale)}
      <span className="ml-1 font-normal text-muted-foreground">({native})</span>
    </>
  );
}
