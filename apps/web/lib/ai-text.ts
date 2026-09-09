// Shared text-only OpenRouter caller for the Seller Pro AI features (description polish, price
// suggestion write-up, translation) -- the same free-models-first, paid-fallback-last strategy
// analyze-photo-action.ts already uses for photo analysis, pulled out here so four separate
// features don't each reimplement the same fetch/retry loop.
//
// "openrouter/free" leads the list rather than a specific named free model -- confirmed live that
// a hardcoded free model slug (minimax/minimax-m3:free, formerly first here) can be deprecated by
// OpenRouter without notice (started returning 404 "unavailable for free"), which broke every AI
// feature using this list until caught. openrouter/free is OpenRouter's own router to whatever
// free model is actually up right now, so it self-maintains against exactly that failure mode.
// The rest are named free models to widen the pool further -- each one that's rate-limited or down
// just costs one more attempt before the next, and OpenRouter's free daily-request quota (50/day
// on this account until it's ever purchased $10+ in credits, then 1000/day permanently) counts
// every attempt, success or not, so this list is deliberately not unlimited.
const FALLBACK_MODELS = [
  "openrouter/free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "liquid/lfm-2.5-2.6b:free",
  "nex-agi/nex-n2.5-pro:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "anthropic/claude-sonnet-4.5",
];

export async function callFreeTextModel(prompt: string, maxTokens = 800): Promise<{ text: string | null; error: string | null }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { text: null, error: "AI isn't set up on this server yet." };
  const modelsToTry = process.env.OPENROUTER_MODEL ? [process.env.OPENROUTER_MODEL] : FALLBACK_MODELS;

  let res: Response | null = null;
  let lastStatus = 0;
  let networkError = false;
  for (const model of modelsToTry) {
    try {
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          "http-referer": "https://afrodeals.net",
          "x-title": "AfroDeals",
        },
        // reasoning: { exclude: true } -- confirmed live that several current free models default
        // to an internal "thinking" pass that can consume the entire max_tokens budget before ever
        // emitting a real answer, leaving message.content null and message.reasoning holding the
        // model's scratch-work instead. This still lets the model think, it just omits that text
        // from the response and reliably leaves room for the actual content within a smaller
        // max_tokens budget than fitting both would need.
        body: JSON.stringify({ model, max_tokens: maxTokens, reasoning: { exclude: true }, messages: [{ role: "user", content: prompt }] }),
      });
      networkError = false;
    } catch {
      // A blip on this one model shouldn't forfeit the whole fallback chain -- try the next model
      // instead of giving up immediately, same as a retryable HTTP status below.
      res = null;
      networkError = true;
      continue;
    }
    if (res.ok) break;
    lastStatus = res.status;
    // Try every model in the list regardless of why the previous one failed -- confirmed live
    // that OpenRouter can deprecate a free model out from under this list entirely (a 404, not a
    // retryable-looking status), and stopping at the first failure meant this whole feature was
    // silently dead until the fallback list was updated, never even reaching the paid model at
    // the end. The only real cost of trying one more model is a small added latency.
  }

  if (!res || !res.ok) {
    if (!res && networkError) return { text: null, error: "Couldn't reach the AI service. Check your connection and try again." };
    if (lastStatus === 429) return { text: null, error: "AI is busy right now — try again in a moment." };
    if (lastStatus === 402) return { text: null, error: "AI is temporarily unavailable — the account behind it needs more credits." };
    return { text: null, error: `AI request failed (${lastStatus}). Try again in a moment.` };
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  const text: string =
    typeof content === "string" ? content : Array.isArray(content) ? content.map((p: { text?: string }) => p?.text ?? "").join("") : "";
  return { text: text.trim() || null, error: text.trim() ? null : "Couldn't make sense of that — try again." };
}

// The free fallback models are picked for cost, not instruction-following -- despite every prompt
// in this app explicitly saying "no markdown fences", one occasionally wraps its JSON in ```json
// ... ``` anyway. Stripping that before JSON.parse avoids failing (and, worse, wasting an already-
// charged use) on a formatting quirk that has nothing to do with whether the model's answer was good.
export function parseJsonResponse<T>(text: string): T | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
