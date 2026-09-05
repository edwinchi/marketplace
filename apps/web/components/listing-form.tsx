"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import type { AttributeDef, CategoryOption } from "@/lib/categories";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { ANCHOR_COUNTRIES } from "@/lib/countries";
import type { ListingFormState } from "@/app/listings/actions";
import { analyzeListingPhoto } from "@/app/listings/new/analyze-photo-action";
import { fileToResizedBase64 } from "@/lib/image";
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
  // Present only on the edit form — lets a seller re-run AI against the listing's existing cover
  // photo to refresh the title/description, the same analysis new-listing-step2-form.tsx offers,
  // just sourced from the photo already on the listing instead of a fresh upload (editing doesn't
  // have photo-management UI yet).
  coverPhotoUrl?: string | null;
  aiUsage?: { usesLeft: number; freeLimit: number; unlimited: boolean };
};

export function ListingForm({ categoryOptions, attributesByCategory, action, submitLabel, initial, hideLocation, coverPhotoUrl, aiUsage }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null } as ListingFormState);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const attributes = attributesByCategory[categoryId] ?? [];

  const titleRef = useRef<HTMLInputElement>(null);
  const [analyzing, startAnalyzing] = useTransition();
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [categoryMismatch, setCategoryMismatch] = useState<string | null>(null);
  const [usesLeft, setUsesLeft] = useState<number | null>(aiUsage?.usesLeft ?? null);

  function analyzeCoverPhoto() {
    if (!coverPhotoUrl) return;
    setAnalyzeError(null);
    setCategoryMismatch(null);
    startAnalyzing(async () => {
      try {
        const blob = await fetch(coverPhotoUrl).then((r) => r.blob());
        const file = new File([blob], "cover.jpg", { type: blob.type || "image/jpeg" });
        const { base64, mediaType } = await fileToResizedBase64(file);
        const { data, error, usesLeft: left } = await analyzeListingPhoto(base64, mediaType);
        setUsesLeft(left);
        if (error || !data) {
          setAnalyzeError(error ?? "Couldn't analyze that photo.");
          return;
        }
        if (titleRef.current) titleRef.current.value = data.title;
        setAiDescription(data.description);
        if (data.categoryId !== categoryId) setCategoryMismatch(data.categoryLabel);
      } catch {
        setAnalyzeError("Couldn't analyze that photo — try again.");
      }
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {coverPhotoUrl && aiUsage && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Refresh with AI</h2>
            </div>
            {!aiUsage.unlimited && usesLeft === 0 && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                0 free uses left
              </span>
            )}
          </div>
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- existing listing photo, already a fixed remote URL */}
            <img src={coverPhotoUrl} alt="" className="size-16 shrink-0 rounded-md border object-cover" />
            <div className="flex-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={analyzing || (usesLeft !== null && usesLeft === 0 && !aiUsage.unlimited)}
                onClick={analyzeCoverPhoto}
                className="gap-1.5"
              >
                <Sparkles className="size-4 text-primary" />
                {analyzing ? "Analyzing…" : "Fill in title & description with AI"}
              </Button>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {analyzing && "Looking at your cover photo…"}
                {!analyzing && analyzeError && <span className="text-destructive">{analyzeError}</span>}
                {!analyzing && !analyzeError && "Re-analyzes your current cover photo — review the result before saving."}
              </p>
              {categoryMismatch && (
                <p className="mt-1 text-xs text-muted-foreground">
                  This might fit better under <span className="font-medium text-foreground">{categoryMismatch}</span> — change the category below if so.
                </p>
              )}
              {!aiUsage.unlimited && usesLeft !== null && usesLeft > 0 && usesLeft <= 2 && (
                <p className="mt-1 text-xs text-amber-600">
                  {usesLeft} free AI {usesLeft === 1 ? "use" : "uses"} left —{" "}
                  <Link href="/my-account/ai-features" className="underline underline-offset-2">see what's next</Link>.
                </p>
              )}
              {!aiUsage.unlimited && usesLeft === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  That was your last free AI use —{" "}
                  <Link href="/my-account/ai-features" className="underline underline-offset-2">upgrade for more</Link>.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input ref={titleRef} id="title" name="title" required maxLength={160} defaultValue={initial?.title} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Description</Label>
          {aiDescription && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="size-3 text-primary" />
              AI-generated — please review
            </span>
          )}
        </div>
        {/* key forces a remount when AI fills this in, the same trick new-listing-step2-form.tsx
            uses -- defaultValue (uncontrolled, like every other field in this form) only applies
            on first mount otherwise. */}
        <Textarea key={aiDescription ?? "initial"} id="description" name="description" required rows={5} defaultValue={aiDescription ?? initial?.description} />
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
