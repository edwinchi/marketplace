// Every way a listing can be priced -- Marktplaats' own set ("Vraagprijs", "Bieden", "Gratis",
// "Ruilen", "Zie omschrijving", "Prijs op aanvraag"). Only fixed and bidding carry an amount (a
// bidding listing's amount is the asking/starting price); "free" is stored as price_minor 0 and the
// remaining three as null, so price filters/sorts and Direct Buy (fixed-only, see
// lib/payments.ts's isDirectBuyEligible) naturally leave them out.
export const PRICE_TYPES = ["fixed", "bidding", "free", "swap", "see_description", "on_request"] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

// Seller-facing labels for the posting/edit forms (those forms aren't localized yet).
export const PRICE_TYPE_FORM_LABELS: Record<PriceType, string> = {
  fixed: "Fixed price",
  bidding: "Accepting offers",
  free: "Free",
  swap: "Swap",
  see_description: "See description",
  on_request: "Price on request",
};

// Buyer-facing label shown INSTEAD of an amount -- keys in the "Listing" message namespace.
export const PRICE_TYPE_DISPLAY_KEYS = {
  free: "priceFree",
  swap: "priceSwap",
  see_description: "priceSeeDescription",
  on_request: "priceOnRequest",
} as const satisfies Partial<Record<PriceType, string>>;

export function parsePriceType(value: unknown): PriceType {
  return PRICE_TYPES.includes(value as PriceType) ? (value as PriceType) : "fixed";
}

export function priceTypeHasAmount(priceType: PriceType): boolean {
  return priceType === "fixed" || priceType === "bidding";
}

// What to store in listings.price_minor for a given type and submitted amount (major units).
// Returns an error string for an amount-carrying type without a valid positive amount.
export function priceMinorFor(priceType: PriceType, amount: number): { priceMinor: number | null } | { error: string } {
  if (priceType === "free") return { priceMinor: 0 };
  if (!priceTypeHasAmount(priceType)) return { priceMinor: null };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter a price above zero, or pick a price type without one." };
  return { priceMinor: Math.round(amount * 100) };
}
