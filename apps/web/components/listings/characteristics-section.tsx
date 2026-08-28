"use client";

import { useState } from "react";
import type { AttributeDef } from "@/lib/categories";
import { AttributeField } from "@/components/listing-attribute-field";
import { Sparkles } from "lucide-react";

// Tracks how many of this category's attribute fields have a value, purely to show the
// "fill these in to sell faster" progress hint — matches the reference's "1/4" indicator. Uses
// one delegated onChange on the fieldset (React's synthetic onChange bubbles) instead of lifting
// controlled state into every AttributeField, so the fields themselves stay simple/uncontrolled.
export function CharacteristicsSection({ attributes }: { attributes: AttributeDef[] }) {
  const [filled, setFilled] = useState<Set<string>>(new Set());

  function handleChange(e: React.ChangeEvent<HTMLFieldSetElement>) {
    // e.target is the actual bubbled-from input/select, not the fieldset itself — React types
    // ChangeEvent by the listener's element, hence the cast through unknown.
    const target = e.target as unknown as HTMLInputElement | HTMLSelectElement;
    if (!target.name?.startsWith("attr__")) return;
    setFilled((prev) => {
      const next = new Set(prev);
      if (target.value.trim()) next.add(target.name);
      else next.delete(target.name);
      return next;
    });
  }

  const total = attributes.length;
  const pct = total ? Math.round((filled.size / total) * 100) : 0;

  return (
    <section>
      <div className="mb-3 flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold">Characteristics</h2>
        {total > 0 && (
          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            <div className="flex flex-col items-end gap-1">
              <span>Fill these in to sell faster</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span>
                  {filled.size}/{total}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      <fieldset onChange={handleChange} className="flex flex-col gap-4">
        {attributes.map((attr) => (
          <AttributeField key={attr.id} attr={attr} />
        ))}
      </fieldset>
    </section>
  );
}
