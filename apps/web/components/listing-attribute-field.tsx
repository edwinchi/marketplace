"use client";

import type { AttributeDef } from "@/lib/categories";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Shared by ListingForm (edit) and the create wizard's step 2 — encodes attribute id/stableKey/
// dataType into the field name so app/listings/actions.ts's saveAttributeValues can interpret the
// submitted value without a second server-side lookup. See agents.md §12 for why.
//
// A single_select attribute with zero seeded attribute_options (e.g. "brand" — thousands of
// open-ended values, never going to be a fixed list) falls back to a plain text field here. The
// encoded dataType reflects that fallback (value_text, not value_option_id) so the server writes
// it to the right column.
function effectiveDataType(attr: AttributeDef) {
  return attr.dataType === "single_select" && attr.options.length === 0 ? "text" : attr.dataType;
}

export function attributeFieldName(attr: AttributeDef) {
  return `attr__${attr.id}__${attr.stableKey}__${effectiveDataType(attr)}`;
}

export function AttributeField({ attr }: { attr: AttributeDef }) {
  const name = attributeFieldName(attr);
  const label = `${attr.label}${attr.unitCode ? ` (${attr.unitCode})` : ""}`;

  if (attr.dataType === "single_select" && attr.options.length > 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={name}>{label}</Label>
        <Select name={name}>
          <SelectTrigger id={name} className="w-full">
            <SelectValue placeholder={`Select ${attr.label.toLowerCase()}`}>
              {(value: string | null) => attr.options.find((o) => o.id === value)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {attr.options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const inputType = attr.dataType === "date" ? "date" : attr.dataType === "integer" || attr.dataType === "decimal" ? "number" : "text";
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={inputType} step={attr.dataType === "decimal" ? "0.01" : undefined} />
    </div>
  );
}
