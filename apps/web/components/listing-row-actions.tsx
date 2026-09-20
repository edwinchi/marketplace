"use client";

import { useState, useTransition } from "react";
import { Trash2, ArrowUpCircle, Home } from "lucide-react";
import { deleteListing, deleteListingPermanently, markListingSold, relistListing } from "@/app/listings/actions";
import { bumpListingCheckout } from "@/app/listings/bump-actions";
import { homepagePlacementCheckout } from "@/app/listings/homepage-placement-actions";
import { BUMP_COOLDOWN_MS } from "@/lib/listing-bump";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import Link from "next/link";

export function ListingRowActions({
  listingId,
  status,
  publishedAt,
  homepageFeaturedUntil,
}: {
  listingId: string;
  status: string;
  publishedAt: string | null;
  homepageFeaturedUntil?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Lazy initializer runs once at mount, not on every render -- reading Date.now() directly in the
  // component body would violate React's render-purity rule (a static "Xh left" label is fine here,
  // doesn't need to live-tick every second).
  const [now] = useState(() => Date.now());

  const cooldownRemainingMs = publishedAt ? BUMP_COOLDOWN_MS - (now - new Date(publishedAt).getTime()) : 0;
  const canBump = status === "active" && cooldownRemainingMs <= 0;
  const isFeatured = !!homepageFeaturedUntil && new Date(homepageFeaturedUntil).getTime() > now;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/listings/edit/${listingId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
        Edit
      </Link>

      {status === "active" && (
        canBump ? (
          <form action={bumpListingCheckout.bind(null, listingId)}>
            <Button type="submit" variant="outline" size="sm" className="gap-1.5">
              <ArrowUpCircle className="size-3.5" />
              Bump to top
            </Button>
          </form>
        ) : (
          <Button variant="outline" size="sm" disabled className="gap-1.5" title="A listing can only be bumped once every 24 hours">
            <ArrowUpCircle className="size-3.5" />
            Bumped — {Math.ceil(cooldownRemainingMs / (60 * 60 * 1000))}h left
          </Button>
        )
      )}

      {status === "active" && (
        isFeatured ? (
          <Button variant="outline" size="sm" disabled className="gap-1.5" title="Already featured on the homepage">
            <Home className="size-3.5" />
            Featured — {Math.max(1, Math.ceil((new Date(homepageFeaturedUntil!).getTime() - now) / (24 * 60 * 60 * 1000)))}d left
          </Button>
        ) : (
          <form action={homepagePlacementCheckout.bind(null, listingId)}>
            <Button type="submit" variant="outline" size="sm" className="gap-1.5">
              <Home className="size-3.5" />
              Feature on homepage
            </Button>
          </form>
        )
      )}

      {(status === "sold" || status === "expired") ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => relistListing(listingId))}
        >
          Relist
        </Button>
      ) : status !== "deleted" && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (!confirm("Mark this listing as sold? It will be hidden from buyers but stay here as a completed sale.")) return;
            startTransition(() => markListingSold(listingId));
          }}
        >
          Mark sold
        </Button>
      )}

      {status !== "deleted" && status !== "sold" && status !== "expired" && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (!confirm("Remove this listing? It will no longer be visible to buyers, but stays recoverable.")) return;
            startTransition(() => deleteListing(listingId));
          }}
        >
          Remove
        </Button>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
        <DialogTrigger
          render={
            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="size-4" />
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this listing permanently?</DialogTitle>
            <DialogDescription>
              This can&apos;t be undone — the listing and its photos are gone for good. If it has
              offers or messages tied to it, this won&apos;t be possible; use Remove instead.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await deleteListingPermanently(listingId);
                  if (result.error) setError(result.error);
                  else setOpen(false);
                });
              }}
            >
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
