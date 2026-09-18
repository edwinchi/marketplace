"use client";

import { useEffect, useState } from "react";
import type { AttributeDef } from "@/lib/categories";
import type { AttributeGroup } from "@/lib/car-attribute-groups";
import { AttributeField, attributeFieldName } from "@/components/listing-attribute-field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";

// Tracks how many of this category's attribute fields have a value, purely to show the
// "fill these in to sell faster" progress hint — matches the reference's "1/4" indicator. Uses
// one delegated onChange on the fieldset (React's synthetic onChange bubbles) instead of lifting
// controlled state into every AttributeField, so the fields themselves stay simple/uncontrolled.
// defaultValues is keyed by attribute stableKey (e.g. "brand", "fuel_type") -- for a select
// attribute the value must be that option's id (see AttributeField); the caller is responsible
// for that lookup since only it knows which raw value maps to which seeded option.
export function CharacteristicsSection({
  attributes,
  defaultValues,
  groups,
}: {
  attributes: AttributeDef[];
  defaultValues?: Record<string, string | string[]>;
  // Optional tabbed layout (e.g. lib/car-attribute-groups.ts's CAR_ATTRIBUTE_GROUPS) for a
  // category with enough attributes that one long scroll gets unwieldy. Omitted, every other
  // category keeps the original flat list.
  groups?: AttributeGroup[];
}) {
  const [filled, setFilled] = useState<Set<string>>(new Set());

  // defaultValues fills fields via the DOM's own defaultValue/defaultChecked, which never fires a
  // change event -- without this, a plate lookup that fills in a dozen fields at once would still
  // show "0/23 filled" until the seller edited something themselves. Re-runs whenever defaultValues
  // changes (e.g. a plate lookup resolving after the fieldset already mounted).
  useEffect(() => {
    if (!defaultValues) return;
    setFilled((prev) => {
      const next = new Set(prev);
      for (const attr of attributes) {
        const v = defaultValues[attr.stableKey];
        if (Array.isArray(v) ? v.length > 0 : !!v) next.add(attributeFieldName(attr));
      }
      return next;
    });
    // attributes is effectively static for a given category page -- only defaultValues arriving
    // (or changing) should re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues]);

  function handleChange(e: React.ChangeEvent<HTMLFieldSetElement>) {
    // e.target is the actual bubbled-from input/select, not the fieldset itself — React types
    // ChangeEvent by the listener's element, hence the cast through unknown.
    const target = e.target as unknown as HTMLInputElement | HTMLSelectElement;
    if (!target.name?.startsWith("attr__")) return;
    // A checkbox's .value never changes with its checked state -- .value.trim() would stay truthy
    // even while unchecking it. For a multi_select checkbox group (several inputs sharing one
    // name), "filled" means at least one of them is checked, not just the one that just fired.
    const isFilled =
      target.type === "checkbox"
        ? Array.from(e.currentTarget.querySelectorAll<HTMLInputElement>(`input[name="${target.name}"]`)).some((el) => el.checked)
        : !!target.value.trim();
    setFilled((prev) => {
      const next = new Set(prev);
      if (isFilled) next.add(target.name);
      else next.delete(target.name);
      return next;
    });
  }

  const total = attributes.length;
  const pct = total ? Math.round((filled.size / total) * 100) : 0;

  // Resolves each group's stable_keys to the actual AttributeDef objects present for this
  // category, dropping any key this category doesn't have; anything left over (an attribute not
  // yet added to the group list) still gets a home in a trailing "Other" tab rather than silently
  // disappearing from the form.
  const resolvedGroups = groups
    ? (() => {
        const used = new Set<string>();
        const named = groups
          .map((g) => ({
            label: g.label,
            attrs: g.stableKeys
              .map((k) => attributes.find((a) => a.stableKey === k))
              .filter((a): a is AttributeDef => {
                if (!a) return false;
                used.add(a.stableKey);
                return true;
              }),
          }))
          .filter((g) => g.attrs.length > 0);
        const leftover = attributes.filter((a) => !used.has(a.stableKey));
        return leftover.length > 0 ? [...named, { label: "Other", attrs: leftover }] : named;
      })()
    : null;

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
      {/* key forces a remount when defaultValues arrives asynchronously (e.g. after a plate
          lookup completes) -- same reasoning as the description Textarea's key trick in
          new-listing-step2-form.tsx: defaultValue only applies on first mount. */}
      <fieldset key={JSON.stringify(defaultValues ?? {})} onChange={handleChange} className="flex flex-col gap-4">
        {resolvedGroups && resolvedGroups.length > 0 ? (
          <Tabs defaultValue={resolvedGroups[0].label}>
            <TabsList>
              {resolvedGroups.map((g) => (
                <TabsTrigger key={g.label} value={g.label}>
                  {g.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {resolvedGroups.map((g) => (
              // keepMounted: base-ui's Tabs.Panel unmounts hidden panels by default, which would
              // wipe every uncontrolled field's value (defaultValue only applies once, on mount)
              // the moment the seller switched away from its tab and back.
              <TabsContent key={g.label} value={g.label} keepMounted className="flex flex-col gap-4">
                {g.attrs.map((attr) => (
                  <AttributeField key={attr.id} attr={attr} defaultValue={defaultValues?.[attr.stableKey]} />
                ))}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          attributes.map((attr) => <AttributeField key={attr.id} attr={attr} defaultValue={defaultValues?.[attr.stableKey]} />)
        )}
      </fieldset>
    </section>
  );
}
