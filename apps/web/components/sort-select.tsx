"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LABELS: Record<string, string> = { newest: "Newest first", price_asc: "Price: low to high", price_desc: "Price: high to low" };

// Standalone from the q/category/city search form above it -- this only ever needs to change one
// param (sort) while preserving whatever else is already in the URL, which a plain GET form
// submit would otherwise reset.
export function SortSelect({ sort }: { sort: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string | null) {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") params.delete("sort");
    else params.set("sort", value);
    // A different sort re-orders the whole result set -- staying on "page 3" of that new order
    // would show different listings than page 3 meant a moment ago, not a continuation of it.
    params.delete("page");
    router.push(`/?${params.toString()}`);
  }

  return (
    <Select value={sort} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-auto">
        <SelectValue>{(value: string | null) => LABELS[value ?? "newest"]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
