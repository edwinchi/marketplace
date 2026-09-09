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
// OpenAI direct (api.openai.com) is a fifth provider, and the only one here with no free tier at
// all -- there is no such thing as a free/unlimited ChatGPT API; the products people call "free
// ChatGPT" (the consumer web/app product) and "the OpenAI API" are different things, and the API
// is metered per request regardless of which model. Per this project's cost-minimization stance
// (see feedback_ai_api_cost_management memory: prefer free calls, only pay when genuinely needed),
// it's placed AFTER every free provider above and after OpenRouter's own free models -- so it only
// gets used once every free option has already failed -- and BEFORE OpenRouter's
// anthropic/claude-sonnet-4.5 paid fallback, since gpt-4o-mini is dramatically cheaper per call
// than a paid Claude request while still covering both text and vision.
//
// Entirely optional: GROQ_API_KEY / GOOGLE_AI_API_KEY / GITHUB_MODELS_TOKEN / OPENAI_API_KEY are
// only used if actually set. Get free credentials (no payment method required) at
// console.groq.com/keys, aistudio.google.com/apikey, and
// github.com/settings/personal-access-tokens (fine-grained PAT, "Models" permission set to
// read-only). OPENAI_API_KEY is paid-only -- platform.openai.com/api-keys, billing required.
export type ProviderAttempt = {
  baseUrl: string;
  apiKey: string;
  model: string;
  // OpenRouter-specific attribution headers -- harmless to omit for the other providers, which don't use them.
  extraHeaders?: Record<string, string>;
};

const OPENROUTER_HEADERS = { "http-referer": "https://afrodeals.net", "x-title": "AfroDeals" };
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// visionCapable filters out Groq (its free-tier models are text-only Llama/Qwen variants, no
// image input) when building the attempt list for photo analysis. GitHub Models' gpt-4o-mini,
// Gemini, and OpenAI's gpt-4o-mini are all vision-capable, so they stay in the list either way.
//
// openRouterPaidModel is split out from openRouterFreeModels (rather than just being the last
// entry in one list, as it used to be) so OpenAI's direct gpt-4o-mini call -- cheaper than a paid
// OpenRouter/Claude request -- can sit between "every free option" and "the one paid OpenRouter
// model," rather than only after ALL OpenRouter models including the expensive one. Pass null to
// skip the paid OpenRouter attempt entirely (used for the OPENROUTER_MODEL test-override case).
export function buildProviderAttempts(openRouterFreeModels: string[], openRouterPaidModel: string | null, visionCapable: boolean): ProviderAttempt[] {
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
    for (const model of openRouterFreeModels) {
      attempts.push({ baseUrl: OPENROUTER_URL, apiKey: openRouterKey, model, extraHeaders: OPENROUTER_HEADERS });
    }
  }

  if (process.env.OPENAI_API_KEY) {
    attempts.push({ baseUrl: "https://api.openai.com/v1/chat/completions", apiKey: process.env.OPENAI_API_KEY, model: "gpt-4o-mini" });
  }

  if (openRouterKey && openRouterPaidModel) {
    attempts.push({ baseUrl: OPENROUTER_URL, apiKey: openRouterKey, model: openRouterPaidModel, extraHeaders: OPENROUTER_HEADERS });
  }

  return attempts;
}
