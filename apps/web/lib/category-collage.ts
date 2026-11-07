// Hero backdrops are the wide photo walls built from these collages by
// scripts/gen-category-heroes.mjs (public/category-heroes/*.webp); the original 3x3 collages stay in
// public/category-collages/ as that script's input.
//
// Dedicated hero collage banners per TOP-LEVEL category -- each a 3x3 grid of 9 real,
// individually-visible photos representative of that category (e.g. Animals & Supplies: dog, cat,
// parrot, fish, rabbit, hamster, horses, guinea pigs, plus real pet-supply shots like a dog collar
// and feeding bowl), sourced CC0 and vetted image-by-image the same way every other photo asset in
// this project has been -- see scratchpad's category-collages/ build for the sourcing/vetting pass
// and build-grid-collage.mjs for the compositor. Every one of the 35 non-Cars top-level categories
// is covered (Cars has its own dedicated photo hero in components/cars-landing.tsx instead, wired
// in separately since that branch never reads heroBannerStyle at all).
const CATEGORY_COLLAGES: Record<string, string> = {
  "animals-supplies": "/category-heroes/animals-supplies.webp",
  "antiques-art": "/category-heroes/antiques-art.webp",
  "audio-tv-photo": "/category-heroes/audio-tv-photo.webp",
  "bikes-mopeds": "/category-heroes/bikes-mopeds.webp",
  books: "/category-heroes/books.webp",
  "business-goods": "/category-heroes/business-goods.webp",
  "car-misc": "/category-heroes/car-misc.webp",
  "car-parts": "/category-heroes/car-parts.webp",
  "caravans-camping": "/category-heroes/caravans-camping.webp",
  "cd-dvd": "/category-heroes/cd-dvd.webp",
  "children-babies": "/category-heroes/children-babies.webp",
  collectibles: "/category-heroes/collectibles.webp",
  "computers-software": "/category-heroes/computers-software.webp",
  "consoles-games": "/category-heroes/consoles-games.webp",
  "contacts-messages": "/category-heroes/contacts-messages.webp",
  "diy-renovation": "/category-heroes/diy-renovation.webp",
  "garden-patio": "/category-heroes/garden-patio.webp",
  "hobbies-leisure": "/category-heroes/hobbies-leisure.webp",
  holidays: "/category-heroes/holidays.webp",
  "home-interior": "/category-heroes/home-interior.webp",
  "houses-rooms": "/category-heroes/houses-rooms.webp",
  "jewelry-bags-beauty": "/category-heroes/jewelry-bags-beauty.webp",
  jobs: "/category-heroes/jobs.webp",
  "mens-clothing": "/category-heroes/mens-clothing.webp",
  miscellaneous: "/category-heroes/miscellaneous.webp",
  motorcycles: "/category-heroes/motorcycles.webp",
  "music-instruments": "/category-heroes/music-instruments.webp",
  "services-trades": "/category-heroes/services-trades.webp",
  "sports-fitness": "/category-heroes/sports-fitness.webp",
  "stamps-coins": "/category-heroes/stamps-coins.webp",
  telecom: "/category-heroes/telecom.webp",
  tickets: "/category-heroes/tickets.webp",
  "watersports-boats": "/category-heroes/watersports-boats.webp",
  "whitegoods-appliances": "/category-heroes/whitegoods-appliances.webp",
  "womens-clothing": "/category-heroes/womens-clothing.webp",
};

export function getCategoryCollageImage(topLevelStableKey: string | undefined): string | null {
  if (!topLevelStableKey) return null;
  return CATEGORY_COLLAGES[topLevelStableKey] ?? null;
}
