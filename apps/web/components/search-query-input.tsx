"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

// The homepage's search form previously had no way to clear the typed query except deleting it
// character by character (or the "Clear filter" link further down the page, which resets an
// already-submitted filter, not the in-progress text in this field). Controlled here (not
// uncontrolled with defaultValue like every other field in this form) specifically so an × button
// can actually clear it -- [&::-webkit-search-cancel-button]:appearance-none turns off the
// browser's own native clear icon for type="search" so this one doesn't double up with it.
export function SearchQueryInput({ name, placeholder, defaultValue }: { name: string; placeholder: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div className="relative flex-1">
      <Input
        type="search"
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="border-0 pr-8 shadow-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
