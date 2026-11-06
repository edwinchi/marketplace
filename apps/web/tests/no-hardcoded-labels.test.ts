import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Screen-reader labels must come from messages/*.json like visible text (AGENTS.md §7 i18n): a
// literal aria-label="Something" is read out in English to an Arabic, Chinese, Dutch or French
// visitor. Brand-only strings can be added to ALLOWED if one is ever genuinely untranslatable.
const ROOT = path.resolve(__dirname, "..");
const ALLOWED = new Set<string>([]);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name.startsWith(".") ? [] : walk(p);
    return e.name.endsWith(".tsx") ? [p] : [];
  });
}

describe("accessible labels are translated", () => {
  it("no hardcoded English aria-label / alt-free label literals in app or components", () => {
    const found: string[] = [];
    for (const f of ["app", "components"].flatMap((d) => walk(path.join(ROOT, d)))) {
      for (const m of fs.readFileSync(f, "utf8").matchAll(/aria-label="([A-Za-z][^"]*)"/g)) {
        if (!ALLOWED.has(m[1])) found.push(`${path.relative(ROOT, f)}: "${m[1]}"`);
      }
    }
    expect(found).toEqual([]);
  });
});
