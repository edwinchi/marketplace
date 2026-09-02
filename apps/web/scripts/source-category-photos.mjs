// Sources one representative photo per TOP-LEVEL category from Wikipedia's own article thumbnail
// (better curated/composed than a raw Commons full-text search), verifies the underlying Commons
// file actually carries a free license (rejects anything without a recognized CC/PD tag -- a
// Commons filename alone is not proof of license, confirmed by testing this against a real file
// whose name looked like a paid stock photo but whose real Commons metadata was genuinely
// CC BY-SA 4.0), downloads it, uploads it to the `category-photos` Storage bucket, and records
// source_url/author/license in category_gallery_images for attribution -- matching the existing
// 12 rows' format exactly (spot-checked before writing this).
//
// Run: node scripts/source-category-photos.mjs
// Reads CATEGORY_TERMS below -- hand-picked search terms, not the raw category name, because a
// literal category name (e.g. "Business Goods") rarely matches a real Wikipedia article. Only
// covers the ~36 top-level categories, curated by hand since there are few enough to do well; see
// scripts/source-subcategory-photos.mjs for the auto-named bulk pass over the ~964 level 2/3 ones.

import { SUPABASE_URL, HEADERS, alreadyHasImage, sourceOneCategory } from "./_photo-sourcing-lib.mjs";

const CATEGORY_TERMS = {
  "animals-supplies": "Pet",
  "antiques-art": "Antique",
  "audio-tv-photo": "Home cinema",
  "bikes-mopeds": "Bicycle",
  books: "Bookselling",
  "business-goods": "Office supplies",
  "car-misc": "Car alarm",
  "car-parts": "Automobile engine",
  cars: "Car",
  "caravans-camping": "Caravan (towed trailer)",
  "cd-dvd": "Compact disc",
  "children-babies": "Infant",
  collectibles: "Collectable",
  "consoles-games": "Video game console",
  "diy-renovation": "Drill (tool)",
  "garden-patio": "Garden furniture",
  "hobbies-leisure": "Hobby",
  holidays: "Tourism",
  "houses-rooms": "House",
  "jewelry-bags-beauty": "Jewellery",
  "mens-clothing": "Suit (clothing)",
  miscellaneous: "Flea market",
  motorcycles: "Motorcycle",
  "music-instruments": "Musical instrument",
  "services-trades": "Craft production",
  "stamps-coins": "Postage stamp",
  tickets: "Concert",
  "watersports-boats": "Sailboat",
  "whitegoods-appliances": "Home appliance",
};

async function getCategoryId(stableKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/categories?stable_key=eq.${stableKey}&select=id`, { headers: HEADERS });
  const rows = await res.json();
  return rows[0]?.id ?? null;
}

let done = 0;
let skipped = [];

for (const [stableKey, term] of Object.entries(CATEGORY_TERMS)) {
  const categoryId = await getCategoryId(stableKey);
  if (!categoryId) {
    skipped.push({ stableKey, reason: "category not found" });
    continue;
  }
  if (await alreadyHasImage(categoryId)) {
    console.log(`skip ${stableKey}: already has an image`);
    continue;
  }

  const result = await sourceOneCategory(categoryId, term);
  if (result.ok) {
    console.log(`OK   ${stableKey.padEnd(24)} <- "${term}" (${result.license}, ${result.artist})`);
    done++;
  } else {
    skipped.push({ stableKey, reason: result.reason });
  }
}

console.log(`\nDone: ${done} uploaded, ${skipped.length} skipped.`);
if (skipped.length) console.log(JSON.stringify(skipped, null, 1));
