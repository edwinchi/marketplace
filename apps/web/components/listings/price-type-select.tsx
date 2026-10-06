"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRICE_TYPES, PRICE_TYPE_FORM_LABELS, parsePriceType, type PriceType } from "@/lib/price-types";

// Shared by the posting wizard and the edit form. Controlled, so the caller can hide the price
// input for types without an amount (free, swap, see description, price on request).
export function PriceTypeSelect({ value, onChange }: { value: PriceType; onChange: (value: PriceType) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="price_type">Price type</Label>
      <Select name="price_type" value={value} onValueChange={(v) => v && onChange(parsePriceType(v))}>
        <SelectTrigger id="price_type" className="w-full sm:w-56">
          <SelectValue>{(v: string | null) => PRICE_TYPE_FORM_LABELS[parsePriceType(v)]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PRICE_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {PRICE_TYPE_FORM_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
