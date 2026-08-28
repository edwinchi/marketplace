"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLLAPSED_LIMIT = 6;

type Leaf = { id: string; name: string };

export function CategoryGroupCard({ id, name, leaves }: { id: string; name: string; leaves: Leaf[] }) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = leaves.length > COLLAPSED_LIMIT;
  const visible = expanded || !canCollapse ? leaves : leaves.slice(0, COLLAPSED_LIMIT);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          <Link href={`/categories/${id}`} className="hover:underline">
            {name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-1.5 text-sm">
          {visible.map((leaf) => (
            <li key={leaf.id}>
              <Link href={`/categories/${leaf.id}`} className="text-muted-foreground transition-colors hover:text-foreground hover:underline">
                {leaf.name}
              </Link>
            </li>
          ))}
        </ul>
        {canCollapse && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {expanded ? (
              <>
                Show less <ChevronUp className="size-3.5" />
              </>
            ) : (
              <>
                Show {leaves.length - COLLAPSED_LIMIT} more <ChevronDown className="size-3.5" />
              </>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
