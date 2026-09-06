// One-off full database export via the REST API (no direct Postgres connection string is
// available in this environment, so pg_dump isn't an option). Writes every real application table
// to a JSON file, plus the auth.users list via the Admin Auth API, into a timestamped directory
// OUTSIDE the git repo -- this is real, potentially sensitive user data (emails, addresses,
// payment references) and must never be committed. Schema/DDL isn't re-exported here since it's
// already fully captured as SQL in supabase/migrations/*.sql, which lives in git.
import { writeFileSync, mkdirSync } from "fs";
import { config } from "dotenv";

config({ path: new URL("../.env.local", import.meta.url) });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Missing Supabase URL/service key in .env.local");

const OUT_DIR = process.argv[2];
if (!OUT_DIR) throw new Error("Usage: node backup-database.mjs <output-dir>");
mkdirSync(OUT_DIR, { recursive: true });

// PostGIS extension metadata, not application data -- reconstructed automatically by the
// extension itself, not worth exporting.
const SKIP_TABLES = new Set(["geography_columns", "geometry_columns", "spatial_ref_sys"]);

const PAGE_SIZE = 1000;

async function fetchAllRows(table) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: SERVICE_KEY,
        authorization: `Bearer ${SERVICE_KEY}`,
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        Prefer: "count=exact",
      },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    const contentRange = res.headers.get("content-range"); // e.g. "0-999/1234"
    const total = contentRange?.split("/")[1];
    if (batch.length < PAGE_SIZE || (total && rows.length >= Number(total))) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

async function fetchAllAuthUsers() {
  const users = [];
  let page = 1;
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`, {
      headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!res.ok) throw new Error(`auth.users page ${page}: HTTP ${res.status} ${await res.text()}`);
    const json = await res.json();
    const batch = json.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) break;
    page++;
  }
  return users;
}

async function main() {
  // Discover the real table list from the schema itself, rather than hardcoding it, so this
  // stays correct as tables are added later.
  const schemaRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
  });
  const schema = await schemaRes.json();
  const defs = schema.definitions ?? schema.components?.schemas ?? {};
  const tables = Object.keys(defs)
    .filter((t) => !SKIP_TABLES.has(t))
    .sort();

  const summary = [];

  for (const table of tables) {
    try {
      const rows = await fetchAllRows(table);
      writeFileSync(`${OUT_DIR}/${table}.json`, JSON.stringify(rows, null, 2));
      summary.push({ table, rows: rows.length });
      console.log(`${table}: ${rows.length} rows`);
    } catch (err) {
      summary.push({ table, error: String(err) });
      console.error(`${table}: FAILED -- ${err}`);
    }
  }

  try {
    const users = await fetchAllAuthUsers();
    writeFileSync(`${OUT_DIR}/auth_users.json`, JSON.stringify(users, null, 2));
    summary.push({ table: "auth_users", rows: users.length });
    console.log(`auth_users: ${users.length} rows`);
  } catch (err) {
    summary.push({ table: "auth_users", error: String(err) });
    console.error(`auth_users: FAILED -- ${err}`);
  }

  writeFileSync(`${OUT_DIR}/_summary.json`, JSON.stringify({ generatedAt: new Date().toISOString(), summary }, null, 2));
  console.log("\nDone. Summary written to _summary.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
