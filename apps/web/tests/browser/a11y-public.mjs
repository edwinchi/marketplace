// axe-core WCAG 2.x A/AA scan of MarketitNow's signed-out pages, phone + desktop.
// usage: node a11y-public.mjs <baseUrl>   -> lists serious/critical violations per rule
import fs from "node:fs";
import { createRequire } from "node:module";
const { chromium } = await import("playwright-core");
const AXE = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const B = process.argv[2] ?? "http://localhost:3217";
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + "/robots.txt")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
const browser = await chromium.launch();
const byRule = new Map();
let pages = 0;
for (const [name, vp] of [["phone", { width: 390, height: 844 }], ["desktop", { width: 1440, height: 900 }]]) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(B + "/", { waitUntil: "networkidle" });
  const listing = await page.locator('a[href*="/listings/"]:not([href$="/new"])').first().getAttribute("href");
  const cat = await page.locator('a[href^="/categories/"]').first().getAttribute("href");
  for (const p of ["/", listing, cat, "/login", "/login?tab=signup", "/welcome", "/safety", "/terms", "/help", "/app", "/feedback", "/documents/buying-checklist", "/forgot-password"]) {
    if (!p) continue;
    await page.goto(B + p, { waitUntil: "networkidle" });
    await page.addScriptTag({ content: AXE });
    const res = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })).violations);
    pages++;
    for (const v of res.filter((v) => v.impact === "serious" || v.impact === "critical")) {
      const e = byRule.get(v.id) ?? { impact: v.impact, help: v.help, where: new Set(), nodes: [] };
      e.where.add(`${name}:${p.split("?")[0].slice(0, 40)}`);
      for (const n of v.nodes.slice(0, 2)) if (e.nodes.length < 4) e.nodes.push(`${n.target.join(" ")} :: ${(n.failureSummary ?? "").split("\n")[1]?.trim().slice(0, 110)}`);
      byRule.set(v.id, e);
    }
  }
  await page.close();
}
await browser.close();
console.log(`scanned ${pages} page views; serious/critical rule types: ${byRule.size}`);
for (const [id, e] of byRule) {
  console.log(`\n[${e.impact}] ${id}: ${e.help}\n  pages: ${[...e.where].join(", ")}`);
  for (const n of e.nodes) console.log("  - " + n);
}
process.exit(byRule.size ? 1 : 0);
