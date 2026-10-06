"use client";

import { useState, useTransition } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createShippingLabel } from "@/app/my-account/transactions/shipping-label-actions";

// One click buys the PostNL label and marks the order shipped (createShippingLabel); the page then
// re-renders with a "Download label" button. Disabled while running so a double click can't race
// two label purchases (the action is idempotent too, but there's no reason to rely on that alone).
export function CreateLabelButton({ orderId }: { orderId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        className="gap-1.5"
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await createShippingLabel(orderId);
            if (result.error) setError(result.error);
          })
        }
      >
        <Printer className="size-3.5" />
        {pending ? "Creating label…" : "Create PostNL label"}
      </Button>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
