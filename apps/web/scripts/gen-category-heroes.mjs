#!/usr/bin/env node
// Builds each category's hero background (public/category-backgrounds/<key>-hd.webp): 11 photos of
// that category's items blended into ONE wide image, in the homepage banner's style (owner,
// 2026-11-07: "lots of at least 9 items blended together", "as sharp as the homepage images").
//
// Sources: high-resolution CC0 / public-domain photographs found on Openverse and checked by eye,
// listed per category with their provenance in scripts/category-background-sources.json. The
// photos themselves aren't in the repo (about 120 MB); pass the folder they were downloaded to
// (<src>/<key>/<file>) to rebuild.
//
// Layout (2880x960, 3:1, sharp on 2x screens at 1440px wide): a taller top row of 5 photos (the
// part of the hero you see above the category row), and a row of 6 under it, shifted half a slot.
// Neighbours overlap and every photo's edges fade out, so they melt into each other and into a
// warm cream ground: one image, no tiles. Photos are only ever scaled DOWN (1800px sources to
// ~800px slots), which is what keeps them crisp. A light cream wash unifies the palette, and a
// soft glow keeps the headline area on the left calm.
//
// Run from apps/web: node scripts/gen-category-heroes.mjs --src=<folder> [--only=<key>]
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUT = "public/category-backgrounds";
const SOURCES = "scripts/category-background-sources.json";
const W = 2880;
const H = 960;
const CREAM = { r: 239, g: 234, b: 226 };
const TOP_H = Math.round(H * 0.56);
const BOTTOM_H = H - TOP_H;
const OVERLAP = 0.3; // fraction of a slot each photo runs under its side neighbours
// Rows overlap too (top row 1.32x its band, bottom row starts 30% of its height above the line),
// so there's no pale seam where the two rows meet.
const FEATHER = 34; // edge-fade blur radius, px (the fade sits inside the overlap)
const src = process.argv.find((a) => a.startsWith("--src="))?.slice(6);
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
if (!src) throw new Error("--src=<folder with <key>/<file> photos> is required");

const featherMask = (w, h) =>
  sharp(Buffer.from(`<svg width="${w}" height="${h}"><rect width="100%" height="100%" fill="#000"/><rect x="${2 * FEATHER}" y="${2 * FEATHER}" width="${w - 4 * FEATHER}" height="${h - 4 * FEATHER}" fill="#fff"/></svg>`))
    .blur(FEATHER)
    .extractChannel(0)
    .raw()
    .toBuffer();

async function tile(file, w, h) {
  const rgb = await sharp(file)
    .resize(w, h, { fit: "cover", position: "attention", kernel: "lanczos3" })
    .sharpen({ sigma: 0.6 })
    .modulate({ saturation: 1.03 })
    .removeAlpha()
    .toBuffer();
  return sharp(rgb).joinChannel(await featherMask(w, h), { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
}

const leftGlow = Buffer.from(
  `<svg width="${W}" height="${H}"><defs><radialGradient id="g" cx="0.1" cy="0.32" r="0.5">` +
    `<stop offset="0" stop-color="rgb(${CREAM.r},${CREAM.g},${CREAM.b})" stop-opacity="0.72"/>` +
    `<stop offset="1" stop-color="rgb(${CREAM.r},${CREAM.g},${CREAM.b})" stop-opacity="0"/>` +
    `</radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
);
const wash = Buffer.from(`<svg width="${W}" height="${H}"><rect width="100%" height="100%" fill="rgb(${CREAM.r},${CREAM.g},${CREAM.b})" fill-opacity="0.08"/></svg>`);

const sources = JSON.parse(await fs.readFile(SOURCES, "utf8"));
await fs.mkdir(OUT, { recursive: true });
for (const [key, entry] of Object.entries(sources.categories)) {
  if (only && key !== only) continue;
  const files = entry.photos.map((p) => path.join(src, key, p.file));
  // 11 slots; at least 9 different photos (owner: "at least 9 items"). With 9 or 10, the last
  // slots reuse the first photos, which land on the half-hidden ends of the bottom row.
  if (files.length < 9) throw new Error(`${key}: needs at least 9 photos, has ${files.length}`);
  const pitch = W / 5;
  const tw = Math.round(pitch * (1 + OVERLAP)), th = Math.round(TOP_H * 1.32);
  const bw = Math.round(pitch * (1 + OVERLAP)), bh = Math.round(BOTTOM_H * 1.5);
  const layers = [];
  // Bottom row first (drawn under the top row), shifted half a slot; its two ends run off-canvas.
  for (let k = 0; k < 6; k++) {
    const cx = k * pitch;
    layers.push({ input: await tile(files[(5 + k) % files.length], bw, bh), w: bw, h: bh, left: Math.round(cx - bw / 2), top: Math.round(TOP_H - bh * 0.3) });
  }
  for (let k = 0; k < 5; k++) {
    const cx = k * pitch + pitch / 2;
    layers.push({ input: await tile(files[k], tw, th), w: tw, h: th, left: Math.round(cx - tw / 2), top: Math.round(TOP_H / 2 - th / 2) });
  }
  // sharp's composite needs every layer inside the canvas: crop the parts that run off it.
  const inside = [];
  for (const l of layers) {
    const left = Math.max(0, l.left), top = Math.max(0, l.top);
    const right = Math.min(W, l.left + l.w), bottom = Math.min(H, l.top + l.h);
    if (right <= left || bottom <= top) continue;
    inside.push({ input: await sharp(l.input).extract({ left: left - l.left, top: top - l.top, width: right - left, height: bottom - top }).toBuffer(), left, top });
  }
  const flat = await sharp({ create: { width: W, height: H, channels: 3, background: CREAM } }).composite(inside).png().toBuffer();
  // -hd: a new file name per rebuild of a category, so CDN/optimizer caches of the old image are never served.
  const out = path.join(OUT, `${key}-hd.webp`);
  await sharp(flat).composite([{ input: wash }, { input: leftGlow }]).webp({ quality: 88, effort: 4, smartSubsample: true }).toFile(out);
  console.log(out, Math.round((await fs.stat(out)).size / 1024) + " KB");
}
