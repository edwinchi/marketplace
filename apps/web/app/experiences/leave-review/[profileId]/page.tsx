import { redirect, notFound } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "@/components/review-form";

export default async function LeaveReviewPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");
  if (profileId === profile.id) redirect(`/experiences/${profileId}`);

  const supabase = await createClient();
  const [{ data: reviewee }, { data: existing }] = await Promise.all([
    supabase.from("profiles").select("display_name, username").eq("id", profileId).single(),
    supabase.from("reviews").select("id").eq("reviewer_profile_id", profile.id).eq("reviewee_profile_id", profileId).maybeSingle(),
  ]);
  if (!reviewee) notFound();
  if (existing) redirect(`/experiences/${profileId}`);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold tracking-tight">
        Review {reviewee.display_name || reviewee.username}
      </h1>
      <ReviewForm revieweeId={profileId} />
    </div>
  );
}
