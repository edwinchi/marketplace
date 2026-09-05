"use server";

import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { isSellerProSubscriber } from "@/lib/seller-pro";
import { callFreeTextModel } from "@/lib/ai-text";

// Seller Pro exclusive, no free tier or per-use counting -- matches /my-account/ai-features' own
// copy ("every AI feature below" ships as a Seller Pro perk, not a metered trial). Unlike photo
// analysis, this can't observe new facts -- it only reorganizes what the seller already wrote, so
// the prompt explicitly forbids inventing specs, matching this project's real-data-only rule.
export async function polishDescription(title: string, description: string): Promise<{ description: string | null; error: string | null }> {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user || !profile) return { description: null, error: "Sign in to use this." };
  if (!(await isSellerProSubscriber())) {
    return { description: null, error: "Polish with AI is a Seller Pro feature — see /my-account/ai-features to subscribe." };
  }

  const trimmedDescription = description.trim();
  if (!trimmedDescription) return { description: null, error: "Write a draft description first, then polish it." };

  const prompt = `You are helping a seller on AfroDeals, a classifieds marketplace, improve their listing description.

Title: "${title.trim() || "(no title yet)"}"
Their current draft description:
"""
${trimmedDescription}
"""

Rewrite it into a clean, well-structured version:
- 2-3 short sections, each starting with its own "## " header naming one real aspect of the item that's already mentioned (what it's for, a standout feature, its condition, etc.) — write real headers specific to this item, not generic labels like "Overview".
- Then a "## Highlights" section with 3-6 short "- " bullet points restating real selling points already present in the seller's own text.
- Fix grammar, clarity, and flow, but do NOT invent facts, measurements, specs, brand details, or condition claims the seller didn't already write — if something is unclear or missing, leave it out rather than guessing. This is the seller's own information, just better organized.
- Keep it honest and in the seller's own voice.

Respond with ONLY the polished description in markdown — no JSON, no commentary, no repeating the title.`;

  const { text, error } = await callFreeTextModel(prompt, 700);
  if (error || !text) return { description: null, error: error ?? "Couldn't polish that description — try again." };
  return { description: text, error: null };
}
