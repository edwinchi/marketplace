import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLIENT_NAMESPACES, pickClientMessages } from "@/lib/client-messages";

const ROOT = path.resolve(__dirname, "..");
const LOCALES = ["en", "nl", "fr", "ar", "zh"];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name.startsWith(".") ? [] : walk(p);
    return /\.(tsx?|jsx?)$/.test(e.name) ? [p] : [];
  });
}
const clientFiles = ["app", "components", "lib"]
  .flatMap((d) => walk(path.join(ROOT, d)))
  .filter((f) => /^\s*["']use client["']/m.test(fs.readFileSync(f, "utf8")));

describe("client translation messages", () => {
  it("every namespace a client component uses is sent to the browser", () => {
    const missing: string[] = [];
    for (const f of clientFiles) {
      const src = fs.readFileSync(f, "utf8");
      for (const m of src.matchAll(/useTranslations\(\s*["']([A-Za-z]+)(?:\.[^"']*)?["']\s*\)/g)) {
        if (!(CLIENT_NAMESPACES as readonly string[]).includes(m[1])) missing.push(`${path.relative(ROOT, f)}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("no client component reads translations in a way this list can't see", () => {
    const opaque = clientFiles.filter((f) => /useTranslations\(\s*\)|useMessages\(/.test(fs.readFileSync(f, "utf8")));
    expect(opaque.map((f) => path.relative(ROOT, f))).toEqual([]);
  });

  it("every listed namespace exists in every locale, and the subset drops the server-only ones", () => {
    for (const locale of LOCALES) {
      const messages = JSON.parse(fs.readFileSync(path.join(ROOT, "messages", `${locale}.json`), "utf8"));
      for (const ns of CLIENT_NAMESPACES) expect(messages, `${locale} is missing ${ns}`).toHaveProperty(ns);
      const picked = pickClientMessages(messages);
      expect(Object.keys(picked).sort()).toEqual([...CLIENT_NAMESPACES].sort());
      expect(picked).not.toHaveProperty("Terms");
    }
  });
});
