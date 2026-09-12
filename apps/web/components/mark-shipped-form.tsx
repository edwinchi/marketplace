"use client";

import { useActionState, useState } from "react";
import { Truck } from "lucide-react";
import { markOrderShipped, type MarkShippedFormState } from "@/app/my-account/transactions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MarkShippedForm({ orderId }: { orderId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, pending] = useActionState(markOrderShipped, { error: null } as MarkShippedFormState);

  if (state.success) {
    return <p className="text-sm text-muted-foreground">Marked as shipped.</p>;
  }

  if (!expanded) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setExpanded(true)}>
        <Truck className="size-3.5" /> Mark as shipped
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="order_id" value={orderId} />
      <div className="flex gap-2">
        <Input name="carrier" placeholder="Carrier (optional)" className="h-8 text-sm" />
        <Input name="tracking_number" placeholder="Tracking number (optional)" className="h-8 text-sm" />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Confirm shipped"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded(false)}>
          Cancel
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
