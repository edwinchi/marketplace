import { callFreeTextModel, parseJsonResponse } from "./ai-text";

export type ModerationResult = { flagged: boolean; reason: string | null };

// Deliberately scoped to what a general-purpose text model can honestly do well: prohibited items
// (weapons, illegal drugs, adult services) and scam-pattern language (payment/contact requests
// steered outside the platform, classic too-good-to-be-true framing) from the listing's own title
// and description. NOT counterfeit-brand detection -- reliably telling a real Rolex from a fake one
// needs a model trained on real brand-authentication data, not a general LLM prompt; claiming that
// here would be exactly the "fabricated capability" this project's own conventions rule out
// elsewhere (see analyze-photo-action.ts's "never invent measurements... you can't actually see").
// Text-only (not photo-based) so this runs on every listing regardless of whether the seller used
// AI photo analysis, and draws from Groq/Gemini's separate free-tier quotas (lib/ai-providers.ts)
// rather than competing with the vision pipeline's.
//
// Fails open (not flagged) on any AI error -- same "best-effort, not the only safety net" reasoning
// as every other AI feature in this app degrading gracefully; the existing reports table and human
// moderation remain the real backstop, this is triage, not gatekeeping. Never blocks publishing --
// see docs/comments on why an unproven auto-filter shouldn't be allowed to reject a legitimate
// seller's listing.
const PROMPT = (title: string, description: string) => `You are a content-policy pre-screen for MarketitNow, a classifieds marketplace. Review this listing's title and description ONLY (no photo) for two things:
1. Prohibited items: weapons/ammunition, illegal drugs or drug paraphernalia, adult/erotic services.
2. Scam patterns: requests to pay or communicate outside the platform, prices far below plausible market value with urgency language ("must sell today", "no questions"), or classic advance-fee/phishing phrasing.

Title: ${title}
Description: ${description}

Respond with ONLY a JSON object, no markdown fences: {"flagged": true or false, "reason": "one short sentence, empty string if not flagged"}. When genuinely unsure, respond flagged: false -- this is a pre-screen for human review, not a final decision, and false positives cost a real seller's listing visibility for no reason.`;

export async function checkListingContentPolicy(title: string, description: string): Promise<ModerationResult> {
  const { text } = await callFreeTextModel(PROMPT(title, description), 200);
  if (!text) return { flagged: false, reason: null };
  const parsed = parseJsonResponse<{ flagged?: boolean; reason?: string }>(text);
  if (!parsed) return { flagged: false, reason: null };
  return { flagged: !!parsed.flagged, reason: parsed.reason?.trim() || null };
}
