// Runs public.run_security_audit() (supabase/migrations/20260101007300_security_audit_function.sql)
// against the live database every 12h (registered as a Windows Scheduled Task -- see
// ops/register-security-audit-task.ps1, same pattern as watchdog.py) and emails a diff against the
// last known state, not the full finding list every time -- alerting on all ~15 pre-existing,
// already-reviewed findings (search_path-mutable functions, RPCs callable by anon, etc.) on every
// run would just teach the recipient to ignore these emails, which is exactly how the
// listing_translations exposure this was built to catch sat unnoticed. Baseline is seeded silently
// on first run; only NEW findings (not present in the previous run) trigger an email.
//
// Credentials: reads apps/web/.env.local directly (NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY) -- same file the app itself uses, nothing new to
// provision or keep in sync.
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(HERE, "..", "apps", "web", ".env.local");
const STATE_PATH = join(HERE, "security-audit-state.local.json");
const LOG_PATH = join(HERE, "security-audit.log");

// Resend's sandbox account (no verified custom domain yet) only delivers to its own registered
// address -- confirmed live 2026-09-16 (a send to apehgongedwin@gmail.com 403'd with "You can only
// send testing emails to your own email address (eddyteddy78@gmail.com)"). Update this once a
// domain is verified at resend.com/domains.
const ALERT_TO = "eddyteddy78@gmail.com";

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  writeFileSync(LOG_PATH, line + "\n", { flag: "a" });
}

function readEnv() {
  const text = readFileSync(ENV_PATH, "utf8");
  const get = (key) =>
    text
      .split("\n")
      .find((l) => l.startsWith(`${key}=`))
      ?.slice(key.length + 1)
      .trim();
  const url = get("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = get("RESEND_API_KEY");
  if (!url || !serviceKey) throw new Error(`Missing Supabase URL/service key in ${ENV_PATH}`);
  return { url, serviceKey, resendKey };
}

async function runAudit(url, serviceKey) {
  const res = await fetch(`${url}/rest/v1/rpc/run_security_audit`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
    },
    body: "{}",
  });
  if (!res.ok) throw new Error(`run_security_audit HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

function findingKey(category, item) {
  return `${category}:${item.table}${item.policy ? `:${item.policy}` : ""}`;
}

function allFindings(audit) {
  const out = [];
  for (const category of ["rls_disabled", "rls_enabled_no_policies", "unconditional_select_policies"]) {
    for (const item of audit[category] ?? []) out.push({ category, key: findingKey(category, item), item });
  }
  return out;
}

function loadPreviousKeys() {
  if (!existsSync(STATE_PATH)) return null; // null = no baseline yet, first run
  return new Set(JSON.parse(readFileSync(STATE_PATH, "utf8")).keys);
}

function saveKeys(keys) {
  writeFileSync(STATE_PATH, JSON.stringify({ savedAt: new Date().toISOString(), keys: [...keys] }, null, 2));
}

async function sendAlert(resendKey, newFindings) {
  if (!resendKey) {
    log(`WARNING: ${newFindings.length} new finding(s) but no RESEND_API_KEY configured -- cannot email`);
    return;
  }
  const rows = newFindings
    .map((f) => `<li><strong>${f.category}</strong>: ${f.item.table}${f.item.policy ? ` (policy: ${f.item.policy})` : ""}</li>`)
    .join("");
  const html = `
    <h2>New security-audit finding${newFindings.length > 1 ? "s" : ""} — afrodeals-ai</h2>
    <p>run_security_audit() found ${newFindings.length} new item${newFindings.length > 1 ? "s" : ""} not present in the last check:</p>
    <ul>${rows}</ul>
    <p><strong>rls_disabled</strong>: RLS off entirely on a public table -- most severe, check immediately.<br>
    <strong>rls_enabled_no_policies</strong>: RLS on but no policies -- table is silently unreadable/unwritable by the app.<br>
    <strong>unconditional_select_policies</strong>: a select policy with no row filter (<code>using (true)</code>) --
    fine for genuinely public reference data, worth a second look if the table holds anything else.</p>
  `;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "MarketitNow Security <onboarding@resend.dev>",
      to: ALERT_TO,
      subject: `Security audit: ${newFindings.length} new finding${newFindings.length > 1 ? "s" : ""}`,
      html,
    }),
  });
  if (!res.ok) log(`ERROR: alert email failed: HTTP ${res.status} ${await res.text()}`);
  else log(`alert email sent to ${ALERT_TO} (${newFindings.length} new finding(s))`);
}

async function main() {
  const { url, serviceKey, resendKey } = readEnv();
  const audit = await runAudit(url, serviceKey);
  const findings = allFindings(audit);
  const currentKeys = new Set(findings.map((f) => f.key));

  const previousKeys = loadPreviousKeys();
  if (previousKeys === null) {
    log(`first run -- seeding baseline with ${currentKeys.size} existing finding(s), no alert sent`);
    saveKeys(currentKeys);
    return;
  }

  const newFindings = findings.filter((f) => !previousKeys.has(f.key));
  log(`checked: ${currentKeys.size} total finding(s), ${newFindings.length} new since last run`);
  saveKeys(currentKeys);

  if (newFindings.length > 0) await sendAlert(resendKey, newFindings);
}

main().catch((e) => {
  log(`ERROR: ${e.message}`);
  process.exit(1);
});
