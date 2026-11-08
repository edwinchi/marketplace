// E6 check: sort control and gallery labels render translated in English and Dutch, and the
// gallery thumbnails/lightbox still work. The cookie banner is in the page's language.
import fs from "node:fs";
const { chromium } = await import("playwright-core");
const B = process.argv[2] ?? "http://localhost:3217";
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/robots.txt")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
const browser = await chromium.launch();
let fail = 0;
const check = (n, ok, d = "") => { if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`); };
for (const [locale, want] of [["en", { sort: "Sort by", newest: "Newest first", thumb: "Photo ", first: "Photo 1 of ", next: "Next photo" }], ["nl", { sort: "Sorteren op", newest: "Nieuwste eerst", thumb: "Foto ", first: "Foto 1 van ", next: "Volgende foto" }]]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "afrodeals_locale", value: locale, url: B }]);
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await page.goto(B + "/", { waitUntil: "networkidle" });
  const sort = page.getByRole("combobox", { name: want.sort });
  check(`${locale}: sort control labelled "${want.sort}"`, (await sort.count()) === 1);
  check(`${locale}: sort shows "${want.newest}"`, (await sort.innerText()).includes(want.newest), await sort.innerText().catch(() => ""));
  const href = await page.locator('a[href*="/listings/"]:not([href$="/new"])').first().getAttribute("href");
  await page.goto(B + href, { waitUntil: "networkidle" });
  const thumbs = page.locator(`button[aria-label^="${want.thumb}"]`);
  { const n = await thumbs.count(); const first = n ? await thumbs.first().getAttribute("aria-label") : ""; check(`${locale}: ${n} gallery thumbnails labelled, first is "${want.first}${n}"`, n > 1 && first === `${want.first}${n}`, first); }
  if ((await thumbs.count()) > 1) {
    await thumbs.nth(1).click();
    check(`${locale}: clicking thumbnail 2 marks it current`, (await thumbs.nth(1).getAttribute("aria-current")) === "true");
  }
  check(`${locale}: next-photo button labelled "${want.next}"`, (await page.locator(`button[aria-label="${want.next}"]`).count()) >= 1);
  check(`${locale}: no console errors`, errs.length === 0, errs.join(" | "));
  await ctx.close();
}
// Cookie banner: in the language the page is served in (a switched-off language gets English).
for (const locale of ["en", "nl", "fr", "ar", "zh"]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addCookies([{ name: "afrodeals_locale", value: locale, url: B }]);
  const page = await ctx.newPage();
  await page.goto(B + "/", { waitUntil: "networkidle" });
  const served = await page.locator("html").getAttribute("lang");
  const t = JSON.parse(fs.readFileSync(new URL(`../../messages/${served}.json`, import.meta.url), "utf8")).CookieConsent;
  const banner = page.getByRole("region", { name: t.label, exact: true });
  const text = await banner.innerText().catch(() => "");
  check(`cookie banner ${locale}→${served}: text, link and buttons translated`, text.includes(t.text) && text.includes(t.learnMore)
    && (await banner.getByRole("button", { name: t.essentialOnly, exact: true }).count()) === 1
    && (await banner.getByRole("button", { name: t.acceptAll, exact: true }).count()) === 1, text.slice(0, 80));
  await banner.getByRole("button", { name: t.essentialOnly, exact: true }).click().catch(() => {});
  check(`cookie banner ${locale}: "${t.essentialOnly}" hides it`, (await banner.count()) === 0);
  await ctx.close();
}
await browser.close();
console.log(fail ? `${fail} failed` : "all E6 checks passed");
process.exit(fail ? 1 : 0);
