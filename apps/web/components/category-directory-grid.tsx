"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { CategoryGroupCard } from "@/components/category-group-card";

type Group = { id: string; name: string; href: string; children: { id: string; name: string; href: string }[] };

const INITIAL_LIMIT = 24;

// Some top-level categories now have 90+ subcategory groups (the real Marktplaats taxonomy import
// went several levels deep) -- rendering all of them at once made a few category pages enormous.
// Same collapse pattern as CategoryGroupCard's own leaf-list "show more", one level up. Groups (and
// their leaves) carry pre-built hrefs from the server -- this is a Client Component, and functions
// can't cross that boundary as props, so hrefs get computed once up in the page instead.
export function CategoryDirectoryGrid({ groups }: { groups: Group[] }) {
  const t = useTranslations("Categories");
  const [expanded, setExpanded] = useState(false);
  const canCollapse = groups.length > INITIAL_LIMIT;
  const visible = expanded || !canCollapse ? groups : groups.slice(0, INITIAL_LIMIT);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((child) => (
          <CategoryGroupCard
            key={child.id}
            name={child.name}
            href={child.href}
            leaves={child.children.length > 0 ? child.children : [{ id: child.id, name: child.name, href: child.href }]}
          />
        ))}
      </div>
      {canCollapse && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium text-[#082040] shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-[#e89818]/50 hover:bg-[#e89818]/5"
          >
            {expanded ? (
              <>
                {t("showLess")} <ChevronUp className="size-4" />
              </>
            ) : (
              <>
                {t("showMore", { count: groups.length - INITIAL_LIMIT })} <ChevronDown className="size-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
