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
// Sticky (not just part of the page flow) so it stays visible once a category is selected and the
// page is scrolled -- the same below-header offset /welcome's own sticky nav uses (top-20 mobile,
// where the header is `fixed` with an h-20 spacer; sm:top-[89px] desktop, matching the header's
// real height there), so it tucks in flush under the header instead of colliding with it. A solid
// background is required, not optional, once something is sticky -- otherwise scrolled page
// content shows through it, the same bug class the mobile nav bars hit earlier.
//
// Callers pass spacing via `className` directly on this root element (rather than wrapping it in
// their own `<div className="mt-4">`) for a real reason, not just tidiness: a sticky element can
// only actually remain stuck while scrolling within the height its own immediate parent provides
// (confirmed live -- it computed position:sticky correctly but never visually stuck, because a
// wrapper div containing nothing but this component is exactly as tall as the component itself,
// leaving zero room). Rendering this as a direct child of each page's tall outer container instead
// gives it the whole page's height to stay stuck within.
export function CategoryQuickNav({ categories, activeId, className }: { categories: QuickNavCategory[]; activeId?: string; className?: string }) {
  return (
    <div className={cn("sticky top-20 z-20 -mx-4 flex gap-5 overflow-x-auto border-b bg-background px-4 py-3 sm:top-[89px] sm:mx-0 sm:flex-wrap sm:border-b-0 sm:px-0 sm:py-0", className)}>
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
