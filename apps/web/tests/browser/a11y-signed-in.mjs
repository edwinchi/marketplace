// axe WCAG 2.1 A/AA scan of MarketitNow's SIGNED-IN pages, as the dedicated test account
// (claude-agent-test@marketitnow.net, AGENTS.md §12). Signs in without its password: a one-time
// magic-link token from the Supabase admin API (no email is sent), redeemed through the app's own
// /auth/confirm route. Only views pages: no clicks, no form submissions. Never prints secrets.
// usage: node a11y-signed-in.mjs <baseUrl>
import fs from "node:fs";
import { createRequire } from "node:module";
const { chromium } = await import("playwright-core");
const AXE = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const B = process.argv[2] ?? "http://localhost:3217";
const EMAIL = "claude-agent-test@marketitnow.net";
const env = fs.readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
const envVar = (n) => env.match(new RegExp(`^${n}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");
const SUPA = envVar("NEXT_PUBLIC_SUPABASE_URL");
const KEY = envVar("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPA || !KEY) throw new Error("Supabase URL / service key missing from .env.local");
const admin = (p, init = {}) => fetch(`${SUPA}/auth/v1${p}`, { ...init, headers: { apikey: KEY, authorization: `Bearer ${KEY}`, "content-type": "application/json", ...init.headers } });

// 1. Find the account (all pages: the admin API's filter param isn't honoured). Created only with
//    --create (owner's call): confirmed, random password generated and discarded on the spot, so
//    nobody can sign in with a password; access is only via an admin one-time link like below.
let users = [];
for (let p = 1; p <= 50; p++) {
  const page = (await (await admin(`/admin/users?per_page=200&page=${p}`)).json()).users ?? [];
  users = users.concat(page);
  if (page.length < 200) break;
}
let user = users.find((u) => u.email === EMAIL);
if (!user && process.argv.includes("--create")) {
  const { randomBytes } = await import("node:crypto");
  const res = await admin("/admin/users", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, email_confirm: true, password: randomBytes(32).toString("base64url"), user_metadata: { test_account: true, purpose: "automated accessibility/QA scans (AGENTS.md)" } }),
  });
  const created = await res.json();
  if (!res.ok) { console.log(`STOP: could not create ${EMAIL}:`, created.msg ?? created.error_description ?? res.status); process.exit(2); }
  user = created;
  console.log(`created test account ${EMAIL} (password discarded; sign-in only via admin one-time link)`);
}
if (!user) { console.log(`STOP: ${EMAIL} does not exist. Re-run with --create to create it (owner sign-off).`); process.exit(2); }
console.log(`test account found (created ${user.created_at.slice(0, 10)}, confirmed: ${!!user.email_confirmed_at})`);

// 2. One-time sign-in token.
const link = await (await admin("/admin/generate_link", { method: "POST", body: JSON.stringify({ type: "magiclink", email: EMAIL }) })).json();
const tokenHash = link.hashed_token ?? link.properties?.hashed_token;
if (!tokenHash) { console.log("STOP: no token returned:", link.msg ?? link.error ?? Object.keys(link)); process.exit(2); }

for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/robots.txt")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(`${B}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=/my-account`, { waitUntil: "networkidle" });
const signedIn = !new URL(page.url()).pathname.startsWith("/login");
console.log(signedIn ? `signed in (landed on ${new URL(page.url()).pathname})` : `STOP: sign-in failed, landed on ${page.url()}`);
if (!signedIn) { await browser.close(); process.exit(2); }

const ROUTES = ["/my-account", "/my-account/profile", "/my-account/profile/edit", "/my-account/my-listings", "/my-account/favorites", "/my-account/favorite-sellers", "/my-account/saved-searches", "/my-account/recently-viewed", "/my-account/transactions", "/my-account/bids", "/my-account/invoices", "/my-account/referrals", "/my-account/seller-insights", "/my-account/ai-features", "/my-account/business", "/my-account/payments/enable", "/my-account/preferences/location", "/my-account/preferences/marketing", "/my-account/preferences/notifications", "/my-account/sell", "/messages", "/notifications", "/listings/new", "/experiences/my-reviews"];
const byRule = new Map();
const visited = [];
const errors = [];
page.on("pageerror", (e) => errors.push(`[${new URL(page.url()).pathname}] ${e.message.slice(0, 140)}`));
for (const [name, vp] of [["phone", { width: 390, height: 844 }], ["desktop", { width: 1440, height: 900 }]]) {
  await page.setViewportSize(vp);
  for (const r of ROUTES) {
    const res = await page.goto(B + r, { waitUntil: "networkidle" }).catch((e) => ({ status: () => `ERR ${e.message.slice(0, 60)}` }));
    const landed = new URL(page.url()).pathname;
    if (name === "phone") visited.push(`${r} -> ${res?.status?.() ?? "?"}${landed !== r ? ` (${landed})` : ""}`);
    if (landed.startsWith("/login")) { errors.push(`${r}: bounced to login (session lost?)`); continue; }
    await page.addScriptTag({ content: AXE });
    const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })).violations);
    for (const x of v.filter((x) => x.impact === "serious" || x.impact === "critical")) {
      const e = byRule.get(x.id) ?? { impact: x.impact, help: x.help, where: new Set(), nodes: [] };
      e.where.add(`${name}:${r}`);
      for (const n of x.nodes.slice(0, 3)) if (e.nodes.length < 6) e.nodes.push(`${r} ${n.html.replace(/\s+/g, " ").slice(0, 150)} :: ${(n.failureSummary ?? "").split("\n")[1]?.trim().slice(0, 100)}`);
      byRule.set(x.id, e);
    }
  }
}
await browser.close();
console.log("pages:", visited.join(" | "));
if (errors.length) console.log("page errors:", errors.join(" | "));
console.log(`\nscanned ${ROUTES.length * 2} signed-in page views; serious/critical rule types: ${byRule.size}`);
for (const [id, e] of byRule) {
  console.log(`\n[${e.impact}] ${id}: ${e.help}\n  where: ${[...e.where].join(", ")}`);
  for (const n of e.nodes) console.log("  - " + n);
}
process.exit(byRule.size ? 1 : 0);
