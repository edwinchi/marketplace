import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLIENT_NAMESPACES, ROUTE_CLIENT_NAMESPACES, pickClientMessages } from "@/lib/client-messages";

const ROOT = path.resolve(__dirname, "..");
const LOCALES = ["en", "nl", "fr", "ar", "zh"];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name.startsWith(".") ? [] : walk(p);
    return /\.(tsx?|jsx?)$/.test(e.name) ? [p] : [];
  });
}
const allFiles = ["app", "components", "lib"].flatMap((d) => walk(path.join(ROOT, d)));
const read = (f: string) => fs.readFileSync(f, "utf8");
const clientFiles = allFiles.filter((f) => /^\s*["']use client["']/m.test(read(f)));
const usedNamespaces = (f: string) => [...read(f).matchAll(/useTranslations\(\s*["']([A-Za-z]+)(?:\.[^"']*)?["']\s*\)/g)].map((m) => m[1]);
const routeOf = new Map<string, string>(Object.entries(ROUTE_CLIENT_NAMESPACES).flatMap(([route, nss]) => nss.map((ns) => [ns, route] as [string, string])));

// "@/components/welcome/floating-cta-bar" -> files that import it
function importersOf(file: string): string[] {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/").replace(/\.(tsx?|jsx?)$/, "");
  return allFiles.filter((f) => f !== file && read(f).includes(`"@/${rel}"`));
}

describe("client translation messages", () => {
  it("every namespace a client component uses is sent to the browser (globally or on its route)", () => {
    const missing: string[] = [];
    for (const f of clientFiles) {
      for (const ns of usedNamespaces(f)) {
        if (!(CLIENT_NAMESPACES as readonly string[]).includes(ns) && !routeOf.has(ns)) missing.push(`${path.relative(ROOT, f)}: ${ns}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("route-only namespaces are used only by components imported from that route, wrapped in RouteMessages", () => {
    const wrong: string[] = [];
    for (const f of clientFiles) {
      for (const ns of usedNamespaces(f)) {
        const route = routeOf.get(ns);
        if (!route) continue;
        const importers = importersOf(f);
        if (importers.length === 0) wrong.push(`${path.relative(ROOT, f)} (${ns}) is imported nowhere`);
        for (const imp of importers) {
          const relImp = path.relative(ROOT, imp).replace(/\\/g, "/");
          if (!relImp.startsWith(`app/${route}/`)) wrong.push(`${relImp} uses ${ns} outside app/${route}/`);
          else if (!read(imp).includes(`namespaces={["${ns}"]}`)) wrong.push(`${relImp} doesn't wrap it in <RouteMessages namespaces={["${ns}"]}>`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it("no client component reads translations in a way this list can't see", () => {
    const opaque = clientFiles.filter((f) => /useTranslations\(\s*\)|useMessages\(/.test(read(f)));
    expect(opaque.map((f) => path.relative(ROOT, f))).toEqual([]);
  });

  it("every listed namespace exists in every locale, and the subset drops the server-only ones", () => {
    const routeNamespaces = Object.values(ROUTE_CLIENT_NAMESPACES).flat();
    for (const locale of LOCALES) {
      const messages = JSON.parse(fs.readFileSync(path.join(ROOT, "messages", `${locale}.json`), "utf8"));
      for (const ns of [...CLIENT_NAMESPACES, ...routeNamespaces]) expect(messages, `${locale} is missing ${ns}`).toHaveProperty(ns);
      const picked = pickClientMessages(messages);
      expect(Object.keys(picked).sort()).toEqual([...CLIENT_NAMESPACES].sort());
      expect(picked).not.toHaveProperty("Terms");
      expect(picked).not.toHaveProperty("Welcome");
      expect(Object.keys(pickClientMessages(messages, ["Welcome"]))).toContain("Welcome");
    }
  });
});
