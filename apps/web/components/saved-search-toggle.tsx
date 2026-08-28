"use client";

import { useTransition } from "react";
import { toggleSavedSearchChannel } from "@/app/my-account/saved-searches/actions";

// No Switch primitive exists in components/ui yet — a checkbox styled as a pill rather than
// pulling in a new dependency for one small toggle. Track + thumb are both direct children of the
// label so peer-checked (thumb) and has-checked (track) both resolve correctly.
export function SavedSearchToggle({ id, channel, checked }: { id: string; channel: "push" | "email"; checked: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <label className="relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full bg-muted transition-colors has-checked:bg-primary has-disabled:opacity-50">
      <input
        type="checkbox"
        className="peer sr-only"
        defaultChecked={checked}
        disabled={isPending}
        onChange={(e) => {
          const formData = new FormData();
          formData.set("id", id);
          formData.set("channel", channel);
          formData.set("value", String(e.currentTarget.checked));
          startTransition(() => {
            toggleSavedSearchChannel(formData);
          });
        }}
      />
      <span className="pointer-events-none absolute left-0.5 size-4 rounded-full bg-background shadow transition-transform peer-checked:translate-x-4" />
    </label>
  );
}
