// One-time backfill for categories.name_embedding (supabase/migrations/20260101007000_category_embeddings.sql).
// Run once after that migration is applied, and again any time new leaf categories are added --
// safe to re-run, it just overwrites every row's embedding with a freshly computed one.
//
// See app/listings/new/analyze-photo-action.ts for why this exists: the AI photo-analysis feature
// used to ask a vision model to pick a category name verbatim out of a ~210-item list, which a
// free-tier fallback model occasionally hallucinated (confirmed live: a backpack photo got filed
// under Cars -> SUVs and crossovers). It now embeds its own generated title+description and picks
// the nearest category by cosine similarity instead -- this script populates the category side of
// that comparison, once, so no embedding call is needed per category at request time.
//
// Run: node scripts/backfill-category-embeddings.mjs

import fs from "fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1];
const SERVICE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1];
const OPENROUTER_KEY = env.match(/OPENROUTER_API_KEY=(\S+)/)[1];
const HEADERS = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json" };
const EMBEDDING_MODEL = "baai/bge-m3"; // must match lib/embeddings.ts's getTextEmbedding

async function fetchAllRows(path) {
  const rows = [];
  let from = 0;
  const pageSize = 1000;
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { ...HEADERS, Range: `${from}-${from + pageSize - 1}` },
    });
    const page = await res.json();
    if (!Array.isArray(page) || page.length === 0) break;
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function getTextEmbedding(text) {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${OPENROUTER_KEY}`, "http-referer": "https://marketitnow.net", "x-title": "MarketitNow" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });
  if (!res.ok) {
    console.error(`Embedding request failed (${res.status}):`, await res.text().catch(() => ""));
    return null;
  }
  const json = await res.json();
  const embedding = json?.data?.[0]?.embedding;
  return Array.isArray(embedding) ? embedding : null;
}

const categories = await fetchAllRows("categories?select=id,parent_id&is_active=eq.true&allows_listings=eq.true");
const translations = await fetchAllRows("category_translations?select=category_id,name&language_code=eq.en");
const nameById = new Map(translations.map((t) => [t.category_id, t.name]));

console.log(`${categories.length} leaf categories to embed.`);

let done = 0;
for (const c of categories) {
  const name = nameById.get(c.id) ?? c.id;
  const parentName = c.parent_id ? nameById.get(c.parent_id) : null;
  const label = parentName ? `${parentName} → ${name}` : name;

  const embedding = await getTextEmbedding(label);
  if (!embedding) {
    console.warn(`Skipping ${label} (${c.id}) -- embedding failed.`);
    continue;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/categories?id=eq.${c.id}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify({ name_embedding: `[${embedding.join(",")}]` }),
  });
  if (!res.ok) {
    console.error(`Failed to store embedding for ${label} (${c.id}):`, await res.text().catch(() => ""));
    continue;
  }
  done++;
  if (done % 25 === 0) console.log(`${done}/${categories.length}...`);
}

console.log(`Done: ${done}/${categories.length} categories embedded.`);
