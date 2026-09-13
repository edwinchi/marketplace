// Dedicated hero collage banners per TOP-LEVEL category -- each a 3x3 grid of 9 real,
// individually-visible photos representative of that category (e.g. Animals & Supplies: dog, cat,
// parrot, fish, rabbit, hamster, horses, guinea pigs, plus real pet-supply shots like a dog collar
// and feeding bowl), sourced CC0 and vetted image-by-image the same way every other photo asset in
// this project has been -- see scratchpad's category-collages/ build for the sourcing/vetting pass
// and build-grid-collage.mjs for the compositor. Every one of the 35 non-Cars top-level categories
// is covered (Cars has its own dedicated photo hero in components/cars-landing.tsx instead, wired
// in separately since that branch never reads heroBannerStyle at all).
const CATEGORY_COLLAGES: Record<string, string> = {
  "animals-supplies": "/category-collages/animals-supplies.jpg",
  "antiques-art": "/category-collages/antiques-art.jpg",
  "audio-tv-photo": "/category-collages/audio-tv-photo.jpg",
  "bikes-mopeds": "/category-collages/bikes-mopeds.jpg",
  books: "/category-collages/books.jpg",
  "business-goods": "/category-collages/business-goods.jpg",
  "car-misc": "/category-collages/car-misc.jpg",
  "car-parts": "/category-collages/car-parts.jpg",
  "caravans-camping": "/category-collages/caravans-camping.jpg",
  "cd-dvd": "/category-collages/cd-dvd.jpg",
  "children-babies": "/category-collages/children-babies.jpg",
  collectibles: "/category-collages/collectibles.jpg",
  "computers-software": "/category-collages/computers-software.jpg",
  "consoles-games": "/category-collages/consoles-games.jpg",
  "contacts-messages": "/category-collages/contacts-messages.jpg",
  "diy-renovation": "/category-collages/diy-renovation.jpg",
  "garden-patio": "/category-collages/garden-patio.jpg",
  "hobbies-leisure": "/category-collages/hobbies-leisure.jpg",
  holidays: "/category-collages/holidays.jpg",
  "home-interior": "/category-collages/home-interior.jpg",
  "houses-rooms": "/category-collages/houses-rooms.jpg",
  "jewelry-bags-beauty": "/category-collages/jewelry-bags-beauty.jpg",
  jobs: "/category-collages/jobs.jpg",
  "mens-clothing": "/category-collages/mens-clothing.jpg",
  miscellaneous: "/category-collages/miscellaneous.jpg",
  motorcycles: "/category-collages/motorcycles.jpg",
  "music-instruments": "/category-collages/music-instruments.jpg",
  "services-trades": "/category-collages/services-trades.jpg",
  "sports-fitness": "/category-collages/sports-fitness.jpg",
  "stamps-coins": "/category-collages/stamps-coins.jpg",
  telecom: "/category-collages/telecom.jpg",
  tickets: "/category-collages/tickets.jpg",
  "watersports-boats": "/category-collages/watersports-boats.jpg",
  "whitegoods-appliances": "/category-collages/whitegoods-appliances.jpg",
  "womens-clothing": "/category-collages/womens-clothing.jpg",
};

export function getCategoryCollageImage(topLevelStableKey: string | undefined): string | null {
  if (!topLevelStableKey) return null;
  return CATEGORY_COLLAGES[topLevelStableKey] ?? null;
}
