export type AdvertiseTier = "free" | "plus" | "premium";

// listings.boost_rank is a plain 0/1/2 integer (see components/listings/advertise-tier-selector.tsx)
// -- this is the one place that maps it back to the tier name the advertise_tier form field and
// Stripe checkout metadata use, so the edit form can pre-select a listing's current tier and
// app/listings/actions.ts can tell whether a submitted tier is actually a change.
export function tierFromBoostRank(boostRank: number | null | undefined): AdvertiseTier {
  if (boostRank === 2) return "premium";
  if (boostRank === 1) return "plus";
  return "free";
}
