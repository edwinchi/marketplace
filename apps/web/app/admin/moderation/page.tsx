import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Check, Trash2 } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { isAdminEmail } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { formatPrice } from "@/lib/money";
import { slugPath } from "@/lib/slug";
import { buttonVariants, Button } from "@/components/ui/button";
import { clearModerationFlag, removeFlaggedListing } from "@/app/admin/moderation-actions";

// Content-policy pre-screen results (lib/content-moderation.ts, run on every listing create/edit)
// land here, not in an auto-reject queue -- a general text model flagging a listing is a signal
// for a human to look at, not a verdict. Service-role client: an admin reviewing someone else's
// listing isn't its seller, so the normal listing_write RLS policy wouldn't return these rows.
export default async function ModerationQueuePage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) redirect("/admin");

  const supabase = createServiceClient();
  const { data: flagged } = await supabase
    .from("listings")
    .select("id, title, price_minor, currency_code, metadata, created_at")
    .eq("moderation_status", "flagged")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ShieldAlert className="size-6 text-destructive" /> Moderation queue
        </h1>
        <Link href="/admin" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Back to dashboard
        </Link>
      </div>

      {flagged?.length ? (
        <ul className="flex flex-col divide-y">
          {flagged.map((l) => {
            const reason = (l.metadata as { moderation_reason?: string } | null)?.moderation_reason;
            return (
              <li key={l.id} className="flex flex-col gap-2 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/listings/${slugPath(l.title, l.id)}`} target="_blank" className="font-medium hover:underline">
                      {l.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(l.price_minor ?? 0, l.currency_code)} · {new Date(l.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={clearModerationFlag.bind(null, l.id)}>
                      <Button type="submit" variant="outline" size="sm" className="gap-1.5">
                        <Check className="size-3.5" /> Clear
                      </Button>
                    </form>
                    <form action={removeFlaggedListing.bind(null, l.id)}>
                      <Button type="submit" variant="destructive" size="sm" className="gap-1.5">
                        <Trash2 className="size-3.5" /> Remove
                      </Button>
                    </form>
                  </div>
                </div>
                {reason && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{reason}</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <ShieldAlert className="size-10 text-muted-foreground" />
          <p className="font-medium">Nothing flagged right now.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Every new or edited listing is pre-screened automatically — anything flagged shows up here.
          </p>
        </div>
      )}
    </div>
  );
}
