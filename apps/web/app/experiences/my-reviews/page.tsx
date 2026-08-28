import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { ReviewsDisplay } from "@/components/reviews-display";

export default async function MyReviewsPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <ReviewsDisplay profileId={profile.id} viewerProfileId={profile.id} />
    </div>
  );
}
