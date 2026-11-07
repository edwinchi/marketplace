// Builds the per-language intro videos the site plays on a visitor's first page
// (components/intro-video.tsx). Reads the owner's originals, "<Language> Intro 10 seconds.mp4"
// (portrait 720x1280, ~5.5 MB each), and writes for each one:
//   public/intro/<locale>-<sha8>.mp4   720x1280 H.264 + AAC, fast start (~1.8 MB)
//   public/intro/<locale>-<sha8>.webp  preview frame shown before the video loads
// plus lib/intro-videos.json (locale -> file names). Names carry a content hash so browsers and
// the CDN never keep an old copy.
//
// ffmpeg isn't a project dependency: pass its path.
// usage (from apps/web): node scripts/gen-intro-videos.mjs --ffmpeg=<path to ffmpeg> [--src=../..]
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const FFMPEG = arg("ffmpeg", process.env.FFMPEG);
const SRC = path.resolve(arg("src", "../.."));
if (!FFMPEG) throw new Error("pass --ffmpeg=<path to ffmpeg>");

// Site locale -> the video named after that language. Locales without their own video
// (zh) get the English one in the component.
const VIDEOS = { en: "English", nl: "Dutch", fr: "French", ar: "Arabic" };
const OUT = "public/intro";
const POSTER_AT = "1.0"; // seconds: the first headline is on screen

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "intro-"));
const map = {};
for (const [locale, language] of Object.entries(VIDEOS)) {
  const input = path.join(SRC, `${language} Intro 10 seconds.mp4`);
  if (!fs.existsSync(input)) throw new Error(`missing ${input}`);
  const mp4 = path.join(tmp, `${locale}.mp4`);
  const png = path.join(tmp, `${locale}.png`);
  execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-i", input,
    "-vf", "scale=720:1280:flags=lanczos", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "27",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "96k", mp4]);
  execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-ss", POSTER_AT, "-i", mp4, "-frames:v", "1", png]);
  const video = fs.readFileSync(mp4);
  const poster = await sharp(png).webp({ quality: 72 }).toBuffer();
  const hash = createHash("sha256").update(video).digest("hex").slice(0, 8);
  fs.writeFileSync(path.join(OUT, `${locale}-${hash}.mp4`), video);
  fs.writeFileSync(path.join(OUT, `${locale}-${hash}.webp`), poster);
  map[locale] = { video: `/intro/${locale}-${hash}.mp4`, poster: `/intro/${locale}-${hash}.webp` };
  console.log(locale, language, `${(video.length / 1e6).toFixed(2)} MB`, `poster ${(poster.length / 1e3).toFixed(0)} KB`);
}
fs.rmSync(tmp, { recursive: true, force: true });
fs.writeFileSync("lib/intro-videos.json", JSON.stringify(map, null, 2) + "\n");
console.log("wrote lib/intro-videos.json");
