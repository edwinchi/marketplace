"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Make = { id: string; name: string; href: string; active: boolean };

const INITIAL_LIMIT = 21;

// vehicle_makes now lists all 90 real manufacturers -- rendering every tile at once made this
// section very long. Same collapse pattern as CategoryDirectoryGrid/CategoryGroupCard elsewhere.
// Takes pre-built hrefs (rather than a builder function) since this is a Client Component and its
// parent isn't -- functions can't cross that boundary as props.
export function CarsBrandGrid({ makes }: { makes: Make[] }) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = makes.length > INITIAL_LIMIT;
  const visible = expanded || !canCollapse ? makes : makes.slice(0, INITIAL_LIMIT);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {visible.map((make) => (
          <Link
            key={make.id}
            href={make.href}
            className={cn(
              "rounded-lg border bg-card px-3 py-2.5 text-center text-sm font-medium transition-all duration-150 hover:-translate-y-0.5 hover:border-[#e89818]/50 hover:shadow-sm",
              make.active ? "border-[#e89818] bg-[#e89818]/10 text-[#082040]" : "text-foreground/80",
            )}
          >
            {make.name}
          </Link>
        ))}
      </div>
      {canCollapse && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium text-[#082040] shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-[#e89818]/50 hover:bg-[#e89818]/5"
          >
            {expanded ? (
              <>
                Show less <ChevronUp className="size-4" />
              </>
            ) : (
              <>
                Show {makes.length - INITIAL_LIMIT} more <ChevronDown className="size-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
