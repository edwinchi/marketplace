"use client";

import { useActionState } from "react";
import { createOffer, type OfferFormState } from "@/app/listings/offer-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OfferBox({
  listingId,
  currencyCode,
  signedIn,
}: {
  listingId: string;
  currencyCode: string;
  signedIn: boolean;
}) {
  const [state, formAction, pending] = useActionState(createOffer, { error: null } as OfferFormState);

  if (state.success) {
    return (
      <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
        Your offer has been sent to the seller.
      </p>
    );
  }

  if (!signedIn) {
    return (
      <a href="/login" className="text-sm text-primary underline">
        Sign in to make an offer
      </a>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="listing_id" value={listingId} />
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-1 rounded-md border pl-3">
          <span className="text-sm text-muted-foreground">{currencyCode}</span>
          <Input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="0"
            className="border-0 px-1 shadow-none focus-visible:ring-0"
          />
        </div>
        <Button type="submit" disabled={pending} variant="outline">
          {pending ? "Sending…" : "Make offer"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
