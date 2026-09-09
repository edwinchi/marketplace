// Whether each fallback provider (see lib/ai-providers.ts) is configured -- a plain env var read,
// no external API call. Groq/Gemini/GitHub Models don't expose a public "check my usage" endpoint
// the way OpenRouter's /api/v1/credits does (confirmed via research, Sept 2026 -- their real usage
// dashboards are UI-only, gated behind full account sign-in, not a simple API-key-authenticated
// REST call), so there's no live numeric status to show for them the way OpenRouterStatusCard
// shows real credit/usage numbers. This just tells the admin which providers are active.
export type AiFallbackProviderStatus = {
  groqConfigured: boolean;
  geminiConfigured: boolean;
  githubModelsConfigured: boolean;
};

export function getAiFallbackProviderStatus(): AiFallbackProviderStatus {
  return {
    groqConfigured: !!process.env.GROQ_API_KEY,
    geminiConfigured: !!process.env.GOOGLE_AI_API_KEY,
    githubModelsConfigured: !!process.env.GITHUB_MODELS_TOKEN,
  };
}
