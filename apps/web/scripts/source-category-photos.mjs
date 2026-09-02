// Sources one representative photo per category from Wikipedia's own article thumbnail (better
// curated/composed than a raw Commons full-text search), verifies the underlying Commons file
// actually carries a free license (rejects anything without a recognized CC/PD tag -- a Commons
// filename alone is not proof of license, confirmed by testing this against a real file whose name
// looked like a paid stock photo but whose real Commons metadata was genuinely CC BY-SA 4.0),
// downloads it, uploads it to the `category-photos` Storage bucket, and records source_url/author/
// license in category_gallery_images for attribution -- matching the existing 12 rows' format
// exactly (spot-checked before writing this).
//
// Run: node scripts/source-category-photos.mjs
// Reads CATEGORY_TERMS below -- hand-picked search terms, not the raw category name, because a
// literal category name (e.g. "Business Goods") rarely matches a real Wikipedia article.

import fs from "fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1];
const SERVICE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1];
const HEADERS = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
const UA = "AfroDeals/1.0 (https://afrodeals.net; contact: apehgongedwin@gmail.com)";

const FREE_LICENSE_RE = /^(CC0|CC BY|CC BY-SA|Public domain|PD)/i;

// stable_key -> Wikipedia article title to source the photo from.
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

async function alreadyHasImage(categoryId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/category_gallery_images?category_id=eq.${categoryId}&select=id&limit=1`, { headers: HEADERS });
  const rows = await res.json();
  return rows.length > 0;
}

async function fetchWikipediaThumbnail(title) {
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=1000&redirects=1`,
    { headers: { "User-Agent": UA } },
  );
  const json = await res.json();
  const page = Object.values(json.query?.pages ?? {})[0];
  return page?.thumbnail?.source ?? null;
}

function filenameFromCommonsUrl(url) {
  const m = url.match(/\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+?)(?:\/\d+px-[^/]+)?(?:\?|$)/i);
  return m ? decodeURIComponent(m[1]) : null;
}

async function fetchCommonsLicense(fileTitle) {
  const res = await fetch(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(`File:${fileTitle}`)}&prop=imageinfo&iiprop=url|extmetadata&format=json`,
    { headers: { "User-Agent": UA } },
  );
  const json = await res.json();
  const page = Object.values(json.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const license = info.extmetadata?.LicenseShortName?.value ?? null;
  const artist = info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, "").trim() ?? "Unknown";
  return { url: info.url, license, artist };
}

async function uploadAndRecord(categoryId, imageUrl, license, artist) {
  const imgRes = await fetch(imageUrl, { headers: { "User-Agent": UA } });
  if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const storageKey = `${categoryId}/0.jpg`;

  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/category-photos/${storageKey}`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: buffer,
  });
  if (!uploadRes.ok) throw new Error(`Storage upload failed: ${uploadRes.status} ${await uploadRes.text()}`);

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/category_gallery_images`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ category_id: categoryId, storage_key: storageKey, sort_order: 0, source_url: imageUrl, author: artist, license }),
  });
  if (!insertRes.ok) throw new Error(`Row insert failed: ${insertRes.status} ${await insertRes.text()}`);
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

  const thumb = await fetchWikipediaThumbnail(term);
  if (!thumb) {
    skipped.push({ stableKey, reason: `no Wikipedia thumbnail for "${term}"` });
    continue;
  }
  const filename = filenameFromCommonsUrl(thumb);
  if (!filename) {
    skipped.push({ stableKey, reason: `couldn't parse Commons filename from ${thumb}` });
    continue;
  }
  const licenseInfo = await fetchCommonsLicense(filename);
  if (!licenseInfo || !licenseInfo.license || !FREE_LICENSE_RE.test(licenseInfo.license)) {
    skipped.push({ stableKey, reason: `no free license found (got: ${licenseInfo?.license ?? "none"})`, file: filename });
    continue;
  }

  try {
    await uploadAndRecord(categoryId, licenseInfo.url, licenseInfo.license, licenseInfo.artist);
    console.log(`OK   ${stableKey.padEnd(24)} <- "${term}" (${licenseInfo.license}, ${licenseInfo.artist})`);
    done++;
  } catch (e) {
    skipped.push({ stableKey, reason: String(e.message ?? e) });
  }
}

console.log(`\nDone: ${done} uploaded, ${skipped.length} skipped.`);
if (skipped.length) console.log(JSON.stringify(skipped, null, 1));
