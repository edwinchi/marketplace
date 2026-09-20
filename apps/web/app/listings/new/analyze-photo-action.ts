"use server";

import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { getCategoriesAndAttributes } from "@/lib/categories";
import { isAdminEmail } from "@/lib/admin";
import { parseJsonResponse } from "@/lib/ai-text";
import { buildProviderAttempts, type ProviderAttempt } from "@/lib/ai-providers";
import { getTextEmbedding } from "@/lib/embeddings";
import { buildAttributeGuessPrompt, resolveAttributeGuesses } from "@/lib/ai-attribute-guess";
import { MAX_ANALYSIS_PHOTOS } from "@/lib/ai-photo-analysis";

// Free tier: 5 uses per registered account, then an honest "upgrade" prompt — there's no payment
// processor wired up yet to actually charge for more (see /my-account/ai-features), so this just
// stops rather than faking a paywall bypass.
const FREE_USE_LIMIT = 5;

export type PhotoAnalysis = {
  title: string;
  description: string;
  categoryId: string;
  categoryLabel: string;
  // Only present when the matched category has attributes a photo could plausibly inform, and the
  // model was confident enough about at least one of them -- see lib/ai-attribute-guess.ts.
  attributes?: Record<string, string | string[]>;
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

// Tries Gemini, then GitHub Models (see lib/ai-providers.ts) if their env vars are set -- both are
// vision-capable with their own free daily quotas, independent of OpenRouter's. Groq is excluded
// here (text-only free tier, no image input); it's still used for the text-only features in
// lib/ai-text.ts.
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
//
// OPENAI_API_KEY (direct api.openai.com, paid, no free tier at all) is tried after every free
// option including these OpenRouter free models, but before OpenRouter's own paid
// anthropic/claude-sonnet-4.5 fallback -- gpt-4o-mini is vision-capable and far cheaper per call.
//
// OPENROUTER_MODEL overrides the OpenRouter free-model portion with one forced model, e.g. for testing.
const OPENROUTER_FREE_MODELS = ["openrouter/free", "google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "nex-agi/nex-n2.5-pro:free"];
const OPENROUTER_PAID_MODEL = "anthropic/claude-sonnet-4.5";

// Shared retry loop, used for both the title/description call and the (optional) follow-up
// attributes call below -- same provider fallback chain either way, just a different prompt/
// max_tokens per call. Returns the raw response text on success, or null with the failure reason
// a caller can turn into a user-facing message.
async function callVisionModel(
  attempts: ProviderAttempt[],
  promptText: string,
  images: { base64: string; mediaType: string }[],
  maxTokens: number,
): Promise<{ text: string } | { text: null; lastStatus: number; networkError: boolean }> {
  let res: Response | null = null;
  let lastStatus = 0;
  let networkError = false;
  for (const attempt of attempts) {
    const body: Record<string, unknown> = {
      model: attempt.model,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            ...images.map((img) => ({ type: "image_url", image_url: { url: `data:${img.mediaType};base64,${img.base64}` } })),
          ],
        },
      ],
    };
    if (attempt.baseUrl.includes("openrouter.ai")) body.reasoning = { exclude: true };
    try {
      res = await fetch(attempt.baseUrl, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${attempt.apiKey}`, ...attempt.extraHeaders },
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

  if (!res || !res.ok) return { text: null, lastStatus, networkError: !res && networkError };

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  const text: string =
    typeof content === "string" ? content : Array.isArray(content) ? content.map((p: { text?: string }) => p?.text ?? "").join("") : "";
  return { text };
}

// Grounds the model to categories that actually exist and can be posted to (getCategoriesAndAttributes
// already filters to is_active + allows_listings leaf categories) — it picks a label verbatim from
// this real list rather than free-generating a category name, so there's no risk of it inventing a
// category that doesn't exist in the taxonomy.
export async function analyzeListingPhoto(images: { base64: string; mediaType: string }[], extraText?: string): Promise<AnalyzePhotoResult> {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return { data: null, error: "Sign in to use this.", usesLeft: 0, freeLimit: FREE_USE_LIMIT, unlimited: false };

  const supabase = await createClient();
  const { data: usageRow } = await supabase
    .from("profiles")
    .select("ai_photo_analysis_uses, ai_bonus_uses, ai_subscription_status")
    .eq("id", profile.id)
    .single();
  const isAdmin = isAdminEmail(user.email);
  const { unlimited, effectiveLimit, usesLeft: usesLeftBefore } = usageFromRow(usageRow, isAdmin);

  const openRouterModels = process.env.OPENROUTER_MODEL ? [process.env.OPENROUTER_MODEL] : OPENROUTER_FREE_MODELS;
  const openRouterPaidModel = process.env.OPENROUTER_MODEL ? null : OPENROUTER_PAID_MODEL;
  const attempts = buildProviderAttempts(openRouterModels, openRouterPaidModel, true);
  if (attempts.length === 0)
    return { data: null, error: "Photo analysis isn't set up on this server yet.", usesLeft: usesLeftBefore, freeLimit: FREE_USE_LIMIT, unlimited };

  // Reserved BEFORE any provider call, not after -- an atomic check-and-increment (the limit
  // check and the increment happen in one database statement) closes a race where concurrent
  // requests could each read the same pre-call count, each pass the limit check, and each trigger
  // a real (potentially paid) provider call before any of them had actually advanced the stored
  // count. See supabase/migrations/20260101006700_atomic_ai_use_reservation.sql.
  const { data: reservedCount, error: reserveError } = await supabase.rpc("reserve_ai_photo_analysis_use", {
    p_profile_id: profile.id,
    p_effective_limit: effectiveLimit,
    p_unlimited: unlimited,
  });
  if (reserveError) {
    console.error(`Failed to reserve an AI photo-analysis use for profile ${profile.id}:`, reserveError);
    return { data: null, error: "Couldn't check your AI usage — try again in a moment.", usesLeft: usesLeftBefore, freeLimit: FREE_USE_LIMIT, unlimited };
  }
  if (reservedCount == null) {
    return {
      data: null,
      error: `You've used all ${effectiveLimit} AI analyses on your account. See /my-account/ai-features for what's next.`,
      usesLeft: 0,
      freeLimit: FREE_USE_LIMIT,
      unlimited: false,
    };
  }
  const usesLeftAfter = unlimited ? effectiveLimit : Math.max(0, effectiveLimit - reservedCount);

  const { categoryOptions, attributesByCategory } = await getCategoriesAndAttributes();
  const photos = images.slice(0, MAX_ANALYSIS_PHOTOS);

  // Category is deliberately NOT asked for here anymore -- it used to be a third field the model
  // picked verbatim out of a ~210-item list, and a free-tier fallback model occasionally
  // hallucinated a plausible-looking but wrong pick from a list that long even when the
  // title/description came out right (confirmed live: a photo of a backpack got filed under Cars
  // -> SUVs and crossovers). Below, the category is instead chosen deterministically by embedding
  // this response's own title+description and finding the nearest real category by cosine
  // similarity (match_category_by_embedding, supabase/migrations/20260101007000_category_embeddings.sql)
  // -- a lookup against real categories can't invent one that doesn't exist, unlike free-form
  // generation. This also shrinks the prompt considerably, which was itself a real cost (the
  // category list used to be the dominant token cost here, enough on its own to tip a request over
  // OpenRouter's free-tier per-request cap regardless of image size, agents.md §12).
  const prompt = `You are helping a seller on MarketitNow, a classifieds marketplace, list an item from ${photos.length > 1 ? "photos" : "a photo"}.
Respond with ONLY a JSON object (no markdown fences, no commentary) with exactly these keys:
{"title": "short listing title, max 80 characters, no marketing fluff", "description": "a rich, structured draft description in simple markdown -- see format below"}

Description format (this is a draft the seller reviews and edits before anything publishes, so favor real, visible detail over filler):
- 2-3 short sections, each starting with its own "## " header naming one real, visible aspect of the item (what it's for, a standout feature, its finish/style, etc.) -- write real headers specific to this item, not generic labels like "Overview". A couple of engaging, honest sentences under each.
- Then a "## Highlights" section with 4-6 short "- " bullet points of real, visible selling points.
- Mention visible condition or wear honestly if there is any.
- Never invent measurements, technical specs, power ratings, model numbers, or box contents you can't actually see in the photo${photos.length > 1 ? "s" : ""} -- a specific number that isn't genuinely visible (on a label, tag, or the item itself) does not belong in the description at all. It's fine, and expected, to leave precise specs for the seller to add themselves.
${extraText?.trim() ? `\nThe seller also typed these extra details (use them, but the photo${photos.length > 1 ? "s" : ""} still take priority for anything visible): ${extraText.trim().slice(0, 500)}\n` : ""}
If the photo${photos.length > 1 ? "s don't" : " doesn't"} clearly show a sellable item, respond with {"title": "", "description": ""} instead.`;

  // Try each model in order, moving on to the next on ANY failure (rate limit, no credit, model
  // deprecated/unavailable, anything) -- see the fallback list's own comment above for why this
  // isn't narrowed to specific "retryable" statuses. Confirmed live that OpenRouter can deprecate a
  // free model out from under this list entirely (a 404, not a retryable-looking status), so this
  // tries every model regardless of why the previous one failed rather than stopping at the first
  // failure -- the only real cost of trying one more model is a small added latency.
  //
  // Was 500 -- too tight for the richer, multi-section description format below; the model was
  // visibly truncating mid-sentence on longer items before this bump.
  const result = await callVisionModel(attempts, prompt, photos, 1100);

  if (result.text == null) {
    // The reservation above already spent a use before this call was even made -- a service
    // failure (rate limit, no credit, network error, every provider down) isn't the user's fault,
    // so it's refunded here rather than left charged against their count. usesLeftBefore (computed
    // before the reservation) is what the response reports, matching what actually happened from
    // the user's point of view: nothing was spent.
    const { error: releaseError } = await supabase.rpc("release_ai_photo_analysis_use", { p_profile_id: profile.id });
    if (releaseError) console.error(`Failed to release a reserved AI photo-analysis use for profile ${profile.id}:`, releaseError);

    if (result.networkError) {
      return { data: null, error: "Couldn't reach the photo analysis service. Check your connection and try again.", usesLeft: usesLeftBefore, freeLimit: FREE_USE_LIMIT, unlimited };
    }
    if (result.lastStatus === 429) return { data: null, error: "Photo analysis is busy right now — try again in a moment.", usesLeft: usesLeftBefore, freeLimit: FREE_USE_LIMIT, unlimited };
    if (result.lastStatus === 402) return { data: null, error: "Photo analysis is temporarily unavailable — the account behind it needs more credits.", usesLeft: usesLeftBefore, freeLimit: FREE_USE_LIMIT, unlimited };
    return { data: null, error: `Photo analysis failed (${result.lastStatus}). Try again in a moment.`, usesLeft: usesLeftBefore, freeLimit: FREE_USE_LIMIT, unlimited };
  }

  const parsed = parseJsonResponse<{ title?: string; description?: string }>(result.text);
  if (!parsed) {
    return { data: null, error: "Couldn't make sense of that photo — try a clearer, closer shot of the item.", usesLeft: usesLeftAfter, freeLimit: FREE_USE_LIMIT, unlimited };
  }

  if (!parsed.title) {
    return { data: null, error: "Couldn't identify a sellable item in that photo — try a different photo.", usesLeft: usesLeftAfter, freeLimit: FREE_USE_LIMIT, unlimited };
  }

  // Category comes from a nearest-neighbor lookup against real categories' own precomputed
  // embeddings (scripts/backfill-category-embeddings.mjs), not from the model naming one -- see
  // the prompt comment above for why. Embedding this response's own title+description keeps it
  // grounded in what the model actually saw in the photo.
  const queryEmbedding = await getTextEmbedding(`${parsed.title}\n${parsed.description ?? ""}`);
  const { data: categoryMatches } = queryEmbedding
    ? await supabase.rpc("match_category_by_embedding", { query_embedding: queryEmbedding as unknown as string, match_count: 1 })
    : { data: null };
  const matched = categoryMatches?.[0] ? categoryOptions.find((c) => c.id === categoryMatches[0].id) : undefined;
  if (!matched) {
    return { data: null, error: "Identified the item but couldn't match it to a category — please pick one manually below.", usesLeft: usesLeftAfter, freeLimit: FREE_USE_LIMIT, unlimited };
  }

  // Second pass, same photos: the category (and so its attribute list) is only known now, so this
  // can't be folded into the first call above. Best-effort only -- an already-reserved use isn't
  // refunded for a failure here, since the seller still got a usable title/description/category out
  // of it either way; the attribute guesses are a bonus on top, not the thing being paid for.
  let attributes: Record<string, string | string[]> | undefined;
  const categoryAttributes = attributesByCategory[matched.id] ?? [];
  const attributePrompt = buildAttributeGuessPrompt(categoryAttributes);
  if (attributePrompt) {
    const fullAttributePrompt = extraText?.trim() ? `${attributePrompt}\n\nThe seller's own notes: ${extraText.trim().slice(0, 500)}` : attributePrompt;
    const attributeResult = await callVisionModel(attempts, fullAttributePrompt, photos, 500);
    if (attributeResult.text != null) {
      const parsedAttributes = parseJsonResponse<Record<string, unknown>>(attributeResult.text);
      if (parsedAttributes) {
        const resolved = resolveAttributeGuesses(parsedAttributes, categoryAttributes);
        if (Object.keys(resolved).length > 0) attributes = resolved;
      }
    }
  }

  return {
    data: { title: parsed.title.slice(0, 80), description: parsed.description ?? "", categoryId: matched.id, categoryLabel: matched.label, attributes },
    error: null,
    usesLeft: usesLeftAfter,
    freeLimit: FREE_USE_LIMIT,
    unlimited,
  };
}
