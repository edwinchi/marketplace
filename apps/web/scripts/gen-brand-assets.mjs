// Renders every raster brand asset from public/logo.svg, logo-compact.svg and logo-mark.svg (agents.md §13),
// at fixed sizes and artwork placement, opaque on white. Run from apps/web: node scripts/gen-brand-assets.mjs [--dry]
import sharp from "sharp";
import fs from "node:fs";

const WEB = ".";
const dryRun = process.argv.includes("--dry");
const OUT = dryRun ? "./.brand-preview" : WEB;
fs.mkdirSync(`${OUT}/public`, { recursive: true });
fs.mkdirSync(`${OUT}/app`, { recursive: true });

// Render the SVG to fit a box (x, y, w, h) on a white canvas of size W x H.
async function place(svg, W, H, box) {
  const art = await sharp(svg, { density: 72 * 4 })
    .resize(box.w, box.h, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png().toBuffer();
  const meta = await sharp(art).metadata();
  return sharp({ create: { width: W, height: H, channels: 4, background: "#ffffff" } })
    .composite([{ input: art, left: Math.round(box.x + (box.w - meta.width) / 2), top: Math.round(box.y + (box.h - meta.height) / 2) }])
    .flatten({ background: "#ffffff" })
    .png({ compressionLevel: 9, palette: false });
}

const jobs = [
  // [output, source svg, canvas W, H, artwork box] -- boxes match the old files' measured artwork.
  ["public/logo.png", "public/logo.svg", 1024, 438, { x: 14, y: 69, w: 1002, h: 252 }],
  ["public/logo-sm.png", "public/logo.svg", 800, 342, { x: 10, y: 54, w: 784, h: 198 }],
  ["public/logo-compact.png", "public/logo-compact.svg", 1010, 260, { x: 4, y: 4, w: 1002, h: 252 }],
  ["public/icon-512.png", "public/logo-mark.svg", 512, 512, { x: 36, y: 60, w: 440, h: 392 }],
  ["app/icon.png", "public/logo-mark.svg", 512, 512, { x: 36, y: 60, w: 440, h: 392 }],
  ["public/icon-192.png", "public/logo-mark.svg", 192, 192, { x: 14, y: 22, w: 164, h: 148 }],
  // Maskable: artwork inside the 80% safe-zone circle (Android crops to any shape).
  ["public/icon-maskable-512.png", "public/logo-mark.svg", 512, 512, { x: 92, y: 106, w: 328, h: 300 }],
  // apple-icon opaque white on purpose (iOS paints transparent backgrounds black).
  ["app/apple-icon.png", "public/logo-mark.svg", 180, 180, { x: 15, y: 22, w: 150, h: 136 }],
];
for (const [out, svg, W, H, box] of jobs) {
  await (await place(svg, W, H, box)).toFile(`${OUT}/${out}`);
  console.log(`${out}  ${W}x${H}  ${(fs.statSync(`${OUT}/${out}`).size / 1024).toFixed(0)} KB`);
}

// favicon.ico with 16/32/48/64 PNG entries (PNG-in-ICO, supported by every current browser).
const sizes = [16, 32, 48, 64];
const pngs = [];
for (const s of sizes) {
  const pad = Math.round(s * 0.04);
  pngs.push(await (await place("public/logo-mark.svg", s, s, { x: pad, y: pad, w: s - 2 * pad, h: s - 2 * pad })).toBuffer());
}
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
const dir = Buffer.alloc(16 * sizes.length);
let offset = 6 + dir.length;
sizes.forEach((s, i) => {
  const e = i * 16;
  dir.writeUInt8(s === 256 ? 0 : s, e); dir.writeUInt8(s === 256 ? 0 : s, e + 1);
  dir.writeUInt8(0, e + 2); dir.writeUInt8(0, e + 3); dir.writeUInt16LE(1, e + 4); dir.writeUInt16LE(32, e + 6);
  dir.writeUInt32LE(pngs[i].length, e + 8); dir.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
fs.writeFileSync(`${OUT}/app/favicon.ico`, Buffer.concat([header, dir, ...pngs]));
console.log(`app/favicon.ico  ${sizes.join("/")}  ${(fs.statSync(`${OUT}/app/favicon.ico`).size / 1024).toFixed(0)} KB`);

