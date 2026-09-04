import Link from "next/link";
import { CategoryIcon } from "@/lib/category-icons";
import { slugPath } from "@/lib/slug";

type QuickNavCategory = { id: string; label: string; stableKey: string };

// Shared sibling-category shortcut row -- was inline on the homepage only; now also used at the
// top of every category page so switching between top-level categories doesn't require going back
// to the homepage first. `activeId` highlights the current category (light-green "you are here"
// treatment, same convention as /welcome's sticky section nav and the header's Messages/
// Notifications active state) when this row is shown on that category's own page.
export function CategoryQuickNav({ categories, activeId }: { categories: QuickNavCategory[]; activeId?: string }) {
  return (
    <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {categories.map((c) => {
        const active = c.id === activeId;
        return (
          <Link
            key={c.id}
            href={`/categories/${slugPath(c.label, c.id)}`}
            className={`group flex shrink-0 flex-col items-center gap-1.5 text-xs transition-colors ${
              active ? "text-[#046637]" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className={`flex size-11 items-center justify-center rounded-full border shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md ${
                active
                  ? "border-[#008200]/40 bg-[#c8f0c8]"
                  : "bg-background group-hover:border-[#008200]/40 group-hover:bg-[#008200]/10"
              }`}
            >
              <CategoryIcon stableKey={c.stableKey} className={`size-5 transition-colors ${active ? "text-[#046637]" : "group-hover:text-[#008200]"}`} />
            </span>
            <span className="max-w-16 truncate font-medium">{c.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
