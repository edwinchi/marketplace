// Every listing is authored in English (createListing hardcodes source_language: "en"), so these
// are the only real translation targets -- English itself is already what's stored on the listing
// row directly, no listing_translations row needed for it. Split out from translate-action.ts
// (a "use server" file) because Next.js requires every export of a "use server" module to be an
// async function -- exporting this plain constant/type from there crashed every page that imported
// it (confirmed live: "Something went wrong" on both the edit-listing and listing-detail pages).
export const LISTING_TRANSLATION_TARGETS = ["fr", "nl"] as const;
export type ListingTranslationTarget = (typeof LISTING_TRANSLATION_TARGETS)[number];
