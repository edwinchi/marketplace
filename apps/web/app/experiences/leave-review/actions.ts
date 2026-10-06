"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

export type ReviewFormState = { error: string | null };

export async function submitReview(_prevState: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const revieweeId = String(formData.get("reviewee_id") || "");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") || "").trim();
  const tags = formData.getAll("tag").map(String);

  if (!revieweeId) return { error: "Missing reviewee." };
  if (revieweeId === profile.id) return { error: "You can't review yourself." };
  if (!rating || rating < 1 || rating > 5) return { error: "Choose a star rating." };

  const supabase = await createClient();
  const { error } = await supabase.from("reviews").insert({
    reviewee_profile_id: revieweeId,
    reviewer_profile_id: profile.id,
    rating,
    positive_tags: tags,
    comment: comment || null,
  });

  if (error) {
    // Postgres unique_violation — the reviews_reviewer_profile_id_reviewee_profile_id_key constraint.
    if (error.code === "23505") return { error: "You've already reviewed this user." };
    // insufficient_privilege -- the reviews_reviewer_insert policy only allows a review between two
    // people who've actually messaged or traded (supabase/migrations/20260101009000), so a
    // throwaway account can't leave drive-by ratings on a seller it never dealt with.
    if (error.code === "42501") return { error: "You can only review someone you've messaged or bought from." };
    return { error: error.message };
  }

  redirect(`/experiences/${revieweeId}`);
}
