"use client";

import { useTransition } from "react";
import { markListingSold, relistListing } from "@/app/listings/actions";
import { Button } from "@/components/ui/button";

export function MarkSoldButton({ listingId, status }: { listingId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const isSold = status === "sold";
  const isExpired = status === "expired";

  if (isSold || isExpired) {
    return (
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(() => relistListing(listingId))}
      >
        {pending ? "Relisting…" : isSold ? "Relist" : "Relist (renews for 60 days)"}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!confirm("Mark this listing as sold? It will be hidden from buyers but stay on your profile as a completed sale.")) return;
        startTransition(() => markListingSold(listingId));
      }}
    >
      {pending ? "Marking…" : "Mark as sold"}
    </Button>
  );
}
