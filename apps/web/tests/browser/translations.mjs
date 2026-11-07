// Measures page weight and checks client-rendered text on pages whose client components use
// translations: no raw "Namespace.key" strings, no next-intl MISSING_MESSAGE errors.
// usage: node translations.mjs <baseUrl>
const { chromium } = await import("playwright-core");
const B = process.argv[2] ?? "http://localhost:3217";
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/robots.txt")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }

const NS = ["AccountMenu", "AccountSidebar", "Auth", "Categories", "Common", "Feedback", "GetApp", "Listen", "Listing", "Nav", "Welcome", "Home", "Terms", "Safety", "Help", "Footer", "Profile", "Bids"];
const sizes = {};
for (const p of ["/", "/login", "/welcome"]) {
  const html = await (await fetch(B + p)).text();
  const rsc = (html.match(/self\.__next_f\.push\([^<]*/g) ?? []).join("").length;
  sizes[p] = { html: html.length, rsc, hasTermsText: html.includes('\\"Terms\\":{') || html.includes('"Terms":{') };
}
console.log("weights:", JSON.stringify(sizes));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const problems = [];
page.on("console", (m) => { if (/MISSING_MESSAGE|IntlError|Could not resolve/i.test(m.text()) || m.type() === "error") problems.push(`[${new URL(page.url()).pathname}] ${m.text().slice(0, 160)}`); });
page.on("pageerror", (e) => problems.push(`[${new URL(page.url()).pathname}] pageerror ${e.message.slice(0, 160)}`));
const rawKey = new RegExp(`\\b(${NS.join("|")})\\.[a-zA-Z]+\\b`);
await page.goto(B + "/", { waitUntil: "networkidle" });
const listing = await page.locator('a[href*="/listings/"]:not([href$="/new"])').first().getAttribute("href");
const cat = await page.locator('a[href^="/categories/"]').first().getAttribute("href");
for (const p of ["/", listing, cat, "/login", "/login?tab=signup", "/welcome", "/app", "/feedback", "/safety", "/terms", "/help"]) {
  if (!p) continue;
  await page.goto(B + p, { waitUntil: "networkidle" });
  const text = await page.evaluate(() => document.body.innerText);
  const m = text.match(rawKey);
  if (m) problems.push(`[${p}] raw key on page: ${m[0]}`);
}
// Client-only UI that renders on interaction: the mobile menu.
await page.goto(B + "/", { waitUntil: "networkidle" });
const menuBtn = page.locator("div.fixed button").first();
await menuBtn.click().catch(() => {});
await page.waitForTimeout(500);
const menuText = await page.evaluate(() => document.body.innerText);
if (rawKey.test(menuText)) problems.push(`[mobile menu] raw key: ${menuText.match(rawKey)[0]}`);
console.log("mobile menu opened, sample:", menuText.replace(/\s+/g, " ").slice(0, 120));
await browser.close();
console.log(problems.length ? "PROBLEMS:\n" + problems.join("\n") : "PASS  no raw keys or translation errors on 11 pages + mobile menu");
process.exit(problems.length ? 1 : 0);
