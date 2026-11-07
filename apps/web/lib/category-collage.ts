// Hero background per TOP-LEVEL category (components/category-hero.tsx shows it whole): 9-11
// high-resolution CC0 / public-domain photos of that category's items, blended into one 2880x960
// image in the homepage banner's style by scripts/gen-category-heroes.mjs. The photos were found on
// Openverse and checked by eye, with off-topic shots, scans, brand logos, characters and real
// people left out; provenance is in scripts/category-background-sources.json. Every one of the 35
// non-Cars top-level categories is covered (Cars has its own photo hero in
// components/cars-landing.tsx). File names end in -hd so caches of older images are never served.
const CATEGORY_COLLAGES: Record<string, string> = {
  "animals-supplies": "/category-backgrounds/animals-supplies-hd.webp",
  "antiques-art": "/category-backgrounds/antiques-art-hd.webp",
  "audio-tv-photo": "/category-backgrounds/audio-tv-photo-hd.webp",
  "bikes-mopeds": "/category-backgrounds/bikes-mopeds-hd.webp",
  books: "/category-backgrounds/books-hd.webp",
  "business-goods": "/category-backgrounds/business-goods-hd.webp",
  "car-misc": "/category-backgrounds/car-misc-hd.webp",
  "car-parts": "/category-backgrounds/car-parts-hd.webp",
  "caravans-camping": "/category-backgrounds/caravans-camping-hd.webp",
  "cd-dvd": "/category-backgrounds/cd-dvd-hd.webp",
  "children-babies": "/category-backgrounds/children-babies-hd.webp",
  collectibles: "/category-backgrounds/collectibles-hd.webp",
  "computers-software": "/category-backgrounds/computers-software-hd.webp",
  "consoles-games": "/category-backgrounds/consoles-games-hd.webp",
  "contacts-messages": "/category-backgrounds/contacts-messages-hd.webp",
  "diy-renovation": "/category-backgrounds/diy-renovation-hd.webp",
  "garden-patio": "/category-backgrounds/garden-patio-hd.webp",
  "hobbies-leisure": "/category-backgrounds/hobbies-leisure-hd.webp",
  holidays: "/category-backgrounds/holidays-hd.webp",
  "home-interior": "/category-backgrounds/home-interior-hd.webp",
  "houses-rooms": "/category-backgrounds/houses-rooms-hd.webp",
  "jewelry-bags-beauty": "/category-backgrounds/jewelry-bags-beauty-hd.webp",
  jobs: "/category-backgrounds/jobs-hd.webp",
  "mens-clothing": "/category-backgrounds/mens-clothing-hd.webp",
  miscellaneous: "/category-backgrounds/miscellaneous-hd.webp",
  motorcycles: "/category-backgrounds/motorcycles-hd.webp",
  "music-instruments": "/category-backgrounds/music-instruments-hd.webp",
  "services-trades": "/category-backgrounds/services-trades-hd.webp",
  "sports-fitness": "/category-backgrounds/sports-fitness-hd.webp",
  "stamps-coins": "/category-backgrounds/stamps-coins-hd.webp",
  telecom: "/category-backgrounds/telecom-hd.webp",
  tickets: "/category-backgrounds/tickets-hd.webp",
  "watersports-boats": "/category-backgrounds/watersports-boats-hd.webp",
  "whitegoods-appliances": "/category-backgrounds/whitegoods-appliances-hd.webp",
  "womens-clothing": "/category-backgrounds/womens-clothing-hd.webp",
};

export function getCategoryCollageImage(topLevelStableKey: string | undefined): string | null {
  if (!topLevelStableKey) return null;
  return CATEGORY_COLLAGES[topLevelStableKey] ?? null;
}
