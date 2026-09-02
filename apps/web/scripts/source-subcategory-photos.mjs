// Bulk pass over every level-2/3 subcategory missing a photo (~964 of them, mostly imported
// wholesale from Marktplaats' taxonomy -- see supabase/migrations/20260101004000_marktplaats_
// subcategory_taxonomy.sql). Unlike source-category-photos.mjs's ~36 hand-curated top-level terms,
// there are too many of these to curate individually -- each category's own English name (from
// category_translations) is used directly as the Wikipedia lookup term instead, so the hit rate is
// necessarily lower (a name like "Predom" or "Elddis" -- real appliance/caravan brands -- won't
// always have a matching Wikipedia article, and that's fine: sourceOneCategory() skips cleanly
// rather than guessing).
//
// Categories with no real English translation yet (name falls back to the raw stable_key, e.g.
// "jobs-grp-bouw-transport-en-techniek") are skipped outright -- a stable_key is not a search term.
//
// Run: node scripts/source-subcategory-photos.mjs [--limit N]
// Polite ~250ms delay between categories (Wikimedia is a shared free resource, not a paid API).

import { SUPABASE_URL, HEADERS, alreadyHasImage, sourceOneCategory, sleep } from "./_photo-sourcing-lib.mjs";

const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : Infinity;

async function fetchAllRows(path) {
  const all = [];
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { ...HEADERS, Range: `${from}-${from + PAGE - 1}` },
    });
    const page = await res.json();
    if (!Array.isArray(page)) throw new Error(`Unexpected response for ${path}: ${JSON.stringify(page)}`);
    all.push(...page);
    if (page.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// A name that's just the raw stable_key leaking through (no real translation yet) always looks
// like this: lowercase, digits, hyphens only. A real English name never does.
function looksLikeUntranslatedStableKey(name) {
  return /^[a-z0-9-]+$/.test(name);
}

const [categories, translations, images] = await Promise.all([
  fetchAllRows("categories?select=id,stable_key,level&level=in.(2,3)&is_active=eq.true&order=level.asc"),
  fetchAllRows("category_translations?select=category_id,name&language_code=eq.en"),
  fetchAllRows("category_gallery_images?select=category_id"),
]);

const nameById = new Map(translations.map((t) => [t.category_id, t.name]));
const withImages = new Set(images.map((i) => i.category_id));

const candidates = categories
  .filter((c) => !withImages.has(c.id))
  .map((c) => ({ ...c, name: nameById.get(c.id) ?? c.stable_key }))
  .filter((c) => !looksLikeUntranslatedStableKey(c.name));

console.log(`${categories.length} level-2/3 categories, ${candidates.length} missing an image with a real name to try (capped at ${LIMIT === Infinity ? "no limit" : LIMIT}).`);

let done = 0;
const skipped = [];
let processed = 0;

for (const cat of candidates) {
  if (processed >= LIMIT) break;
  processed++;

  // Re-check right before writing -- a category can gain an image mid-run if this script (or the
  // top-level one) is re-run concurrently; cheap enough to just ask again.
  if (await alreadyHasImage(cat.id)) continue;

  const result = await sourceOneCategory(cat.id, cat.name);
  if (result.ok) {
    console.log(`OK   [L${cat.level}] ${cat.name.padEnd(40)} (${result.license}, ${result.artist})`);
    done++;
  } else {
    skipped.push({ name: cat.name, level: cat.level, reason: result.reason });
  }
  await sleep(250);
}

console.log(`\nDone: ${done} uploaded, ${skipped.length} skipped, ${processed} processed this run.`);
console.log(`Skip reasons summary:`);
const reasonCounts = {};
for (const s of skipped) {
  const key = s.reason.split(" (got:")[0].split(" for ")[0];
  reasonCounts[key] = (reasonCounts[key] ?? 0) + 1;
}
console.log(JSON.stringify(reasonCounts, null, 1));
