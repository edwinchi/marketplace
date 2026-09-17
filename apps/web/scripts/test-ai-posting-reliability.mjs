// Reliability check for the AI-assisted-posting pipeline (app/listings/new/analyze-photo-action.ts).
// Every real failure of that feature documented in its own comments has been at the provider layer
// (a free model deprecated out from under the fallback list, a "reasoning" model silently eating
// its whole token budget, a 429/402) -- not the UI, not the DB reservation bookkeeping (already
// atomic, see 20260101006700_atomic_ai_use_reservation.sql). So this calls the same provider
// fallback chain directly with a real listing photo, the same way the server action does, without
// going through a browser or spending a real user's AI-usage counter.
//
// IMPORTANT: the provider list/prompt below is a deliberate copy of analyze-photo-action.ts's, not
// an import (this script runs standalone, outside Next.js) -- matches this repo's existing pattern
// for scripts/ (see backfill-category-embeddings.mjs). If the real action's model list or prompt
// changes, mirror the change here too, or this test silently stops reflecting production.
//
// Run: node scripts/test-ai-posting-reliability.mjs [count]
//   count defaults to 5 (safe for a daily unattended run -- see ops/register-ai-posting-test-task.ps1).
//   Pass a larger number for a one-off confidence run, e.g. `node scripts/test-ai-posting-reliability.mjs 99`.
//   Real cost/quota note: every attempt tries Gemini first (its own quota, generous, not shared with
//   OpenRouter), falling through to OpenRouter's free models (shared 50-1000/day pool across every
//   real user) and finally a paid OpenRouter call only if every free option fails. A large count is
//   fine as an occasional manual check; don't schedule 99/day forever without knowing that's what
//   you're spending.
import { readFileSync, appendFileSync } from "fs";

const HERE = new URL(".", import.meta.url);
const ENV_PATH = new URL("../.env.local", HERE);
const LOG_PATH = new URL("../../../ops/ai-posting-test.log", HERE);

const env = readFileSync(ENV_PATH, "utf8");
const envVar = (name) => env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim();

const SUPABASE_URL = envVar("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = envVar("SUPABASE_SERVICE_ROLE_KEY");
const GOOGLE_AI_API_KEY = envVar("GOOGLE_AI_API_KEY");
const OPENROUTER_API_KEY = envVar("OPENROUTER_API_KEY");
const RESEND_API_KEY = envVar("RESEND_API_KEY");
const ALERT_TO = "eddyteddy78@gmail.com"; // same Resend sandbox constraint as ops/security-audit.mjs

const COUNT = Number(process.argv[2]) || 5;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_HEADERS = { "http-referer": "https://marketitnow.net", "x-title": "MarketitNow" };
const OPENROUTER_FREE_MODELS = ["openrouter/free", "google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "nex-agi/nex-n2.5-pro:free"];
const OPENROUTER_PAID_MODEL = "anthropic/claude-sonnet-4.5";

function buildAttempts() {
  const attempts = [];
  if (GOOGLE_AI_API_KEY) {
    attempts.push({ label: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", apiKey: GOOGLE_AI_API_KEY, model: "gemini-flash-lite-latest" });
  }
  if (OPENROUTER_API_KEY) {
    for (const model of OPENROUTER_FREE_MODELS) attempts.push({ label: `openrouter-free:${model}`, baseUrl: OPENROUTER_URL, apiKey: OPENROUTER_API_KEY, model, extraHeaders: OPENROUTER_HEADERS });
    attempts.push({ label: "openrouter-paid", baseUrl: OPENROUTER_URL, apiKey: OPENROUTER_API_KEY, model: OPENROUTER_PAID_MODEL, extraHeaders: OPENROUTER_HEADERS });
  }
  return attempts;
}

const PROMPT = `You are helping a seller on MarketitNow, a classifieds marketplace, list an item from a photo.
Respond with ONLY a JSON object (no markdown fences, no commentary) with exactly these keys:
{"title": "short listing title, max 80 characters, no marketing fluff", "description": "a rich, structured draft description in simple markdown"}
If the photo doesn't clearly show a sellable item, respond with {"title": "", "description": ""} instead.`;

function parseJson(text) {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

async function fetchTestImage() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/listing_media?select=storage_key,mime_type&order=created_at.desc&limit=1`, {
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
  });
  const rows = await res.json();
  const media = rows?.[0];
  if (!media) throw new Error("No listing photo found in listing_media to use as a test image.");
  const imgRes = await fetch(`${SUPABASE_URL}/storage/v1/object/public/listings/${media.storage_key}`);
  if (!imgRes.ok) throw new Error(`Couldn't download test image: HTTP ${imgRes.status}`);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  return { base64: buf.toString("base64"), mediaType: media.mime_type || "image/jpeg" };
}

async function runOneAttempt(attempts, imageBase64, mediaType) {
  for (const attempt of attempts) {
    const body = {
      model: attempt.model,
      max_tokens: 1100,
      messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } }] }],
    };
    if (attempt.baseUrl.includes("openrouter.ai")) body.reasoning = { exclude: true };
    let res;
    try {
      res = await fetch(attempt.baseUrl, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${attempt.apiKey}`, ...(attempt.extraHeaders ?? {}) },
        body: JSON.stringify(body),
      });
    } catch (e) {
      continue; // network blip on this provider -- try the next one, same as production
    }
    if (!res.ok) continue;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((p) => p?.text ?? "").join("") : "";
    const parsed = parseJson(text);
    if (parsed?.title) return { ok: true, provider: attempt.label, title: parsed.title };
  }
  return { ok: false, provider: null };
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  try {
    appendFileSync(LOG_PATH, line + "\n");
  } catch {
    // ops/ dir not resolvable from every invocation context -- console output above is still there.
  }
}

async function sendAlert(summary) {
  if (!RESEND_API_KEY) {
    log("WARNING: alert condition met but no RESEND_API_KEY configured -- cannot email");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "MarketitNow AI Reliability <onboarding@resend.dev>",
      to: ALERT_TO,
      subject: `AI-assisted posting: ${summary.successRate}% success (${summary.total} runs)`,
      html: `<h2>AI posting reliability check</h2><p>${summary.ok} / ${summary.total} succeeded (${summary.successRate}%).</p><p>Provider breakdown: ${JSON.stringify(summary.byProvider)}</p><p>Paid-fallback rate: ${summary.paidRate}%.</p>`,
    }),
  });
  if (!res.ok) log(`ERROR: alert email failed: HTTP ${res.status} ${await res.text()}`);
  else log(`alert email sent to ${ALERT_TO}`);
}

async function main() {
  const attempts = buildAttempts();
  if (attempts.length === 0) throw new Error("No AI provider configured (GOOGLE_AI_API_KEY / OPENROUTER_API_KEY both missing).");

  const { base64, mediaType } = await fetchTestImage();
  log(`starting ${COUNT} attempt(s) against ${attempts.length} provider(s) in the fallback chain`);

  let ok = 0;
  let paidCount = 0;
  const byProvider = {};
  let consecutivePrimaryFailures = 0;

  for (let i = 1; i <= COUNT; i++) {
    const result = await runOneAttempt(attempts, base64, mediaType);
    if (result.ok) {
      ok++;
      byProvider[result.provider] = (byProvider[result.provider] ?? 0) + 1;
      if (result.provider === "openrouter-paid") paidCount++;
      consecutivePrimaryFailures = result.provider === attempts[0].label ? 0 : consecutivePrimaryFailures;
    } else {
      log(`attempt ${i}/${COUNT}: FAILED (every provider in the chain failed)`);
    }
    // Space calls out -- a good citizen against per-minute rate limits, and avoids a burst of 99
    // requests in a few seconds looking like abuse to any provider.
    if (i < COUNT) await new Promise((r) => setTimeout(r, 1500));
  }

  const successRate = Math.round((ok / COUNT) * 100);
  const paidRate = ok > 0 ? Math.round((paidCount / ok) * 100) : 0;
  const summary = { total: COUNT, ok, successRate, byProvider, paidRate };
  log(`done: ${ok}/${COUNT} succeeded (${successRate}%) -- by provider: ${JSON.stringify(byProvider)} -- paid-fallback rate: ${paidRate}%`);

  // Alert on either a real reliability drop, or a quiet cost creep (the free chain failing and
  // everything landing on the paid model without anyone noticing) -- either is worth a human look.
  if (successRate < 90 || paidRate > 20) await sendAlert(summary);
}

main().catch((e) => {
  log(`ERROR: ${e.message}`);
  process.exit(1);
});
