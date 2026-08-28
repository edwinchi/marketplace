import Link from "next/link";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";

// Shared by /experiences/my-reviews (your own) and /experiences/[profileId] (anyone else's) —
// same real query, same honest empty state either way.
export async function ReviewsDisplay({ profileId, viewerProfileId }: { profileId: string; viewerProfileId: string | null }) {
  const supabase = await createClient();
  const [{ data: reviewee }, { data: reviews }] = await Promise.all([
    supabase.from("profiles").select("display_name, username, created_at").eq("id", profileId).single(),
    supabase
      .from("reviews")
      .select(
        "id, rating, positive_tags, comment, created_at, reviewer_profile_id, profiles!reviews_reviewer_profile_id_fkey(display_name, username)",
      )
      .eq("reviewee_profile_id", profileId)
      .order("created_at", { ascending: false }),
  ]);

  const count = reviews?.length ?? 0;
  const average = count ? (reviews!.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1) : null;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews?.filter((r) => r.rating === star).length ?? 0,
  }));
  const tagCounts = new Map<string, number>();
  for (const r of reviews ?? []) {
    for (const tag of r.positive_tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  const canReview = !!viewerProfileId && viewerProfileId !== profileId;
  const alreadyReviewed = canReview && reviews?.some((r) => r.reviewer_profile_id === viewerProfileId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{reviewee?.display_name || reviewee?.username || "AfroDeals user"}</h1>
          {count > 0 ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="size-4 fill-primary text-primary" />
              {average} · {count} review{count === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No reviews yet.</p>
          )}
        </div>
        {canReview && !alreadyReviewed && (
          <Link href={`/experiences/leave-review/${profileId}`} className={buttonVariants({ size: "sm" })}>
            Leave a review
          </Link>
        )}
      </div>

      {count > 0 && (
        <>
          <div className="flex flex-col gap-1.5 border-t pt-4">
            {distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-sm">
                <span className="flex w-8 items-center gap-0.5 text-muted-foreground">
                  {d.star} <Star className="size-3 fill-primary text-primary" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${count ? (d.count / count) * 100 : 0}%` }} />
                </div>
                <span className="w-4 text-right text-xs text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </div>

          {tagCounts.size > 0 && (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              {[...tagCounts.entries()].map(([tag, n]) => (
                <span key={tag} className="rounded-full border px-2.5 py-1 text-xs">
                  {tag} <span className="ml-1 rounded-full bg-muted px-1.5">{n}</span>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-4 border-t pt-4">
            <h2 className="font-semibold">Reviews from others</h2>
            {reviews!.map((r) => {
              const reviewer = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
              return (
                <div key={r.id} className="flex flex-col gap-1 border-b pb-4 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{reviewer?.display_name || reviewer?.username || "AfroDeals user"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`size-3.5 ${i < r.rating ? "fill-primary text-primary" : "text-muted"}`} />
                    ))}
                  </div>
                  {r.positive_tags.length > 0 && (
                    <p className="text-xs text-muted-foreground">{r.positive_tags.join(" · ")}</p>
                  )}
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {count === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
          <Star className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {canReview ? "Be the first to leave a review." : "Reviews from other AfroDeals users will show up here."}
          </p>
        </div>
      )}
    </div>
  );
}
