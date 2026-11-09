// Makes the TikTok content pack in ops/tiktok/ (git-ignored): portrait 1080x1920 videos the owner
// uploads and schedules in TikTok Studio (TikTok's rules don't allow an app to post to the
// company's own account automatically, see docs/RUNBOOK.md "TikTok").
//   intro-<locale>.mp4      the intro video + an end card with marketitnow.net/tiktok
//   showcase-<theme>.mp4    real listings from the live site (photo, title, price, city; never the
//                           seller), from a title card to the same end card
//   calendar.html, captions.csv   which video to post when, with the caption and hashtags
// Listings are read with the public (anon) key: the same data anyone sees on the site. Sellers
// license their listings to MarketitNow to "operate and promote the platform" (Terms, section 3).
// Rerun it when new listings come in: themes with fewer than 2 listings are skipped.
// usage (from apps/web): node scripts/tiktok-videos.mjs --ffmpeg=<path to ffmpeg> [--start=2026-11-10]
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const FFMPEG = arg("ffmpeg", process.env.FFMPEG);
if (!FFMPEG) throw new Error("pass --ffmpeg=<path to ffmpeg>");
const OUT = path.resolve("../../ops/tiktok");
const INTROS = path.resolve("../../ops/intro-videos");
const HANDLE = "@eddymatrix7";
const URL_TEXT = "marketitnow.net/tiktok";
const W = 1080, H = 1920, FPS = 30, FADE = 0.35;

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => {
  const i = l.indexOf("=");
  return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
}));
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const ff = (args) => execFileSync(FFMPEG, ["-v", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });
const tmp = path.join(OUT, ".work");
// Empty the folder (not remove it: Windows refuses while a window or shell has it open).
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

// ---------- text ----------
const T = {
  nl: { cta: "Plaats gratis je advertentie", free: "Gratis", from: "Bieden vanaf", typeIt: "Typ het adres in je browser" },
  en: { cta: "Post your ad for free", free: "Free", from: "Offers from", typeIt: "Type the address in your browser" },
  fr: { cta: "Publiez votre annonce gratuitement", free: "Gratuit", from: "Offres dès", typeIt: "Tapez l'adresse dans votre navigateur" },
  ar: { cta: "انشر إعلانك مجانًا", free: "مجاني", from: "عروض تبدأ من", typeIt: "اكتب العنوان في متصفحك" },
};
const price = (l, locale) => {
  if (l.price_type === "free") return T[locale].free;
  if (l.price_minor == null) return null;
  const amount = new Intl.NumberFormat(locale, { style: "currency", currency: l.currency_code, maximumFractionDigits: 0 }).format(l.price_minor / 100);
  return l.price_type === "bidding" ? `${T[locale].from} ${amount}` : amount;
};
const city = (c) => {
  const s = (Array.isArray(c) ? c[0]?.city : c?.city)?.trim() ?? "";
  return s === s.toUpperCase() || s === s.toLowerCase() ? s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : s;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Themes: which listings go in which video, and what the post says.
const THEMES = [
  {
    id: "gratis-zwolle", locale: "nl", pick: (l) => l.price_type === "free",
    title: "Gratis af te halen", sub: (ls) => `in ${city(ls[0].locations)}`,
    caption: "Gratis spullen bij jou in de buurt 🎁 Wie het eerst komt… Ophalen in Zwolle.",
    tags: "#gratis #zwolle #weggeefhoek #duurzaam #marktplaats #tweedehands",
  },
  {
    id: "schoenen", locale: "nl", pick: (l) => l.currency_code === "EUR" && /sneaker|shoe|schoen|air max|zoomx/i.test(l.title),
    title: "Schoenen & sneakers", sub: () => "vanaf €0",
    caption: "Sneakers voor een prikje 👟 Nike, Engelbert Strauss en meer, in Zwolle.",
    tags: "#sneakers #nike #tweedehands #zwolle #deals #marktplaats",
  },
  {
    id: "thuis-kantoor", locale: "nl", pick: (l) => /dock|router|mug|tool|gereedschap|cupboard|kast/i.test(l.title),
    title: "Handig voor thuis", sub: () => "en op kantoor",
    caption: "Docking station, router, gereedschap en meer 🛠️ Tweedehands en voordelig.",
    tags: "#tweedehands #thuiswerken #gereedschap #deals #zwolle #duurzaam",
  },
  {
    id: "cameroun", locale: "fr", pick: (l) => l.currency_code === "XAF",
    title: "Bonnes affaires", sub: () => "au Cameroun",
    caption: "Sneakers, sacs à dos et bonnes affaires à Douala et Yaoundé 🎒 Achetez et vendez gratuitement.",
    tags: "#cameroun #douala #yaounde #bonplan #achatvente #237",
  },
];
const INTRO_POSTS = {
  nl: { caption: "Kopen en verkopen bij jou in de buurt, 100% gratis 💚 Plaats je advertentie in 1 klik.", tags: "#marktplaats #tweedehands #gratis #verkopen #duurzaam #nederland" },
  en: { caption: "Buy and sell near you, 100% free 💚 Post your ad in one click.", tags: "#marketplace #secondhand #free #sellonline #thrift #deals" },
  fr: { caption: "Achetez et vendez près de chez vous, 100 % gratuit 💚 Votre annonce en 1 clic.", tags: "#achatvente #gratuit #bonplan #occasion #cameroun #marketplace" },
  ar: { caption: "بِع واشترِ بالقرب منك، مجانًا 100٪ 💚 انشر إعلانك بنقرة واحدة.", tags: "#بيع_وشراء #مجانا #عروض #سوق #تسوق_اونلاين" },
};

// ---------- cards (rendered by Chrome, so the site's fonts and RTL text just work) ----------
const { chromium } = await import("playwright-core");
const browser = await chromium.launch({ channel: "chrome" });
const logo = `data:image/svg+xml;base64,${fs.readFileSync("public/logo.svg").toString("base64")}`;
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,800&family=Roboto:wght@500;700;900&family=Noto+Kufi+Arabic:wght@700;900&display=block" rel="stylesheet">`;
const BASE = `*{box-sizing:border-box;margin:0}html,body{background:transparent;font-family:Roboto,"Noto Kufi Arabic",sans-serif}
.bg{position:absolute;inset:0;background:linear-gradient(155deg,#082040 0%,#0a2c5c 55%,#063018 100%);overflow:hidden}
.glow1{position:absolute;top:-160px;left:-140px;width:700px;height:700px;border-radius:50%;background:rgba(232,152,24,.18);filter:blur(90px)}
.glow2{position:absolute;bottom:-180px;right:-140px;width:760px;height:760px;border-radius:50%;background:rgba(0,130,0,.32);filter:blur(90px)}
.logo{background:#fff;border-radius:999px;padding:18px 34px;display:inline-flex;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.logo img{height:64px}`;
async function card(file, w, h, html, transparent = false) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<!doctype html><html><head>${FONTS}<style>${BASE}</style></head><body style="width:${w}px;height:${h}px;position:relative;overflow:hidden">${html}</body></html>`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, omitBackground: transparent });
  await page.close();
}
const endCard = (locale, s = 1) => `<div class="bg"><div class="glow1"></div><div class="glow2"></div></div>
<div dir="${locale === "ar" ? "rtl" : "ltr"}" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${56 * s}px;color:#fff;text-align:center;padding:0 ${60 * s}px">
  <div class="logo" style="transform:scale(${s * 1.15})"><img src="${logo}"></div>
  <div style="font:700 ${50 * s}px/1.25 Roboto,'Noto Kufi Arabic';opacity:.92">${esc(T[locale].cta)}</div>
  <div dir="ltr" style="background:#008200;border-radius:${28 * s}px;padding:${26 * s}px ${36 * s}px;font:900 ${66 * s}px/1 Roboto;letter-spacing:-1px;box-shadow:0 ${12 * s}px 0 #005c00">${URL_TEXT}</div>
  <div style="font:500 ${34 * s}px/1.3 Roboto,'Noto Kufi Arabic';opacity:.7">${esc(T[locale].typeIt)}</div>
</div>`;

// ---------- listings ----------
const res = await fetch(`${SUPABASE_URL}/rest/v1/listings?select=id,title,price_minor,currency_code,price_type,published_at,locations(city),listing_media(storage_key,sort_order)&status=eq.active&order=published_at.desc&limit=200`, { headers: { apikey: ANON } });
if (!res.ok) throw new Error(`listings: ${res.status}`);
const listings = (await res.json()).filter((l) => l.listing_media?.length);
const photoUrl = (l) => {
  const key = [...l.listing_media].sort((a, b) => a.sort_order - b.sort_order)[0].storage_key;
  return /^https?:\/\//.test(key) ? key : `${SUPABASE_URL}/storage/v1/object/public/listings/${key}`;
};

// One still per listing: the photo whole, over a blurred copy of itself, slowly zooming in.
function photoSegment(img, overlay, dur, out) {
  const frames = Math.round(dur * FPS);
  ff(["-i", img, "-loop", "1", "-t", String(dur), "-i", overlay, "-filter_complex",
    `[0]split[a][b];[a]scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase,crop=${W * 2}:${H * 2},boxblur=60:2,eq=brightness=-0.1[bg];` +
    `[b]scale=${W * 2}:${H * 2 - 700}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2-180,` +
    `zoompan=z='1+0.06*on/${frames}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS},setsar=1[base];` +
    `[base][1]overlay,format=yuv420p`, "-frames:v", String(frames), "-c:v", "libx264", "-crf", "18", "-preset", "medium", out]);
}
function stillSegment(png, dur, out) {
  ff(["-loop", "1", "-t", String(dur), "-i", png, "-vf", `fps=${FPS},format=yuv420p,setsar=1`, "-c:v", "libx264", "-crf", "18", "-preset", "medium", out]);
}
// Joins segments with short cross-fades and a silent sound track (add a TikTok sound in the app).
function join(segments, durs, out) {
  const inputs = segments.flatMap((s) => ["-i", s]);
  let chain = "", last = "[0:v]", offset = 0;
  for (let i = 1; i < segments.length; i++) {
    offset += durs[i - 1] - FADE;
    const label = i === segments.length - 1 ? "[v]" : `[x${i}]`;
    chain += `${last}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}${label};`;
    last = label;
  }
  const total = durs.reduce((a, b) => a + b, 0) - FADE * (segments.length - 1);
  ff([...inputs, "-f", "lavfi", "-t", total.toFixed(3), "-i", "anullsrc=r=44100:cl=stereo", "-filter_complex", chain.slice(0, -1),
    "-map", "[v]", "-map", `${segments.length}:a`, "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out]);
  return total;
}

const made = [];
for (const theme of THEMES) {
  const items = listings.filter(theme.pick).slice(0, 6);
  if (items.length < 2) { console.log(`skip ${theme.id}: ${items.length} listing(s)`); continue; }
  const dir = path.join(tmp, theme.id);
  fs.mkdirSync(dir);
  const segs = [], durs = [];
  await card(path.join(dir, "title.png"), W, H, `<div class="bg"><div class="glow1"></div><div class="glow2"></div></div>
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:48px;color:#fff;text-align:center;padding:0 70px">
  <div class="logo" style="transform:scale(1.15)"><img src="${logo}"></div>
  <div style="font:800 150px/1.02 Fraunces;letter-spacing:-2px;text-wrap:balance">${esc(theme.title)}</div>
  <div style="font:700 64px/1.2 Roboto;color:#ffc35c">${esc(theme.sub(items))}</div>
</div>`);
  stillSegment(path.join(dir, "title.png"), 2.0, path.join(dir, "s0.mp4"));
  segs.push(path.join(dir, "s0.mp4")); durs.push(2.0);
  for (const [i, l] of items.entries()) {
    const img = path.join(dir, `p${i}.img`);
    const r = await fetch(photoUrl(l));
    if (!r.ok) { console.log(`photo ${l.id}: ${r.status}, skipped`); continue; }
    fs.writeFileSync(img, Buffer.from(await r.arrayBuffer()));
    const p = price(l, theme.locale);
    await card(path.join(dir, `o${i}.png`), W, H, `
<div style="position:absolute;top:70px;left:0;right:0;display:flex;justify-content:center"><div class="logo"><img src="${logo}"></div></div>
<div style="position:absolute;left:0;right:0;bottom:0;height:820px;background:linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.6) 55%,transparent 100%)"></div>
<div style="position:absolute;left:70px;right:70px;bottom:190px;color:#fff;display:flex;flex-direction:column;gap:26px">
  ${p ? `<div style="align-self:flex-start;background:#008200;border-radius:22px;padding:16px 30px;font:900 72px/1 Roboto;box-shadow:0 8px 0 #005c00">${esc(p)}</div>` : ""}
  <div style="font:700 66px/1.12 Roboto;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-shadow:0 2px 12px rgba(0,0,0,.5)">${esc(l.title)}</div>
  <div style="font:500 44px/1 Roboto;opacity:.85">📍 ${esc(city(l.locations))}</div>
</div>`, true);
    photoSegment(img, path.join(dir, `o${i}.png`), 2.6, path.join(dir, `s${i + 1}.mp4`));
    segs.push(path.join(dir, `s${i + 1}.mp4`)); durs.push(2.6);
  }
  await card(path.join(dir, "end.png"), W, H, endCard(theme.locale));
  stillSegment(path.join(dir, "end.png"), 3.2, path.join(dir, "end.mp4"));
  segs.push(path.join(dir, "end.mp4")); durs.push(3.2);
  const file = `showcase-${theme.id}.mp4`;
  const secs = join(segs, durs, path.join(OUT, file));
  made.push({ file, locale: theme.locale, kind: "showcase", secs, caption: theme.caption, tags: theme.tags, items: items.map((l) => l.title) });
  console.log(`${file}: ${items.length} listings, ${secs.toFixed(1)} s`);
}

// Intros: the corrected masters (720x1280), upscaled, then 3 s on the end card.
for (const [locale, name] of [["nl", "Dutch"], ["en", "English"], ["fr", "French"], ["ar", "Arabic"]]) {
  const src = path.join(INTROS, `${name} Intro 10 seconds.mp4`);
  if (!fs.existsSync(src)) { console.log(`skip intro ${locale}: no ${src}`); continue; }
  const dir = path.join(tmp, `intro-${locale}`);
  fs.mkdirSync(dir);
  ff(["-i", src, "-vf", `scale=${W}:${H}:flags=lanczos,fps=${FPS},format=yuv420p,setsar=1`, "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-c:a", "aac", "-b:a", "128k", path.join(dir, "main.mp4")]);
  await card(path.join(dir, "end.png"), W, H, endCard(locale));
  stillSegment(path.join(dir, "end.png"), 3.0, path.join(dir, "end.mp4"));
  const probe = spawnSync(FFMPEG, ["-i", path.join(dir, "main.mp4")], { encoding: "utf8" }).stderr;
  const [, hh, mm, ss] = probe.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const dur = Number(hh) * 3600 + Number(mm) * 60 + Number(ss);
  const total = dur + 3.0 - FADE;
  const file = `intro-${locale}.mp4`;
  ff(["-i", path.join(dir, "main.mp4"), "-i", path.join(dir, "end.mp4"), "-filter_complex",
    `[0:v][1:v]xfade=transition=fade:duration=${FADE}:offset=${(dur - FADE).toFixed(3)}[v];[0:a]apad=whole_dur=${total.toFixed(3)}[a]`,
    "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
    "-t", total.toFixed(3), "-movflags", "+faststart", path.join(OUT, file)]);
  made.push({ file, locale, kind: "intro", secs: total, ...INTRO_POSTS[locale] });
  console.log(`${file}: ${total.toFixed(1)} s`);
}
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });

// ---------- calendar: 2 posts a week (Tue + Sat, 19:00), new videos only, never a repeat ----------
const order = ["intro-nl.mp4", "showcase-gratis-zwolle.mp4", "intro-en.mp4", "showcase-schoenen.mp4", "intro-fr.mp4", "showcase-cameroun.mp4", "showcase-thuis-kantoor.mp4", "intro-ar.mp4"]
  .map((f) => made.find((m) => m.file === f)).filter(Boolean);
const start = new Date(`${arg("start", new Date().toISOString().slice(0, 10))}T12:00:00Z`);
const days = [];
for (let d = new Date(start); days.length < order.length; d.setUTCDate(d.getUTCDate() + 1)) if ([2, 6].includes(d.getUTCDay())) days.push(new Date(d));
const LANG = { nl: "Nederlands", en: "English", fr: "Français", ar: "العربية" };
const rows = order.map((m, i) => ({ date: days[i].toISOString().slice(0, 10), weekday: days[i].toLocaleDateString("en-GB", { weekday: "short" }), time: "19:00", ...m,
  text: `${m.caption}\n👉 ${URL_TEXT}\n${m.tags}` }));
const csv = ["date,time,video,language,caption"].concat(rows.map((r) => [r.date, r.time, r.file, r.locale, `"${r.text.replace(/"/g, '""')}"`].join(","))).join("\n");
fs.writeFileSync(path.join(OUT, "captions.csv"), "﻿" + csv + "\n");
fs.writeFileSync(path.join(OUT, "calendar.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TikTok calendar</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:860px;margin:32px auto;padding:0 16px;color:#1a1a1a;background:#fff}h1{font-size:26px}
.p{border:1px solid #ddd;border-radius:14px;padding:16px 18px;margin:14px 0;display:grid;grid-template-columns:150px 1fr;gap:16px}
video{width:150px;border-radius:10px;background:#000}.d{font-weight:700}.m{color:#666;font-size:14px}pre{white-space:pre-wrap;background:#f6f6f6;border-radius:10px;padding:10px 12px;font:15px/1.45 system-ui;margin:8px 0}
button{font:600 14px system-ui;border:0;background:#008200;color:#fff;border-radius:8px;padding:7px 12px;cursor:pointer}</style></head><body>
<h1>TikTok calendar for ${HANDLE}</h1><p>Two posts a week at 19:00. In TikTok Studio on a computer: Upload, pick the video, paste the caption, add a sound from TikTok's library, then "Schedule" for the date below. TikTok lets you schedule up to 10 days ahead, so do it in 3 or 4 sessions.</p>
${rows.map((r, i) => `<div class="p"><video src="${r.file}" controls muted playsinline preload="metadata"></video><div>
<div class="d">${r.weekday} ${r.date}, ${r.time}</div><div class="m">${r.file} · ${LANG[r.locale]} · ${r.secs.toFixed(0)} s${r.items ? ` · ${r.items.length} listings` : ""}</div>
<pre id="c${i}">${esc(r.text)}</pre><button onclick="navigator.clipboard.writeText(document.getElementById('c${i}').innerText);this.textContent='Copied'">Copy caption</button></div></div>`).join("\n")}
</body></html>`);
console.log(`\n${made.length} videos, calendar from ${rows[0]?.date} to ${rows.at(-1)?.date} in ${OUT}`);
