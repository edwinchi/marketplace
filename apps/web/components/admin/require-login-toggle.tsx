"use client";

import { useState, useTransition } from "react";
import { updateRequireLoginSetting } from "@/app/admin/settings-actions";
import { cn } from "@/lib/utils";

export function RequireLoginToggle({ initial }: { initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !checked;
    setChecked(next);
    startTransition(async () => {
      try {
        await updateRequireLoginSetting(next);
      } catch {
        setChecked(!next);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-[#082040]">Require sign-in to browse</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          {checked
            ? "On — anonymous visitors are redirected to /login for every page except Help, Terms, Safety, and auth pages."
            : "Off — anyone can browse listings and categories without an account. Posting an ad, messaging, and other actions still require sign-in."}
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
          checked ? "bg-[#082040]" : "bg-muted",
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
