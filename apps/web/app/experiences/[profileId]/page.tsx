import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { ReviewsDisplay } from "@/components/reviews-display";

// The general "view this seller's reviews" page — reachable from a listing's seller card, or
// after leaving a review. /experiences/my-reviews (your own) is a thin convenience wrapper around
// the same component, not a separate implementation.
export default async function SellerReviewsPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const { profile } = await getCurrentUserAndProfile();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <ReviewsDisplay profileId={profileId} viewerProfileId={profile?.id ?? null} />
    </div>
  );
}
