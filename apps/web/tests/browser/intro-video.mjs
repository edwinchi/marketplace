// The intro video (owner's design): on every full page load (arrival, refresh, language change) it
// pops up centred, in the page's
// language (a switched-off language gets English), with sound (or, where the browser blocks sound
// before any interaction, muted until the first tap), looping until closed, with the site
// slightly blurred behind it, above the cookie banner, and with no accessibility violations.
// Close button, Esc and a click on the blurred page each close it; a refresh brings it back, and
// changing language brings it back in the new language. Reduced motion gets a play button instead of autoplay; admin
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
// Main run: behave like a browser that blocks sound before the visitor interacts (what Chrome,
// Safari and Firefox do for a first-time visitor; headless Chrome doesn't, and ignores
// --autoplay-policy). Unmuted play() is refused until the visitor taps, clicks or presses a key
// (tracked here: under Playwright navigator.userActivation always reports true).
// The sound-allowed case is checked separately at the end.
// The site skips the intro for automated browsers (navigator.webdriver); look like a visitor.
const AS_A_VISITOR = `Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });`;
const BLOCK_SOUND = `{
  let gesture = false;
  for (const g of ["pointerdown", "keydown", "touchstart"]) window.addEventListener(g, () => { gesture = true; }, true);
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!this.muted && !gesture) return Promise.reject(new DOMException("sound needs a user gesture", "NotAllowedError"));
    return play.call(this);
  };
}`;

const SIZES = { phone: { width: 390, height: 844 }, desktop: { width: 1366, height: 900 } };
const player = "dialog[data-intro-video]";
const isOpen = (page) => page.locator(player).evaluate((d) => d.open).catch(() => false);

async function open(locale, size, extra = {}) {
  const ctx = await browser.newContext({ viewport: SIZES[size], ...extra });
  await ctx.addCookies([{ name: "afrodeals_locale", value: locale, url: B }]);
  await ctx.addInitScript(BLOCK_SOUND);
  await ctx.addInitScript(AS_A_VISITOR);
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
    check(v.loop, `${tag}: loops`);
    check(v.muted, `${tag}: browser blocked sound, so it plays muted until the first touch`);
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
      await page.mouse.click(cx, cy + box.height / 4); // a tap on the video itself
      check(await page.locator(`${player} video`).evaluate((el) => !el.muted && !el.paused && el.volume === 1), `${tag}: first touch turns the sound on`);
      check(await isOpen(page), `${tag}: tapping the video doesn't close it`);
      await page.getByRole("button", { name: t.soundOff, exact: true }).click();
      check(await page.locator(`${player} video`).evaluate((el) => el.muted), `${tag}: sound button mutes`);
      await page.getByRole("button", { name: t.close, exact: true }).click();
      check(!(await isOpen(page)), `${tag}: close button closes it`);
      check(await page.evaluate(() => getComputedStyle(document.documentElement).overflow) !== "hidden", `${tag}: page scrolls again`);
      await page.reload({ waitUntil: "load" });
      check(await waitOpen(page), `${tag}: a refresh shows it again`);
      if (locale === "en") {
        // Change language the way the switcher does (cookie, then a full reload).
        await ctx.addCookies([{ name: "afrodeals_locale", value: "fr", url: B }]);
        await page.reload({ waitUntil: "load" });
        const opened = await waitOpen(page);
        const src = opened ? await page.locator(`${player} video`).evaluate((el) => new URL(el.currentSrc || el.src).pathname) : "";
        check(opened && src === MAP.fr.video, `${tag}: switching to French shows the French video (${src})`);
      }
    } else if (locale === "fr") {
      // Sound button as the very first touch: one click must end up with sound on, not off again.
      await page.getByRole("button", { name: t.soundOn, exact: true }).click();
      check(await page.locator(`${player} video`).evaluate((el) => !el.muted), `${tag}: sound button as first touch turns the sound on`);
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
{
  const { ctx, page } = await open("en", "phone");
  await page.goto(B + "/tiktok", { waitUntil: "load" });
  await page.waitForTimeout(3500);
  check(!(await isOpen(page)), "/tiktok: no intro video (they've just seen it on TikTok)");
  await ctx.close();
}

{
  // Automated browsers (navigator.webdriver) never get it, so it can't block other test suites.
  const ctx = await browser.newContext({ viewport: SIZES.desktop });
  const page = await ctx.newPage();
  await page.goto(B + "/", { waitUntil: "load" });
  await page.waitForTimeout(3000);
  check(!(await isOpen(page)), "automated browser: no intro video");
  await ctx.close();
}

await browser.close();

if (codecs) {
  // A browser that allows sound straight away (e.g. a returning visitor Chrome trusts).
  const loud = await chromium.launch({ channel: "chrome" });
  const ctx = await loud.newContext({ viewport: SIZES.desktop });
  await ctx.addCookies([{ name: "afrodeals_locale", value: "nl", url: B }]);
  await ctx.addInitScript(AS_A_VISITOR);
  const page = await ctx.newPage();
  await page.goto(B + "/", { waitUntil: "load" });
  await waitOpen(page);
  await page.waitForTimeout(2000);
  const v = await page.locator(`${player} video`).evaluate((el) => ({ muted: el.muted, paused: el.paused, volume: el.volume }));
  check(!v.muted && !v.paused && v.volume === 1, `sound allowed: plays with sound from the start ${JSON.stringify(v)}`);
  check(await page.getByRole("button", { name: MSG("nl").soundOff, exact: true }).count() === 1, "sound allowed: button offers to turn sound off");
  await loud.close();
}
console.log(failed ? `${failed} check(s) failed` : "all intro-video checks passed");
process.exit(failed ? 1 : 0);
