// The intro video (owner's design): on a visitor's first page it pops up centred, in the page's
// language (a switched-off language gets English), muted, looping until closed, with the site
// slightly blurred behind it, above the cookie banner, and with no accessibility violations.
// Close button, Esc and a click on the blurred page each close it; it doesn't come back on the
// next page of the same visit. Reduced motion gets a play button instead of autoplay; admin
// pages never show it.
// Uses installed Chrome when it's there (Playwright's own Chromium can't decode H.264).
// usage (from apps/web): node tests/browser/intro-video.mjs [baseUrl]
import fs from "node:fs";
import { createRequire } from "node:module";
const { chromium } = await import("playwright-core");
const B = process.argv[2] ?? "http://localhost:3217";
const AXE = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const MAP = JSON.parse(fs.readFileSync(new URL("../../lib/intro-videos.json", import.meta.url), "utf8"));
const MSG = (l) => JSON.parse(fs.readFileSync(new URL(`../../messages/${l}.json`, import.meta.url), "utf8")).IntroVideo;

let failed = 0;
const check = (ok, label) => { console.log(`${ok ? "PASS" : "FAIL"}  ${label}`); if (!ok) failed++; };

let browser, codecs = true;
try { browser = await chromium.launch({ channel: "chrome" }); } catch { browser = await chromium.launch(); codecs = false; console.log("note: no Chrome, so playback isn't checked"); }

const SIZES = { phone: { width: 390, height: 844 }, desktop: { width: 1366, height: 900 } };
const player = "dialog[data-intro-video]";
const isOpen = (page) => page.locator(player).evaluate((d) => d.open).catch(() => false);

async function open(locale, size, extra = {}) {
  const ctx = await browser.newContext({ viewport: SIZES[size], ...extra });
  await ctx.addCookies([{ name: "afrodeals_locale", value: locale, url: B }]);
  const page = await ctx.newPage();
  return { ctx, page };
}
async function waitOpen(page) {
  return page.waitForFunction((sel) => document.querySelector(sel)?.open === true, player, { timeout: 8000 }).then(() => true, () => false);
}

for (const locale of ["en", "nl", "fr", "ar", "zh"]) {
  for (const size of ["phone", "desktop"]) {
    const { ctx, page } = await open(locale, size);
    await page.goto(B + "/", { waitUntil: "load" });
    // An admin can switch a language off (language_settings); the page is then English.
    const served = await page.locator("html").getAttribute("lang");
    const tag = `${locale}${served !== locale ? `→${served} (switched off)` : ""} ${size}`;
    const expected = (MAP[served] ?? MAP.en).video;
    const t = MSG(served);

    const shown = await waitOpen(page);
    check(shown, `${tag}: pops up after the page loads`);
    if (!shown) { await ctx.close(); continue; }
    const v = await page.locator(`${player} video`).evaluate((el) => ({ src: new URL(el.currentSrc || el.src).pathname, muted: el.muted, loop: el.loop }));
    check(v.src === expected, `${tag}: plays ${expected} (got ${v.src})`);
    check(v.muted && v.loop, `${tag}: starts muted, loops`);
    if (codecs) {
      await page.waitForTimeout(2500);
      const p = await page.locator(`${player} video`).evaluate((el) => ({ paused: el.paused, time: el.currentTime }));
      check(!p.paused && p.time > 1, `${tag}: is playing (t=${p.time.toFixed(1)}s)`);
    }

    // Centred horizontally and vertically, fully on screen, above the cookie banner.
    const box = await page.locator(`${player} > div`).boundingBox();
    const vp = SIZES[size];
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    check(Math.abs(cx - vp.width / 2) <= 2 && Math.abs(cy - vp.height / 2) <= 2, `${tag}: centred (${Math.round(cx)},${Math.round(cy)} in ${vp.width}x${vp.height})`);
    check(box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width && box.y + box.height <= vp.height, `${tag}: fully on screen (${Math.round(box.width)}x${Math.round(box.height)})`);
    check(box.height >= vp.height * 0.6 || box.width >= vp.width * 0.85, `${tag}: large`);
    const top = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest("dialog[data-intro-video]"), [cx, cy]);
    check(top, `${tag}: nothing on top of it (cookie banner included)`);
    const blur = await page.locator(player).evaluate((d) => getComputedStyle(d, "::backdrop").backdropFilter);
    check(/blur\(/.test(blur), `${tag}: site behind it is blurred (${blur})`);
    check(await page.evaluate(() => getComputedStyle(document.documentElement).overflow) === "hidden", `${tag}: page behind doesn't scroll`);
    check(await page.getByRole("button", { name: t.soundOn, exact: true }).count() === 1, `${tag}: sound button labelled "${t.soundOn}"`);

    await page.addScriptTag({ content: AXE });
    const violations = await page.evaluate(async (sel) => (await window.axe.run(sel, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })).violations.filter((x) => ["serious", "critical"].includes(x.impact)).map((x) => x.id), player);
    check(violations.length === 0, `${tag}: no serious/critical accessibility issues ${violations.length ? JSON.stringify(violations) : ""}`);

    if (size === "desktop") {
      if (codecs) {
        // Still playing after the 10-second video would have ended: it loops.
        await page.waitForTimeout(9000);
        check(await page.locator(`${player} video`).evaluate((el) => !el.paused && !el.ended), `${tag}: keeps playing past the end (loops)`);
      }
      await page.getByRole("button", { name: t.soundOn, exact: true }).click();
      check(await page.locator(`${player} video`).evaluate((el) => !el.muted), `${tag}: sound button unmutes`);
      await page.getByRole("button", { name: t.close, exact: true }).click();
      check(!(await isOpen(page)), `${tag}: close button closes it`);
      check(await page.evaluate(() => getComputedStyle(document.documentElement).overflow) !== "hidden", `${tag}: page scrolls again`);
      await page.goto(B + "/help", { waitUntil: "load" });
      await page.waitForTimeout(3000);
      check(!(await isOpen(page)), `${tag}: not shown again on the next page of the visit`);
    } else if (locale === "en") {
      await page.keyboard.press("Escape");
      check(!(await isOpen(page)), `${tag}: Esc closes it`);
    } else if (locale === "nl") {
      await page.mouse.click(8, 8); // the blurred page, outside the video
      check(!(await isOpen(page)), `${tag}: clicking the blurred page closes it`);
    }
    await ctx.close();
  }
}

{
  const { ctx, page } = await open("en", "desktop", { reducedMotion: "reduce" });
  await page.goto(B + "/", { waitUntil: "load" });
  await waitOpen(page);
  const paused = await page.locator(`${player} video`).evaluate((el) => el.paused).catch(() => null);
  check(paused === true, "reduced motion: not autoplayed");
  check(await page.getByRole("button", { name: MSG("en").play, exact: true }).count() === 1, "reduced motion: play button offered");
  await ctx.close();
}
{
  const { ctx, page } = await open("en", "desktop");
  await page.goto(B + "/admin", { waitUntil: "load" });
  await page.waitForTimeout(3500);
  const path = new URL(page.url()).pathname;
  check(!path.startsWith("/admin") || !(await isOpen(page)), `admin pages: no intro video (${path})`);
  await ctx.close();
}

await browser.close();
console.log(failed ? `${failed} check(s) failed` : "all intro-video checks passed");
process.exit(failed ? 1 : 0);
