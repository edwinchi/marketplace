#!/usr/bin/env node
// Builds the wide category hero backdrops (public/category-heroes/<key>.webp) from the 3x3
// collages in public/category-collages/.
//
// Why: the hero is about 3:1 on desktop, and the collages are about 1.3:1 (1304x1004). `cover`
// stretched a collage across the screen and showed only its middle band: three half-cut photos,
// enlarged, with the collage's feathered seams running through them. Here each photo is cut out
// separately, upscaled with Lanczos and lightly sharpened, then laid out as a 3:1 photo wall in a
// brick pattern with transparent gaps and rounded corners. The page background shows through the
// gaps in both light and dark mode.
//
// Run from apps/web: node scripts/gen-category-heroes.mjs [--dry]
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = "public/category-collages";
const OUT = "public/category-heroes";
const W = 2400;
const H = 800;
const GAP = 14;
const RADIUS = 22;
const TRIM = 0.07; // drop the feathered seam band around each collage cell
const dry = process.argv.includes("--dry");

const tileW = Math.round((W - 4 * GAP) / 5);
const tileH = Math.round((H - GAP) / 2);

async function cells(file) {
  const img = sharp(file);
  const { width, height } = await img.metadata();
  const cw = width / 3;
  const ch = height / 3;
  const out = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const left = Math.round(c * cw + cw * TRIM);
      const top = Math.round(r * ch + ch * TRIM);
      out.push(await sharp(file).extract({ left, top, width: Math.round(cw * (1 - 2 * TRIM)), height: Math.round(ch * (1 - 2 * TRIM)) }).toBuffer());
    }
  return out;
}

const roundedMask = Buffer.from(
  `<svg width="${tileW}" height="${tileH}"><rect width="${tileW}" height="${tileH}" rx="${RADIUS}" ry="${RADIUS}" fill="#fff"/></svg>`,
);

async function tile(buf) {
  return sharp(buf)
    .resize(tileW, tileH, { fit: "cover", position: "attention", kernel: "lanczos3" })
    .sharpen({ sigma: 0.9, m1: 0.5, m2: 1.8 })
    .modulate({ saturation: 1.06 })
    .ensureAlpha()
    .composite([{ input: roundedMask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

const files = (await fs.readdir(SRC)).filter((f) => f.endsWith(".jpg"));
if (!dry) await fs.mkdir(OUT, { recursive: true });
for (const f of files) {
  const c = await cells(path.join(SRC, f));
  const tiles = await Promise.all(c.map(tile));
  const step = tileW + GAP;
  const layers = [];
  // Row 1: cells 0-4. Row 2, shifted half a tile: cells 3, 5, 6, 7, 8, 1 (the two ends are cut by
  // the canvas edge, where the page's side fade hides them anyway).
  [0, 1, 2, 3, 4].forEach((cell, k) => layers.push({ input: tiles[cell], left: k * step, top: 0 }));
  [3, 5, 6, 7, 8, 1].forEach((cell, k) => layers.push({ input: tiles[cell], left: Math.round(k * step - step / 2), top: tileH + GAP }));
  const clipped = [];
  for (const l of layers) {
    if (l.left >= 0 && l.left + tileW <= W) { clipped.push(l); continue; }
    const visLeft = Math.max(0, l.left);
    const cropLeft = visLeft - l.left;
    const width = Math.min(W, l.left + tileW) - visLeft;
    clipped.push({ input: await sharp(l.input).extract({ left: cropLeft, top: 0, width, height: tileH }).toBuffer(), left: visLeft, top: l.top });
  }
  const out = path.join(OUT, f.replace(/\.jpg$/, ".webp"));
  const img = sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(clipped).webp({ quality: 88, alphaQuality: 90, effort: 6 });
  if (dry) { console.log("would write", out); continue; }
  await img.toFile(out);
  console.log(out, Math.round((await fs.stat(out)).size / 1024) + " KB");
}
