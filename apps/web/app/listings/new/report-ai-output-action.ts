"use server";

import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

// Insert-only from here -- see supabase/migrations/20260101008600_ai_output_reports.sql. A seller
// flags AI-generated text (from app/listings/new/analyze-photo-action.ts) as wrong, offensive, or
// off-topic; an admin reviews these at /admin/ai-reports via the service-role client.
export async function reportAiOutput(payload: {
  categoryId: string | null;
  title: string;
  description: string;
  extraText?: string;
  reason: string;
}): Promise<{ error: string | null }> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) return { error: "Sign in to report this." };
  if (!payload.reason.trim()) return { error: "Say what's wrong before submitting." };

  const supabase = await createClient();
  const { error } = await supabase.from("ai_output_reports").insert({
    reporter_id: profile.id,
    category_id: payload.categoryId,
    title: payload.title,
    description: payload.description,
    extra_text: payload.extraText?.trim() || null,
    reason: payload.reason.trim(),
  });
  if (error) return { error: error.message };
  return { error: null };
}
