// Security regression test: what can an anonymous visitor read straight from the database?
// Takes every table created in supabase/migrations, asks the Supabase REST API for one row of each
// with only the public (anon) key, exactly as a stranger's browser could, and fails if a table
// outside PUBLIC_TABLES returns data. Read-only, prints table names and counts, never row contents.
// usage (from apps/web): node tests/browser/anon-access.mjs
import fs from "node:fs";
import path from "node:path";

// Marketplace catalogue data that is meant to be public. Anything else returning rows to an
// anonymous caller is a missing or broken row-level-security policy.
const PUBLIC_TABLES = new Set([
  "app_settings", // only require_login (a public behaviour flag)
  "numeric_settings", // public prices of listing tiers and fees
  "categories", "category_translations", "category_attributes", "category_gallery_images",
  "attributes", "attribute_translations", "attribute_options", "attribute_option_translations",
  "languages", "language_settings",
  "listings", "listing_media", "listing_translations", "listing_attribute_values", "listing_attribute_multi_options",
  "locations", // city-level points; see THREAT-MODEL R8 about postcodes
  "reviews",
  "vehicle_makes", "vehicle_models",
]);

const env = fs.readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
const envVar = (n) => process.env[n] ?? env.match(new RegExp(`^${n}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");
const URL_ = envVar("NEXT_PUBLIC_SUPABASE_URL");
const KEY = envVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!URL_ || !KEY) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing");

const migrations = path.resolve(new URL("../../../../supabase/migrations", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"));
const tables = [...new Set(
  fs.readdirSync(migrations).filter((f) => f.endsWith(".sql"))
    .flatMap((f) => [...fs.readFileSync(path.join(migrations, f), "utf8").matchAll(/create table (?:if not exists )?(?:public\.)?([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase())),
)].filter((t) => t !== "if").sort();

const leaks = [];
let readable = 0;
for (const t of tables) {
  const res = await fetch(`${URL_}/rest/v1/${t}?select=*&limit=1`, { headers: { apikey: KEY, authorization: `Bearer ${KEY}`, Prefer: "count=exact" } });
  if (!res.ok) continue; // 401/404: not exposed (partitions, internal tables)
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) continue;
  readable++;
  const total = res.headers.get("content-range")?.split("/")[1] ?? "?";
  if (!PUBLIC_TABLES.has(t)) leaks.push(`${t} (${total} rows)`);
}
console.log(`${tables.length} tables checked; ${readable} readable anonymously, all expected: ${leaks.length === 0}`);
if (leaks.length) {
  console.log("FAIL  readable without signing in, but not meant to be public:\n  " + leaks.join("\n  "));
  process.exit(1);
}
console.log("PASS  no private table is readable without signing in");
