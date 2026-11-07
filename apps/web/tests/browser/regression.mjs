// Verifies a MarketitNow build: health endpoint, CSP, console/CSP errors on key pages, header logo
// overlap at phone widths, logo/icon assets served, and header screenshots.
// usage: node regression.mjs <baseUrl> <outDir> <tag>
const { chromium } = await import("playwright-core");
const [B = "http://localhost:3217", OUT = ".", TAG = "local"] = process.argv.slice(2);
let fail = 0;
const check = (name, ok, detail = "") => { if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`); };

for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/robots.txt")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }

const h = await fetch(B + "/api/health");
const hj = await h.json().catch(() => ({}));
check("/api/health returns ok with database up", h.status === 200 && hj.ok === true && hj.database === "up", JSON.stringify(hj));
check("/api/health is not cached", (h.headers.get("cache-control") ?? "").includes("no-store"));
const home = await fetch(B + "/");
const csp = home.headers.get("content-security-policy") ?? "";
check("CSP has no unsafe-eval", csp.includes("script-src") && !csp.includes("unsafe-eval"));
check("Permissions-Policy present", !!home.headers.get("permissions-policy"));
for (const a of ["/logo.svg?v=5", "/logo-compact.svg?v=5", "/logo-mark.svg", "/logo.png", "/logo-sm.png", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/favicon.ico", "/apple-icon.png", "/icon.png"]) {
  const r = await fetch(B + a);
  const type = r.headers.get("content-type") ?? "";
  check(`asset ${a}`, r.ok && /image|icon/.test(type), `${r.status} ${type}`);
}

const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error" || /Refused to|Content Security|Permissions policy/i.test(m.text())) errors.push(`[${new URL(page.url()).pathname}] ${m.text().slice(0, 180)}`); });
page.on("pageerror", (e) => errors.push(`[${new URL(page.url()).pathname}] pageerror ${e.message.slice(0, 180)}`));
await page.goto(B + "/", { waitUntil: "networkidle" });
const listing = await page.locator('a[href*="/listings/"]:not([href$="/new"])').first().getAttribute("href");
for (const p of [listing, "/signup", "/login", "/safety", "/documents/buying-checklist", "/admin", "/offline.html", "/app"]) {
  if (p) await page.goto(B + p, { waitUntil: "networkidle" }).catch((e) => errors.push(`goto ${p}: ${e.message}`));
}
await page.goto(B + "/login?tab=signup", { waitUntil: "networkidle" });
await page.waitForTimeout(2500); // let Turnstile load
check("no console/CSP errors on home, listing, signup, login, safety, documents, admin, offline, app", errors.length === 0, errors.join(" | "));

for (const width of [320, 360, 390, 430]) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(B + "/", { waitUntil: "networkidle" });
  const logo = await page.locator('img[alt="MarketitNow"]:visible').first().boundingBox();
  const icons = await page.locator('div.fixed a[href="/"][aria-label], div.fixed a[href="/messages"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => ({ x: r.x, w: r.width })));
  const search = icons.filter((r) => r.w <= 40).sort((a, b) => a.x - b.x)[0];
  const ok = !!logo && !!search && logo.x + logo.width <= search.x + 0.5 && logo.x >= 0;
  check(`phone ${width}px: logo doesn't run under the icons`, ok, logo && search ? `logo ${Math.round(logo.x)}-${Math.round(logo.x + logo.width)}, first icon at ${Math.round(search.x)}` : "not found");
  if (width === 390) await page.screenshot({ path: `${OUT}/hdr-${TAG}-phone.png`, clip: { x: 0, y: 0, width, height: 70 } });
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(B + "/", { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/hdr-${TAG}-desktop.png`, clip: { x: 0, y: 0, width: 720, height: 110 } });
await browser.close();
console.log(fail ? `\n${fail} check(s) failed` : "\nall checks passed");
process.exit(fail ? 1 : 0);
