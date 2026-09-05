"use client";

import { Info, Check } from "lucide-react";
import { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// A plain-language "what am I actually getting" explainer for each real plan on
// /my-account/ai-features -- describes exactly what's built and live today, nothing from the
// planned/roadmap section, so it never promises more than the checkout button next to it delivers.
export function PlanInfoDialog({
  triggerLabel,
  title,
  price,
  tagline,
  features,
  note,
}: {
  triggerLabel: string;
  title: string;
  price?: string;
  tagline: string;
  features: string[];
  note?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={triggerLabel}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-current/70 transition-colors hover:bg-current/10 hover:text-current"
          >
            <Info className="size-4" />
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-2">
            {title}
            {price && <span className="text-sm font-normal text-muted-foreground">{price}</span>}
          </DialogTitle>
          <DialogDescription>{tagline}</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2.5 text-sm">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-[#008848]" />
              {f}
            </li>
          ))}
        </ul>
        {note && <p className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">{note}</p>}
        <DialogClose
          render={
            <Button type="button" variant="outline" size="sm" className="mt-5 w-fit self-end">
              Got it
            </Button>
          }
        />
      </DialogContent>
    </Dialog>
  );
}
