import Link from "next/link";
import { CategoryIcon } from "@/lib/category-icons";
import { slugPath } from "@/lib/slug";
import { cn } from "@/lib/utils";

type QuickNavCategory = { id: string; label: string; stableKey: string };

// Shared sibling-category shortcut row -- was inline on the homepage only; now also used at the
// top of every category page so switching between top-level categories doesn't require going back
// to the homepage first. `activeId` highlights the current category (light-green "you are here"
// treatment, same convention as /welcome's sticky section nav and the header's Messages/
// Notifications active state) when this row is shown on that category's own page.
// In the page flow, not sticky (owner, 2026-11-07): the row sits on the hero photo and stays put
// when the page scrolls, the same on the homepage and every category page. It used to be sticky on
// category pages, so the three-row grid slid down over the listings as you scrolled. The 75%
// background plus blur lets the photo show through softly behind it.
export function CategoryQuickNav({ categories, activeId, className }: { categories: QuickNavCategory[]; activeId?: string; className?: string }) {
  return (
    <div
      className={cn(
        "relative -mx-4 flex gap-5 overflow-x-auto bg-background/75 backdrop-blur-md px-4 py-3 shadow-[0_6px_16px_-8px_rgba(0,0,0,0.18)] sm:mx-0 sm:flex-wrap sm:rounded-xl sm:border sm:px-5 sm:py-4 sm:shadow-sm",
        className,
      )}
    >
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
