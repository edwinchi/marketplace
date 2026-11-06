"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Value -> Common.* translation key. The values are what the URL's ?sort= carries.
const OPTIONS = { newest: "sortNewest", price_asc: "sortPriceAsc", price_desc: "sortPriceDesc" } as const;
type SortValue = keyof typeof OPTIONS;

// Standalone from the q/category/city search form above it -- this only ever needs to change one
// param (sort) while preserving whatever else is already in the URL, which a plain GET form
// submit would otherwise reset.
export function SortSelect({ sort }: { sort: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Common");
  const label = (value: string | null) => t(OPTIONS[(value ?? "newest") as SortValue] ?? "sortNewest");

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
      <SelectTrigger size="sm" aria-label={t("sortBy")} className="w-auto">
        <SelectValue>{label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(OPTIONS) as SortValue[]).map((value) => (
          <SelectItem key={value} value={value}>
            {label(value)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
