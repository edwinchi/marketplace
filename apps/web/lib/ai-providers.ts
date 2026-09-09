// Shared provider list for every AI feature in this app (photo analysis, description polish,
// price suggestion, translation, insights summary). Groq and Gemini each have their own, separate
// free-tier daily quota (Groq's llama-3.1-8b-instant: 14,400 requests/day; Gemini's
// gemini-2.5-flash: 1,500 requests/day) -- neither draws down OpenRouter's own free-tier quota
// (50/day on this account until it's ever purchased $10+ in credits, then 1000/day permanently),
// so trying them first meaningfully multiplies real daily capacity rather than just adding more
// attempts against the same shared bucket. Both expose an OpenAI-compatible endpoint, so they slot
// into the exact same request/response handling OpenRouter already uses -- no per-provider parsing
// needed.
//
// Entirely optional: GROQ_API_KEY / GOOGLE_AI_API_KEY are only used if actually set. Get free keys
// (no payment method required) at console.groq.com/keys and aistudio.google.com/apikey.
export type ProviderAttempt = {
  baseUrl: string;
  apiKey: string;
  model: string;
  // OpenRouter-specific attribution headers -- harmless to omit for Groq/Gemini, which don't use them.
  extraHeaders?: Record<string, string>;
};

const OPENROUTER_HEADERS = { "http-referer": "https://afrodeals.net", "x-title": "AfroDeals" };

// visionCapable filters out Groq (its free-tier models are text-only Llama variants, no image
// input) when building the attempt list for photo analysis.
export function buildProviderAttempts(openRouterModels: string[], visionCapable: boolean): ProviderAttempt[] {
  const attempts: ProviderAttempt[] = [];

  if (!visionCapable && process.env.GROQ_API_KEY) {
    attempts.push({ baseUrl: "https://api.groq.com/openai/v1/chat/completions", apiKey: process.env.GROQ_API_KEY, model: "llama-3.1-8b-instant" });
  }
  if (process.env.GOOGLE_AI_API_KEY) {
    attempts.push({
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: process.env.GOOGLE_AI_API_KEY,
      model: "gemini-2.5-flash",
    });
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    for (const model of openRouterModels) {
      attempts.push({ baseUrl: "https://openrouter.ai/api/v1/chat/completions", apiKey: openRouterKey, model, extraHeaders: OPENROUTER_HEADERS });
    }
  }

  return attempts;
}
