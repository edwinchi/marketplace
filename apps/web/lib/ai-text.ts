// Shared text-only caller for the Seller Pro AI features (description polish, price
// suggestion write-up, translation) -- the same free-first, paid-fallback-last strategy
// analyze-photo-action.ts already uses for photo analysis, pulled out here so four separate
// features don't each reimplement the same fetch/retry loop.
//
// Attempts Groq and Gemini first (see lib/ai-providers.ts) -- each has its own, separate free
// daily quota, so they absorb the bulk of traffic and leave OpenRouter's much scarcer free quota
// as a backup-of-backups. Both are entirely optional: if GROQ_API_KEY/GOOGLE_AI_API_KEY aren't
// set, this falls straight through to the OpenRouter chain with no behavior change.
//
// "openrouter/free" leads the OpenRouter portion of the list rather than a specific named free
// model -- confirmed live that a hardcoded free model slug (minimax/minimax-m3:free, formerly
// first here) can be deprecated by OpenRouter without notice (started returning 404 "unavailable
// for free"), which broke every AI feature using this list until caught. openrouter/free is
// OpenRouter's own router to whatever free model is actually up right now, so it self-maintains
// against exactly that failure mode. The rest are named free models to widen the pool further --
// each one that's rate-limited or down just costs one more attempt before the next.
import { buildProviderAttempts } from "./ai-providers";

const OPENROUTER_FALLBACK_MODELS = [
  "openrouter/free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "liquid/lfm-2.5-2.6b:free",
  "nex-agi/nex-n2.5-pro:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "anthropic/claude-sonnet-4.5",
];

export async function callFreeTextModel(prompt: string, maxTokens = 800): Promise<{ text: string | null; error: string | null }> {
  const openRouterModels = process.env.OPENROUTER_MODEL ? [process.env.OPENROUTER_MODEL] : OPENROUTER_FALLBACK_MODELS;
  const attempts = buildProviderAttempts(openRouterModels, false);
  if (attempts.length === 0) return { text: null, error: "AI isn't set up on this server yet." };

  let res: Response | null = null;
  let lastStatus = 0;
  let networkError = false;
  for (const attempt of attempts) {
    // reasoning:{exclude:true} is an OpenRouter-specific extension -- some free models there default
    // to burning the whole token budget on internal "thinking" before ever emitting real content.
    // Groq/Gemini's OpenAI-compatible endpoints don't recognize this field, so only send it to OpenRouter.
    const body: Record<string, unknown> = { model: attempt.model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] };
    if (attempt.baseUrl.includes("openrouter.ai")) body.reasoning = { exclude: true };
    try {
      res = await fetch(attempt.baseUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${attempt.apiKey}`,
          ...attempt.extraHeaders,
        },
        body: JSON.stringify(body),
      });
      networkError = false;
    } catch {
      res = null;
      networkError = true;
      continue;
    }
    if (res.ok) break;
    lastStatus = res.status;
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
