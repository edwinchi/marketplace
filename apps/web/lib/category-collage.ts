// Hero backgrounds are built from these collages by scripts/gen-category-heroes.mjs: each
// category's photos blended into one wide image in the homepage banner's style
// (public/category-backgrounds/*.webp). The original 3x3 collages stay in public/category-collages/ as
// that script's input.
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
  "animals-supplies": "/category-backgrounds/animals-supplies.webp",
  "antiques-art": "/category-backgrounds/antiques-art.webp",
  "audio-tv-photo": "/category-backgrounds/audio-tv-photo.webp",
  "bikes-mopeds": "/category-backgrounds/bikes-mopeds.webp",
  books: "/category-backgrounds/books.webp",
  "business-goods": "/category-backgrounds/business-goods.webp",
  "car-misc": "/category-backgrounds/car-misc.webp",
  "car-parts": "/category-backgrounds/car-parts.webp",
  "caravans-camping": "/category-backgrounds/caravans-camping.webp",
  "cd-dvd": "/category-backgrounds/cd-dvd.webp",
  "children-babies": "/category-backgrounds/children-babies.webp",
  collectibles: "/category-backgrounds/collectibles.webp",
  "computers-software": "/category-backgrounds/computers-software.webp",
  "consoles-games": "/category-backgrounds/consoles-games.webp",
  "contacts-messages": "/category-backgrounds/contacts-messages.webp",
  "diy-renovation": "/category-backgrounds/diy-renovation.webp",
  "garden-patio": "/category-backgrounds/garden-patio.webp",
  "hobbies-leisure": "/category-backgrounds/hobbies-leisure.webp",
  holidays: "/category-backgrounds/holidays.webp",
  "home-interior": "/category-backgrounds/home-interior.webp",
  "houses-rooms": "/category-backgrounds/houses-rooms.webp",
  "jewelry-bags-beauty": "/category-backgrounds/jewelry-bags-beauty.webp",
  jobs: "/category-backgrounds/jobs.webp",
  "mens-clothing": "/category-backgrounds/mens-clothing.webp",
  miscellaneous: "/category-backgrounds/miscellaneous.webp",
  motorcycles: "/category-backgrounds/motorcycles.webp",
  "music-instruments": "/category-backgrounds/music-instruments.webp",
  "services-trades": "/category-backgrounds/services-trades.webp",
  "sports-fitness": "/category-backgrounds/sports-fitness.webp",
  "stamps-coins": "/category-backgrounds/stamps-coins-hd.webp",
  telecom: "/category-backgrounds/telecom.webp",
  tickets: "/category-backgrounds/tickets.webp",
  "watersports-boats": "/category-backgrounds/watersports-boats.webp",
  "whitegoods-appliances": "/category-backgrounds/whitegoods-appliances.webp",
  "womens-clothing": "/category-backgrounds/womens-clothing.webp",
};

export function getCategoryCollageImage(topLevelStableKey: string | undefined): string | null {
  if (!topLevelStableKey) return null;
  return CATEGORY_COLLAGES[topLevelStableKey] ?? null;
}
