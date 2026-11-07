import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { introVideoFor } from "@/lib/intro-video";

const PUBLIC = path.resolve(__dirname, "../public");
const LOCALES = fs.readdirSync(path.resolve(__dirname, "../messages")).map((f) => f.replace(/\.json$/, ""));

describe("intro video per language", () => {
  it("each language with its own video gets that video", () => {
    for (const locale of ["en", "nl", "fr", "ar"]) {
      expect(introVideoFor(locale).video).toMatch(new RegExp(`^/intro/${locale}-[0-9a-f]{8}\\.mp4$`));
      expect(introVideoFor(locale).poster).toMatch(new RegExp(`^/intro/${locale}-[0-9a-f]{8}\\.webp$`));
    }
  });

  it("a language without one (zh) falls back to English", () => {
    expect(introVideoFor("zh")).toEqual(introVideoFor("en"));
    expect(introVideoFor("xx")).toEqual(introVideoFor("en"));
  });

  it("every site language resolves to files that exist and are small enough to autoplay", () => {
    expect(LOCALES.sort()).toEqual(["ar", "en", "fr", "nl", "zh"]);
    for (const locale of LOCALES) {
      const { video, poster } = introVideoFor(locale);
      expect(fs.existsSync(path.join(PUBLIC, poster))).toBe(true);
      expect(fs.statSync(path.join(PUBLIC, video)).size).toBeLessThan(2_500_000);
    }
  });
});
