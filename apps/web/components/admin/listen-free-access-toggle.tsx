"use client";

import { useState, useTransition } from "react";
import { updateListenFreeAccessSetting } from "@/app/admin/settings-actions";
import { cn } from "@/lib/utils";

// Same instant-save toggle pattern as RequireLoginToggle -- a boolean flip, not a text field, so
// there's no invalid in-progress value to guard against with an explicit Save.
export function ListenFreeAccessToggle({ initial }: { initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !checked;
    setChecked(next);
    startTransition(async () => {
      try {
        await updateListenFreeAccessSetting(next);
      } catch {
        setChecked(!next);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-[#082040]">Listen free for everyone</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          {checked
            ? "On — every signed-in visitor gets Listen (read-aloud), no Seller Pro subscription needed. Turn off when the promotional period ends."
            : "Off — Listen is limited to Seller Pro subscribers and admins."}
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
