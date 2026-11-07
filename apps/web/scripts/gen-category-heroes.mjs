#!/usr/bin/env node
// Builds each category's hero background (public/category-backgrounds/<key>.webp) from its 3x3 collage
// in public/category-collages/: the category's own photos, blended into ONE wide image in the
// homepage banner's style (owner, 2026-11-07). The homepage banners are single flat-lays of many
// items on a warm cream surface; these follow that example.
//
// How: the hero is about 3:1, the collages about 1.3:1, so stretching a collage showed only its
// middle band. Instead each photo is cut out (minus the collage's feathered seam band), upscaled
// with Lanczos and lightly sharpened, and laid out across a 3:1 canvas in two staggered rows.
// Neighbouring photos OVERLAP and every photo has feathered edges, so they melt into each other and
// into the cream ground: no gaps, no tile edges. A light cream wash pulls photos from different
// sources toward one palette, and a soft cream glow on the left keeps the headline area calm,
// like the open space in the homepage banners.
//
// Run from apps/web: node scripts/gen-category-heroes.mjs [--dry] [--only=<key>]
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "public/category-collages";
const OUT = "public/category-backgrounds";
const W = 2400;
const H = 800;
const CREAM = { r: 239, g: 234, b: 226 };
const TRIM = 0.07; // drop the collage's own feathered seam band around each cell
const COLS = 5; // photos per row
const OVERLAP = 0.32; // how far each photo runs under its neighbour (fraction of its width)
const FEATHER = 30; // blur radius of each photo's edge fade, px (the fade sits inside the overlap)
const dry = process.argv.includes("--dry");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

// Slot pitch, and the photo size: wider/taller than the pitch so neighbours overlap.
const pitchX = W / COLS;
const pitchY = H / 2;
const tileW = Math.round(pitchX * (1 + OVERLAP));
const tileH = Math.round(pitchY * (1 + OVERLAP));

async function cells(file) {
  const { width, height } = await sharp(file).metadata();
  const cw = width / 3;
  const ch = height / 3;
  const out = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      out.push(
        await sharp(file)
          .extract({ left: Math.round(c * cw + cw * TRIM), top: Math.round(r * ch + ch * TRIM), width: Math.round(cw * (1 - 2 * TRIM)), height: Math.round(ch * (1 - 2 * TRIM)) })
          .toBuffer(),
      );
  return out;
}

// Opaque centre, edges fading to transparent over ~2*FEATHER px.
const featherMask = await sharp(
  Buffer.from(
    `<svg width="${tileW}" height="${tileH}"><rect width="100%" height="100%" fill="#000"/>` +
      `<rect x="${2 * FEATHER}" y="${2 * FEATHER}" width="${tileW - 4 * FEATHER}" height="${tileH - 4 * FEATHER}" fill="#fff"/></svg>`,
  ),
)
  .blur(FEATHER)
  .extractChannel(0)
  .raw()
  .toBuffer();

async function tile(buf) {
  const rgb = await sharp(buf)
    .resize(tileW, tileH, { fit: "cover", position: "attention", kernel: "lanczos3" })
    .sharpen({ sigma: 0.9, m1: 0.5, m2: 1.8 })
    .modulate({ saturation: 1.04, brightness: 1.02 })
    .removeAlpha()
    .toBuffer();
  return sharp(rgb).joinChannel(featherMask, { raw: { width: tileW, height: tileH, channels: 1 } }).png().toBuffer();
}

// Soft cream glow over the left third (where the headline sits), fading out to the right.
const leftGlow = Buffer.from(
  `<svg width="${W}" height="${H}"><defs><radialGradient id="g" cx="0.12" cy="0.4" r="0.55">` +
    `<stop offset="0" stop-color="rgb(${CREAM.r},${CREAM.g},${CREAM.b})" stop-opacity="0.78"/>` +
    `<stop offset="1" stop-color="rgb(${CREAM.r},${CREAM.g},${CREAM.b})" stop-opacity="0"/>` +
    `</radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
);

const files = (await fs.readdir(SRC)).filter((f) => f.endsWith(".jpg") && (!only || f === `${only}.jpg`));
if (!dry) await fs.mkdir(OUT, { recursive: true });
for (const f of files) {
  const t = await Promise.all((await cells(path.join(SRC, f))).map(tile));
  const place = (cell, x, y) => ({ input: t[cell], left: Math.round(x - (tileW - pitchX) / 2), top: Math.round(y - (tileH - pitchY) / 2) });
  // Row 1: cells 0-4. Row 2, shifted half a slot: cells 3, 5, 6, 7, 8, 1 (the ends run off the
  // canvas). Drawn back to front so each photo's feathered edge blends over its neighbour's.
  const layers = [
    ...[3, 5, 6, 7, 8, 1].map((cell, k) => place(cell, k * pitchX - pitchX / 2, pitchY)),
    ...[0, 1, 2, 3, 4].map((cell, k) => place(cell, k * pitchX, 0)),
  ];
  // sharp's composite needs every layer inside the canvas: crop the parts that run off it.
  const inside = [];
  for (const l of layers) {
    const left = Math.max(0, l.left), top = Math.max(0, l.top);
    const right = Math.min(W, l.left + tileW), bottom = Math.min(H, l.top + tileH);
    if (right <= left || bottom <= top) continue;
    inside.push({ input: await sharp(l.input).extract({ left: left - l.left, top: top - l.top, width: right - left, height: bottom - top }).toBuffer(), left, top });
  }
  const out = path.join(OUT, f.replace(/\.jpg$/, ".webp"));
  if (dry) { console.log("would write", out); continue; }
  const flat = await sharp({ create: { width: W, height: H, channels: 3, background: CREAM } }).composite(inside).png().toBuffer();
  // One palette: a light cream wash over everything pulls photos from different sources together.
  const wash = Buffer.from(`<svg width="${W}" height="${H}"><rect width="100%" height="100%" fill="rgb(${CREAM.r},${CREAM.g},${CREAM.b})" fill-opacity="0.1"/></svg>`);
  await sharp(flat).composite([{ input: wash }, { input: leftGlow }]).webp({ quality: 86, effort: 4 }).toFile(out);
  console.log(out, Math.round((await fs.stat(out)).size / 1024) + " KB");
}
