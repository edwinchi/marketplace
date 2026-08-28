"use client";

import { useTransition } from "react";
import { deleteListing } from "@/app/listings/actions";
import { Button } from "@/components/ui/button";

export function DeleteListingButton({ listingId }: { listingId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remove this listing? It will no longer be visible to buyers.")) return;
        startTransition(() => deleteListing(listingId));
      }}
    >
      {pending ? "Removing…" : "Delete"}
    </Button>
  );
}
