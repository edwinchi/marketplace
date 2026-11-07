// End-to-end check of "Download my data" (GDPR Art. 15/20), as the test account
// claude-agent-test@marketitnow.net, signed in through a one-time admin link (no password).
// Checks: signed out gets 401; signed in gets a JSON attachment with the account's own email and
// profile and every section; another user's email doesn't appear. Only downloads; changes nothing.
// usage (from apps/web): node tests/browser/data-export.mjs [baseUrl]
import fs from "node:fs";
const { chromium } = await import("playwright-core");
const B = process.argv[2] ?? "http://localhost:3217";
const EMAIL = "claude-agent-test@marketitnow.net";
const env = fs.readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
const envVar = (n) => env.match(new RegExp(`^${n}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");
const SUPA = envVar("NEXT_PUBLIC_SUPABASE_URL");
const KEY = envVar("SUPABASE_SERVICE_ROLE_KEY");
const admin = (p, init = {}) => fetch(`${SUPA}/auth/v1${p}`, { ...init, headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", ...init.headers } });

let failed = 0;
const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}`); if (!ok) failed++; };

const anon = await fetch(`${B}/api/account/data-export`);
check(anon.status === 401, `signed out → 401 (got ${anon.status})`);

const link = await (await admin("/admin/generate_link", { method: "POST", body: JSON.stringify({ type: "magiclink", email: EMAIL }) })).json();
const tokenHash = link.hashed_token ?? link.properties?.hashed_token;
if (!tokenHash) { console.log("STOP: no sign-in token (does the test account exist?)"); process.exit(2); }
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.goto(`${B}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=/my-account/profile/edit`, { waitUntil: "networkidle" });
check(new URL(page.url()).pathname === "/my-account/profile/edit", "signed in, on the profile settings page");
check(await page.getByRole("link", { name: /download my data/i }).count() === 1, "\"Download my data\" link is on the page");

const res = await page.request.get(`${B}/api/account/data-export`);
const disposition = res.headers()["content-disposition"] ?? "";
check(res.status() === 200, `signed in → 200 (got ${res.status()})`);
check(/attachment; filename="marketitnow-my-data-\d{4}-\d{2}-\d{2}\.json"/.test(disposition), "sent as a dated .json attachment");
check((res.headers()["cache-control"] ?? "").includes("no-store"), "not cached");
const data = await res.json();
check(data.account?.email === EMAIL, "contains the account's own email");
check(data.profile && typeof data.profile.id === "string", "contains the profile");
for (const s of ["listings", "favorites", "saved_searches", "notifications", "messages", "offers", "orders", "reviews", "reports_filed", "addresses"]) check(s in data, `section "${s}" present`);
check(Array.isArray(data.about?.incomplete_sections) && data.about.incomplete_sections.length === 0, `every section read without errors ${JSON.stringify(data.about?.incomplete_sections ?? [])}`);
const text = JSON.stringify(data);
check(!/"title_embedding"|"image_embedding"/.test(text), "no AI search vectors");
// Any other address in the file would be someone else's data (messages carry no addresses).
const otherEmails = [...new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])].filter((e) => e.toLowerCase() !== EMAIL);
check(otherEmails.length === 0, `no other user's email in the export${otherEmails.length ? ` (found ${otherEmails.length})` : ""}`);

await browser.close();
console.log(failed ? `${failed} check(s) failed` : "all data-export checks passed");
process.exit(failed ? 1 : 0);
