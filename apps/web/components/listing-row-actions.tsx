"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteListing, deleteListingPermanently } from "@/app/listings/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import Link from "next/link";

export function ListingRowActions({ listingId, status }: { listingId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <Link href={`/listings/${listingId}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
        Edit
      </Link>

      {status !== "deleted" && (
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
          <div className="mt-3 flex justify-end gap-2">
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
