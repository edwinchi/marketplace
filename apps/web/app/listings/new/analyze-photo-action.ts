"use server";

import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getCategoriesAndAttributes } from "@/lib/categories";
import { isAdminEmail } from "@/lib/admin";
import { parseJsonResponse } from "@/lib/ai-text";
import { buildProviderAttempts } from "@/lib/ai-providers";

// Free tier: 5 uses per registered account, then an honest "upgrade" prompt — there's no payment
// processor wired up yet to actually charge for more (see /my-account/ai-features), so this just
// stops rather than faking a paywall bypass.
const FREE_USE_LIMIT = 5;

export type PhotoAnalysis = {
  title: string;
  description: string;
  categoryId: string;
  categoryLabel: string;
};

export type AnalyzePhotoResult = {
  data: PhotoAnalysis | null;
  error: string | null;
  usesLeft: number;
  freeLimit: number;
  unlimited: boolean;
};

type UsageRow = { ai_photo_analysis_uses: number | null; ai_bonus_uses: number | null; ai_subscription_status: string | null };

// Seller Pro subscribers and admins bypass the counter entirely; everyone else's effective cap is
// the free limit plus whatever they've bought via one-time top-ups (ai_bonus_uses) — see
// supabase/migrations/20260101004300_ai_subscriptions.sql and /my-account/ai-features.
function usageFromRow(row: UsageRow | null, isAdmin: boolean) {
  const unlimited = isAdmin || row?.ai_subscription_status === "active";
  const usesSoFar = row?.ai_photo_analysis_uses ?? 0;
  const effectiveLimit = FREE_USE_LIMIT + (row?.ai_bonus_uses ?? 0);
  return { unlimited, usesSoFar, effectiveLimit, usesLeft: unlimited ? effectiveLimit : Math.max(0, effectiveLimit - usesSoFar) };
}

// Exported so the listing-creation pages (Server Components) can show "N free uses left" before
// the user ever uploads a photo, not just after — a plain read, no API call, so it costs nothing
// to show proactively.
export async function getAiUsageStatus(): Promise<{ usesLeft: number; freeLimit: number; effectiveLimit: number; unlimited: boolean }> {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return { usesLeft: 0, freeLimit: FREE_USE_LIMIT, effectiveLimit: FREE_USE_LIMIT, unlimited: false };
  const supabase = await createClient();
  const { data: usageRow } = await supabase
    .from("profiles")
    .select("ai_photo_analysis_uses, ai_bonus_uses, ai_subscription_status")
    .eq("id", profile.id)
    .single();
  const usage = usageFromRow(usageRow, isAdminEmail(user.email));
  return { usesLeft: usage.usesLeft, freeLimit: FREE_USE_LIMIT, effectiveLimit: usage.effectiveLimit, unlimited: usage.unlimited };
}

// Tries Gemini first (see lib/ai-providers.ts) if GOOGLE_AI_API_KEY is set -- it's vision-capable
// with its own 1,500/day free quota, independent of OpenRouter's. Groq is excluded here (text-only
// free tier, no image input); it's still used for the text-only features in lib/ai-text.ts.
//
// Falls through to OpenRouter (an OpenAI-compatible gateway that proxies to many providers,
// including Claude) after that. Free vision-capable OpenRouter models first, paid Claude only as a
// last resort — the OpenRouter account backing this ran out of credits (confirmed via
// /api/v1/credits: 0 remaining), so a paid-only call fails every time with 402. Free OpenRouter
// models share a rate-limited pool across all their users, so a single free model can occasionally
// 429 — trying a couple of alternates before falling back to paid is worth the extra request.
//
// "openrouter/free" leads the OpenRouter portion of the list rather than a specific named free
// model -- confirmed live that a hardcoded free model slug (minimax/minimax-m3:free, formerly
// first here, and formerly verified to do vision correctly) can be deprecated by OpenRouter without
// notice: it started returning 404 "unavailable for free", which broke this entire feature because
// the retry loop below didn't treat 404 as retryable and never reached the paid fallback.
// openrouter/free is OpenRouter's own router to whatever free model is actually up right now
// (confirmed working for vision input, real test, $0 cost), so it self-maintains against exactly
// that failure mode. The named models after it widen the pool further -- each confirmed
// vision-capable, content-first, and token-efficient with reasoning:{exclude:true} below
// (nvidia/nemotron-3-nano-omni's "-reasoning" variant was tested and dropped: it burned ~970 of a
// 1100 max_tokens budget on internal thinking alone for a trivial 2-field JSON ask, real risk of
// truncating this feature's actual, longer title+description+category output before it ever gets
// written). OpenRouter's free daily-request quota (50/day on this account until it's ever purchased
// $10+ in credits, then 1000/day permanently) counts every attempt, success or not, so this list is
// deliberately not unlimited.
// OPENROUTER_MODEL overrides the OpenRouter portion with one forced model, e.g. for testing.
const OPENROUTER_FALLBACK_MODELS = [
  "openrouter/free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nex-agi/nex-n2.5-pro:free",
  "anthropic/claude-sonnet-4.5",
];

// Grounds the model to categories that actually exist and can be posted to (getCategoriesAndAttributes
// already filters to is_active + allows_listings leaf categories) — it picks a label verbatim from
// this real list rather than free-generating a category name, so there's no risk of it inventing a
// category that doesn't exist in the taxonomy.
export async function analyzeListingPhoto(imageBase64: string, mediaType: string): Promise<AnalyzePhotoResult> {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return { data: null, error: "Sign in to use this.", usesLeft: 0, freeLimit: FREE_USE_LIMIT, unlimited: false };

  const supabase = await createClient();
  const { data: usageRow } = await supabase
    .from("profiles")
    .select("ai_photo_analysis_uses, ai_bonus_uses, ai_subscription_status")
    .eq("id", profile.id)
    .single();
  const isAdmin = isAdminEmail(user.email);
  const { unlimited, usesSoFar, effectiveLimit, usesLeft: usesLeftBefore } = usageFromRow(usageRow, isAdmin);
  if (!unlimited && usesSoFar >= effectiveLimit) {
    return {
      data: null,
      error: `You've used all ${effectiveLimit} AI analyses on your account. See /my-account/ai-features for what's next.`,
      usesLeft: 0,
      freeLimit: FREE_USE_LIMIT,
      unlimited: false,
    };
  }

  const openRouterModels = process.env.OPENROUTER_MODEL ? [process.env.OPENROUTER_MODEL] : OPENROUTER_FALLBACK_MODELS;
  const attempts = buildProviderAttempts(openRouterModels, true);
  if (attempts.length === 0)
    return { data: null, error: "Photo analysis isn't set up on this server yet.", usesLeft: usesLeftBefore, freeLimit: FREE_USE_LIMIT, unlimited };

  const { categoryOptions } = await getCategoriesAndAttributes();
  // ~210 leaf categories at "- Parent → Leaf" each (repeating the parent name on every single line)
  // was the dominant cost in this prompt — enough on its own to tip a request over OpenRouter's
  // free-tier per-request token cap regardless of image size (agents.md §12). Grouping under one
  // parent header instead cuts that repetition out; the model still gets every real category name
  // to ground against, just not the parent prefix duplicated ~210 times.
  const byParent = new Map<string, string[]>();
  for (const c of categoryOptions) {
    const arrowIdx = c.label.indexOf(" → ");
    const parent = arrowIdx === -1 ? "Other" : c.label.slice(0, arrowIdx);
    const leaf = arrowIdx === -1 ? c.label : c.label.slice(arrowIdx + 3);
    (byParent.get(parent) ?? byParent.set(parent, []).get(parent)!).push(leaf);
  }
  const categoryListText = [...byParent.entries()].map(([parent, leaves]) => `${parent}: ${leaves.join(", ")}`).join("\n");

  const prompt = `You are helping a seller on AfroDeals, a classifieds marketplace, list an item from a photo.
Respond with ONLY a JSON object (no markdown fences, no commentary) with exactly these keys:
{"title": "short listing title, max 80 characters, no marketing fluff", "description": "a rich, structured draft description in simple markdown -- see format below", "category": "the single best-matching category, formatted EXACTLY as \\"Parent → Leaf\\" using names copied verbatim from the list below"}

Description format (this is a draft the seller reviews and edits before anything publishes, so favor real, visible detail over filler):
- 2-3 short sections, each starting with its own "## " header naming one real, visible aspect of the item (what it's for, a standout feature, its finish/style, etc.) -- write real headers specific to this item, not generic labels like "Overview". A couple of engaging, honest sentences under each.
- Then a "## Highlights" section with 4-6 short "- " bullet points of real, visible selling points.
- Mention visible condition or wear honestly if there is any.
- Never invent measurements, technical specs, power ratings, model numbers, or box contents you can't actually see in the photo -- a specific number that isn't genuinely visible (on a label, tag, or the item itself) does not belong in the description at all. It's fine, and expected, to leave precise specs for the seller to add themselves.

Valid categories, grouped as "Parent: leaf, leaf, ..." (pick exactly one leaf, do not invent one):
${categoryListText}

If the photo doesn't clearly show a sellable item, respond with {"title": "", "description": "", "category": ""} instead.`;

  // Try each model in order, moving on to the next on ANY failure (rate limit, no credit, model
  // deprecated/unavailable, anything) -- see the fallback list's own comment above for why this
  // isn't narrowed to specific "retryable" statuses.
  let res: Response | null = null;
  let lastStatus = 0;
  let networkError = false;
  for (const attempt of attempts) {
    // reasoning:{exclude:true} is an OpenRouter-specific extension -- Gemini's OpenAI-compatible
    // endpoint doesn't recognize it, so only send it to OpenRouter.
    const body: Record<string, unknown> = {
      model: attempt.model,
      // Was 500 -- too tight for the richer, multi-section description format below; the
      // model was visibly truncating mid-sentence on longer items before this bump.
      max_tokens: 1100,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
          ],
        },
      ],
    };
    // Confirmed live that several current free OpenRouter models default to an internal "thinking"
    // pass that can consume most or all of max_tokens before ever emitting the real answer
    // (message.content stays null, message.reasoning holds the scratch-work instead). This still
    // lets the model think, it just omits that text from the response and reliably leaves more of
    // the budget for the actual title/description/category JSON.
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
    if (!res && networkError) {
      return { data: null, error: "Couldn't reach the photo analysis service. Check your connection and try again.", usesLeft: usesLeftBefore, freeLimit: FREE_USE_LIMIT, unlimited };
    }
    if (lastStatus === 429) return { data: null, error: "Photo analysis is busy right now — try again in a moment.", usesLeft: usesLeftBefore, freeLimit: FREE_USE_LIMIT, unlimited };
    if (lastStatus === 402) return { data: null, error: "Photo analysis is temporarily unavailable — the account behind it needs more credits.", usesLeft: usesLeftBefore, freeLimit: FREE_USE_LIMIT, unlimited };
    return { data: null, error: `Photo analysis failed (${lastStatus}). Try again in a moment.`, usesLeft: usesLeftBefore, freeLimit: FREE_USE_LIMIT, unlimited };
  }

  // Counts against the free-use limit here, not earlier — a service failure (rate limit, no
  // credit, network error) above never reaches this line, so it doesn't cost the user one of
  // their free tries. A real completed API call did happen at this point, win or lose below.
  // Still incremented for unlimited (subscribed/admin) accounts too -- keeps ai_photo_analysis_uses
  // an honest lifetime-usage count even though it no longer gates access for them.
  // Atomic DB-side increment (see supabase/migrations/20260101005300_atomic_ai_usage_increment.sql)
  // rather than writing back usesSoFar + 1 -- two concurrent calls for the same profile (a
  // double-fired click, a retried request) would otherwise both read the same starting count and
  // each write count + 1, charging one real fill twice while the stored count only moved by one.
  const { data: newCount, error: incrementError } = await supabase.rpc("increment_ai_photo_analysis_uses", { p_profile_id: profile.id });
  if (incrementError) console.error(`Failed to increment ai_photo_analysis_uses for profile ${profile.id}:`, incrementError);
  const usesAfter = newCount ?? usesSoFar + 1;
  const usesLeftAfter = unlimited ? effectiveLimit : Math.max(0, effectiveLimit - usesAfter);

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  const text: string =
    typeof content === "string" ? content : Array.isArray(content) ? content.map((p: { text?: string }) => p?.text ?? "").join("") : "";

  const parsed = parseJsonResponse<{ title?: string; description?: string; category?: string }>(text);
  if (!parsed) {
    return { data: null, error: "Couldn't make sense of that photo — try a clearer, closer shot of the item.", usesLeft: usesLeftAfter, freeLimit: FREE_USE_LIMIT, unlimited };
  }

  if (!parsed.title || !parsed.category) {
    return { data: null, error: "Couldn't identify a sellable item in that photo — try a different photo.", usesLeft: usesLeftAfter, freeLimit: FREE_USE_LIMIT, unlimited };
  }

  // Tolerates the model swapping the "→" for a plain "-"/"->" or trimming spaces around it --
  // free fallback models don't always reproduce the exact unicode arrow despite the prompt
  // spelling it out, and a false "couldn't match category" after a use has already been charged
  // is a bad experience for something purely cosmetic in the model's answer.
  const normalizeCategoryLabel = (s: string) => s.trim().toLowerCase().replace(/\s*(?:->|-{1,2}>|→)\s*/g, " → ");
  const wantedCategory = normalizeCategoryLabel(parsed.category);
  const matched = categoryOptions.find((c) => normalizeCategoryLabel(c.label) === wantedCategory);
  if (!matched) {
    return { data: null, error: "Identified the item but couldn't match it to a category — please pick one manually below.", usesLeft: usesLeftAfter, freeLimit: FREE_USE_LIMIT, unlimited };
  }

  return {
    data: { title: parsed.title.slice(0, 80), description: parsed.description ?? "", categoryId: matched.id, categoryLabel: matched.label },
    error: null,
    usesLeft: usesLeftAfter,
    freeLimit: FREE_USE_LIMIT,
    unlimited,
  };
}
