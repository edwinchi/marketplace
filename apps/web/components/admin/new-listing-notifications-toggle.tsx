"use client";

import { useState, useTransition } from "react";
import { updateNewListingNotificationsGlobalUnlockSetting } from "@/app/admin/settings-actions";
import { cn } from "@/lib/utils";

// Same instant-save toggle pattern as SellerProGlobalUnlockToggle -- a boolean flip, not a text field.
export function NewListingNotificationsToggle({ initial }: { initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !checked;
    setChecked(next);
    startTransition(async () => {
      try {
        await updateNewListingNotificationsGlobalUnlockSetting(next);
      } catch {
        setChecked(!next);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-[#082040]">New-listing notifications free for everyone</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          {checked
            ? "On — every registered user (who hasn't opted out) gets notified when anyone posts a new listing, no subscription needed. Turn off to go back to Seller Pro-only."
            : "Off — only Seller Pro subscribers and admins get notified of new listings."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={toggle}
        disabled={pending}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60",
          checked ? "bg-[#008200]" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
