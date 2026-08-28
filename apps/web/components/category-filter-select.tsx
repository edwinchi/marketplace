"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CategoryFilterSelect({
  categories,
  selected,
  basePath,
}: {
  categories: { id: string; name: string }[];
  selected: string;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <Select
      value={selected}
      onValueChange={(value) => {
        router.push(value === "all" ? basePath : `${basePath}?category=${value}`);
      }}
    >
      <SelectTrigger className="w-full sm:w-64">
        <SelectValue placeholder="All categories">
          {(value: string | null) => (value === "all" || !value ? "All categories" : categories.find((c) => c.id === value)?.name)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All categories</SelectItem>
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
