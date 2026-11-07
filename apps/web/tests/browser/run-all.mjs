// Runs every browser / live check against one base URL and exits non-zero if any fails.
// usage (from apps/web): node tests/browser/run-all.mjs [baseUrl] [--signed-in] [--load]
//   default baseUrl http://localhost:3217 (a local `next start`); use https://marketitnow.net
//   after a deploy. --signed-in adds the signed-in accessibility scan (needs the test account,
//   see a11y-signed-in.mjs); --load adds a light load test (100 requests per page, 10 at a time).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const base = process.argv.find((a) => /^https?:\/\//.test(a)) ?? "http://localhost:3217";
const suites = [
  ["security: anonymous database access", "anon-access.mjs", []],
  ["regression", "regression.mjs", [base]],
  ["accessibility (signed out)", "a11y-public.mjs", [base]],
  ["translations", "translations.mjs", [base]],
  ["translations (E6)", "translations-e6.mjs", [base]],
];
if (process.argv.includes("--signed-in")) suites.push(["accessibility (signed in)", "a11y-signed-in.mjs", [base]]);
if (process.argv.includes("--load")) suites.push(["load", "load.mjs", [base, "100", "10"]]);

let failed = 0;
for (const [name, file, args] of suites) {
  console.log(`\n== ${name}`);
  const r = spawnSync(process.execPath, [path.join(dir, file), ...args], { stdio: "inherit" });
  if (r.status !== 0) { failed++; console.log(`FAILED: ${name} (exit ${r.status})`); }
}
console.log(`\n${suites.length - failed}/${suites.length} suites passed`);
process.exit(failed ? 1 : 0);
