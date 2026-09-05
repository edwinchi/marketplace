"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Sparkles, Lock } from "lucide-react";
import Link from "next/link";
import type { AttributeDef, CategoryOption } from "@/lib/categories";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { ANCHOR_COUNTRIES } from "@/lib/countries";
import type { ListingFormState } from "@/app/listings/actions";
import { analyzeListingPhoto } from "@/app/listings/new/analyze-photo-action";
import { polishDescription } from "@/app/listings/polish-description-action";
import { suggestPrice, type PriceSuggestion } from "@/app/listings/price-suggestion-action";
import { translateListing } from "@/app/listings/translate-action";
import { fileToResizedBase64 } from "@/lib/image";
import { formatPrice } from "@/lib/money";
import { EditPhotoManager, type ExistingPhoto, type CoverPhoto } from "@/components/listings/edit-photo-manager";
import { RichDescription } from "@/components/listings/rich-description";
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
  // Present only on the edit form — real photo management (add/remove/reorder existing photos,
  // not just the create flow's fresh-upload-only case) plus the ability to re-run AI against
  // whichever photo currently sits first, existing or newly added.
  initialPhotos?: ExistingPhoto[];
  aiUsage?: { usesLeft: number; freeLimit: number; unlimited: boolean };
  // Seller Pro-exclusive features (description polish, and more as they ship) -- shown whenever
  // the edit form itself is shown (initialPhotos present) so a non-subscriber still discovers the
  // button and its upgrade prompt, matching ListenButton's "visible but locked" convention rather
  // than hiding the feature entirely.
  isSellerPro?: boolean;
  // Needed to exclude the listing's own price from its price-suggestion comparables when editing
  // -- otherwise an active listing always "confirms" its own current price is in-range.
  listingId?: string;
  hasFrenchTranslation?: boolean;
};

export function ListingForm({
  categoryOptions,
  attributesByCategory,
  action,
  submitLabel,
  initial,
  hideLocation,
  initialPhotos,
  aiUsage,
  isSellerPro,
  listingId,
  hasFrenchTranslation,
}: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null } as ListingFormState);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [currencyCode, setCurrencyCode] = useState(initial?.currencyCode ?? SUPPORTED_CURRENCIES[0]);
  const attributes = attributesByCategory[categoryId] ?? [];

  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [analyzing, startAnalyzing] = useTransition();
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [descriptionPreview, setDescriptionPreview] = useState(initial?.description ?? "");
  const [categoryMismatch, setCategoryMismatch] = useState<string | null>(null);
  const [usesLeft, setUsesLeft] = useState<number | null>(aiUsage?.usesLeft ?? null);
  const [cover, setCover] = useState<CoverPhoto | null>(null);
  const [polishing, startPolishing] = useTransition();
  const [polishError, setPolishError] = useState<string | null>(null);
  const [suggesting, startSuggesting] = useTransition();
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  function polish() {
    setPolishError(null);
    startPolishing(async () => {
      const { description, error } = await polishDescription(titleRef.current?.value ?? "", descriptionRef.current?.value ?? "");
      if (error || !description) {
        setPolishError(error ?? "Couldn't polish that description.");
        return;
      }
      setAiDescription(description);
      setDescriptionPreview(description);
    });
  }

  function suggest() {
    setSuggestError(null);
    setPriceSuggestion(null);
    startSuggesting(async () => {
      const result = await suggestPrice(categoryId, currencyCode, listingId);
      if ("error" in result) {
        setSuggestError(result.error);
        return;
      }
      setPriceSuggestion(result);
    });
  }

  const [translating, startTranslating] = useTransition();
  const [translated, setTranslated] = useState(hasFrenchTranslation ?? false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  function translate() {
    if (!listingId) return;
    setTranslateError(null);
    startTranslating(async () => {
      const { error } = await translateListing(listingId, "fr");
      if (error) {
        setTranslateError(error);
        return;
      }
      setTranslated(true);
    });
  }

  const analyzeInFlight = useRef(false);

  function analyzeCoverPhoto() {
    if (!cover || analyzeInFlight.current) return;
    analyzeInFlight.current = true;
    setAnalyzeError(null);
    setCategoryMismatch(null);
    startAnalyzing(async () => {
      try {
        const file =
          cover.kind === "new"
            ? cover.file
            : await fetch(cover.url)
                .then((r) => r.blob())
                .then((blob) => new File([blob], "cover.jpg", { type: blob.type || "image/jpeg" }));
        const { base64, mediaType } = await fileToResizedBase64(file);
        const { data, error, usesLeft: left } = await analyzeListingPhoto(base64, mediaType);
        setUsesLeft(left);
        if (error || !data) {
          setAnalyzeError(error ?? "Couldn't analyze that photo.");
          return;
        }
        if (titleRef.current) titleRef.current.value = data.title;
        setAiDescription(data.description);
        setDescriptionPreview(data.description);
        if (data.categoryId !== categoryId) setCategoryMismatch(data.categoryLabel);
      } catch {
        setAnalyzeError("Couldn't analyze that photo — try again.");
      } finally {
        analyzeInFlight.current = false;
      }
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {initialPhotos && (
        <div className="flex flex-col gap-1.5">
          <Label>Photos</Label>
          <EditPhotoManager initialPhotos={initialPhotos} onCoverChange={setCover} />
        </div>
      )}

      {initialPhotos && aiUsage && (
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
            {cover && (
              /* eslint-disable-next-line @next/next/no-img-element -- mix of remote (existing) and local blob (new) previews, neither optimizable */
              <img src={cover.kind === "existing" ? cover.url : cover.previewUrl} alt="" className="size-16 shrink-0 rounded-md border object-cover" />
            )}
            <div className="flex-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={analyzing || !cover || (usesLeft !== null && usesLeft === 0 && !aiUsage.unlimited)}
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
        <Textarea
          ref={descriptionRef}
          key={aiDescription ?? "initial"}
          id="description"
          name="description"
          required
          rows={5}
          disabled={analyzing || polishing}
          defaultValue={aiDescription ?? initial?.description}
          onChange={(e) => setDescriptionPreview(e.target.value)}
        />
        {(analyzing || polishing) && (
          <p className="text-xs text-muted-foreground">Description is locked while AI writes a draft — it&apos;ll unlock in a few seconds.</p>
        )}
        {/^(##\s|[-*]\s)/m.test(descriptionPreview) && (
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Preview — this is how buyers will see it</p>
            <RichDescription text={descriptionPreview} />
          </div>
        )}
        {initialPhotos && (
          <div>
            <Button type="button" variant="outline" size="sm" disabled={polishing} onClick={polish} className="gap-1.5">
              {isSellerPro ? <Sparkles className="size-3.5 text-primary" /> : <Lock className="size-3.5" />}
              {polishing ? "Polishing…" : "Polish with AI"}
            </Button>
            {polishError && (
              <p className="mt-1.5 text-xs text-destructive">
                {polishError}
                {!isSellerPro && (
                  <>
                    {" "}
                    <Link href="/my-account/ai-features" className="underline underline-offset-2">See Seller Pro</Link>.
                  </>
                )}
              </p>
            )}
          </div>
        )}
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
          <Select name="currency_code" value={currencyCode} onValueChange={(v) => setCurrencyCode(v ?? SUPPORTED_CURRENCIES[0])}>
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

      {initialPhotos && (
        <div>
          <Button type="button" variant="outline" size="sm" disabled={suggesting || !categoryId} onClick={suggest} className="gap-1.5">
            {isSellerPro ? <Sparkles className="size-3.5 text-primary" /> : <Lock className="size-3.5" />}
            {suggesting ? "Checking similar listings…" : "Suggest a price"}
          </Button>
          {priceSuggestion && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Similar active listings: {formatPrice(priceSuggestion.minMinor, priceSuggestion.currencyCode)}–
              {formatPrice(priceSuggestion.maxMinor, priceSuggestion.currencyCode)} (median{" "}
              {formatPrice(priceSuggestion.medianMinor, priceSuggestion.currencyCode)}, based on {priceSuggestion.count} listings).
            </p>
          )}
          {suggestError && (
            <p className="mt-1.5 text-xs text-destructive">
              {suggestError}
              {!isSellerPro && (
                <>
                  {" "}
                  <Link href="/my-account/ai-features" className="underline underline-offset-2">See Seller Pro</Link>.
                </>
              )}
            </p>
          )}
        </div>
      )}

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

      {listingId && (
        <div className="flex flex-col gap-1.5">
          <Label>Translation</Label>
          <div>
            <Button type="button" variant="outline" size="sm" disabled={translating} onClick={translate} className="gap-1.5 w-fit">
              {isSellerPro ? <Sparkles className="size-3.5 text-primary" /> : <Lock className="size-3.5" />}
              {translating ? "Translating…" : translated ? "Update French translation" : "Translate to French"}
            </Button>
            {translated && !translateError && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                A French-speaking visitor will now see the translated title and description on this listing&apos;s page automatically.
              </p>
            )}
            {translateError && (
              <p className="mt-1.5 text-xs text-destructive">
                {translateError}
                {!isSellerPro && (
                  <>
                    {" "}
                    <Link href="/my-account/ai-features" className="underline underline-offset-2">See Seller Pro</Link>.
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      )}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
