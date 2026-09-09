// Shared provider list for every AI feature in this app (photo analysis, description polish,
// price suggestion, translation, insights summary). Groq and Gemini each have their own, separate
// free-tier daily quota -- neither draws down OpenRouter's own free-tier quota (50/day on this
// account until it's ever purchased $10+ in credits, then 1000/day permanently), so trying them
// first meaningfully multiplies real daily capacity rather than just adding more attempts against
// the same shared bucket. Both expose an OpenAI-compatible endpoint, so they slot into the exact
// same request/response handling OpenRouter already uses -- no per-provider parsing needed.
//
// Groq model: confirmed live (real API calls against the account's own key, Sept 2026) that its
// free-tier catalog and limits have shifted since older docs/blog posts -- llama-3.1-8b-instant no
// longer exists for this key at all, and current text models (openai/gpt-oss-20b,
// qwen/qwen3.8-27b, llama-3.3-70b-versatile) are capped at 30 requests/min, 1,000/day per the
// x-ratelimit-* response headers, not the much higher figures older sources cite. qwen/qwen3.8-27b
// was picked over gpt-oss-20b because gpt-oss-20b has the same OpenRouter-style "reasoning first"
// behavior (message.content empty, real answer stuck in message.reasoning, confirmed live) unless
// reasoning_effort is explicitly set low -- qwen answers directly with no reasoning overhead at all.
//
// Gemini model: also confirmed live that gemini-2.5-flash (the model this app's docs research
// named) now 404s with "no longer available to new users" -- Google's catalog moved on since that
// research was done. gemini-flash-latest and gemini-3.6-flash both hit the same silent-failure
// pattern as the reasoning-mode OpenRouter/Groq models (finish_reason: "length", zero completion
// tokens, empty content) with no equivalent "exclude reasoning" flag that actually worked in
// testing. gemini-flash-lite-latest is the one that answered directly with real content on the
// first try, confirmed for both plain text AND image input (this app's photo-analysis feature
// needs vision) -- and being a "-latest" alias rather than a pinned version, it should keep
// pointing at whatever Google's current lite/flash model is as their catalog keeps moving,
// the same self-maintaining property "openrouter/free" has below.
//
// GitHub Models -- the free API behind "GitHub Copilot free tier" -- is a fourth provider, tried
// after Gemini and before OpenRouter. It authenticates with a GitHub personal access token (needs
// the "Models" read permission on a fine-grained PAT) rather than a dedicated API key, and its
// free-tier daily cap is lower than Groq/Gemini's (documented as ~50 requests/day for gpt-4o-mini
// on the free Copilot tier, higher on paid Copilot plans) -- still a separate quota bucket on top
// of the others, just not the first place to spend it. NOT yet confirmed live against a real
// token as of this writing (unlike Groq/Gemini, which were) -- verify with a real request the
// first time a real GITHUB_MODELS_TOKEN is set, the same way the Groq/Gemini model picks above
// were corrected after their originally-researched models turned out stale.
//
// Entirely optional: GROQ_API_KEY / GOOGLE_AI_API_KEY / GITHUB_MODELS_TOKEN are only used if
// actually set. Get free credentials (no payment method required) at console.groq.com/keys,
// aistudio.google.com/apikey, and github.com/settings/personal-access-tokens (fine-grained PAT,
// "Models" permission set to read-only).
export type ProviderAttempt = {
  baseUrl: string;
  apiKey: string;
  model: string;
  // OpenRouter-specific attribution headers -- harmless to omit for the other providers, which don't use them.
  extraHeaders?: Record<string, string>;
};

const OPENROUTER_HEADERS = { "http-referer": "https://afrodeals.net", "x-title": "AfroDeals" };

// visionCapable filters out Groq (its free-tier models are text-only Llama/Qwen variants, no
// image input) when building the attempt list for photo analysis. GitHub Models' gpt-4o-mini and
// Gemini are both vision-capable, so they stay in the list either way.
export function buildProviderAttempts(openRouterModels: string[], visionCapable: boolean): ProviderAttempt[] {
  const attempts: ProviderAttempt[] = [];

  if (!visionCapable && process.env.GROQ_API_KEY) {
    attempts.push({ baseUrl: "https://api.groq.com/openai/v1/chat/completions", apiKey: process.env.GROQ_API_KEY, model: "qwen/qwen3.8-27b" });
  }
  if (process.env.GOOGLE_AI_API_KEY) {
    attempts.push({
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: process.env.GOOGLE_AI_API_KEY,
      model: "gemini-flash-lite-latest",
    });
  }
  if (process.env.GITHUB_MODELS_TOKEN) {
    attempts.push({
      baseUrl: "https://models.github.ai/inference/chat/completions",
      apiKey: process.env.GITHUB_MODELS_TOKEN,
      model: "openai/gpt-4o-mini",
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
