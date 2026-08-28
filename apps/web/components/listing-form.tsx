"use client";

import { useActionState, useState } from "react";
import type { AttributeDef, CategoryOption } from "@/lib/categories";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { ANCHOR_COUNTRIES } from "@/lib/countries";
import type { ListingFormState } from "@/app/listings/actions";
import { AttributeField } from "@/components/listing-attribute-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  categoryOptions: CategoryOption[];
  attributesByCategory: Record<string, AttributeDef[]>;
  action: (state: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  submitLabel: string;
  initial?: {
    title?: string;
    description?: string;
    categoryId?: string;
    price?: string;
    currencyCode?: string;
    websiteUrl?: string | null;
  };
  hideLocation?: boolean;
};

export function ListingForm({ categoryOptions, attributesByCategory, action, submitLabel, initial, hideLocation }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null } as ListingFormState);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const attributes = attributesByCategory[categoryId] ?? [];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required maxLength={160} defaultValue={initial?.title} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" required rows={5} defaultValue={initial?.description} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category_id">Category</Label>
        <Select name="category_id" value={categoryId} onValueChange={(value) => setCategoryId(value ?? "")}>
          <SelectTrigger id="category_id" className="w-full">
            <SelectValue placeholder="Select a category">
              {(value: string | null) => categoryOptions.find((c) => c.id === value)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">Price</Label>
          <Input id="price" name="price" type="number" min="0" step="0.01" required defaultValue={initial?.price} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency_code">Currency</Label>
          <Select name="currency_code" defaultValue={initial?.currencyCode ?? SUPPORTED_CURRENCIES[0]}>
            <SelectTrigger id="currency_code" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="website_url">Website (optional)</Label>
        <Input id="website_url" name="website_url" type="text" placeholder="yourshop.com" defaultValue={initial?.websiteUrl ?? ""} />
        <p className="text-xs text-muted-foreground">Shown as a &quot;Visit website&quot; link on all of your listings, not just this one.</p>
      </div>

      {!hideLocation && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country_code">Country</Label>
            <Select name="country_code" defaultValue={ANCHOR_COUNTRIES[0].code}>
              <SelectTrigger id="country_code" className="w-full">
                <SelectValue>{(value: string | null) => ANCHOR_COUNTRIES.find((c) => c.code === value)?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ANCHOR_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {attributes.length > 0 && (
        <fieldset className="flex flex-col gap-4 rounded-md border p-4">
          <legend className="px-1 text-sm font-medium">Category details</legend>
          {attributes.map((attr) => (
            <AttributeField key={attr.id} attr={attr} />
          ))}
        </fieldset>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
