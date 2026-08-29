"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLLAPSED_LIMIT = 6;

type Leaf = { id: string; name: string; href: string };

export function CategoryGroupCard({ name, href, leaves }: { name: string; href: string; leaves: Leaf[] }) {
  const t = useTranslations("Categories");
  const [expanded, setExpanded] = useState(false);
  const canCollapse = leaves.length > COLLAPSED_LIMIT;
  const visible = expanded || !canCollapse ? leaves : leaves.slice(0, COLLAPSED_LIMIT);

  return (
    <Card className="transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#008848]/40 hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          <Link href={href} className="transition-colors hover:text-[#008848] hover:underline">
            {name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1.5 text-sm">
          {visible.map((leaf) => (
            <li key={leaf.id}>
              <Link
                href={leaf.href}
                className="inline-block text-muted-foreground transition-all duration-150 hover:translate-x-0.5 hover:text-foreground hover:underline"
              >
                {leaf.name}
              </Link>
            </li>
          ))}
        </ul>
        {canCollapse && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline"
          >
            {expanded ? (
              <>
                {t("showLess")} <ChevronUp className="size-3.5" />
              </>
            ) : (
              <>
                {t("showMore", { count: leaves.length - COLLAPSED_LIMIT })} <ChevronDown className="size-3.5" />
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
