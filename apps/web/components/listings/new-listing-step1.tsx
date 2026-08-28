"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sparkles, Camera, X } from "lucide-react";
import { findCategoryMatches, type CategoryMatch } from "@/app/listings/new/find-category-action";
import { analyzeListingPhoto } from "@/app/listings/new/analyze-photo-action";
import { fileToResizedBase64 } from "@/lib/image";
import { saveListingDraft } from "@/lib/listing-draft";
import type { CategoryOption } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function NewListingStep1({ categoryOptions }: { categoryOptions: CategoryOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [matches, setMatches] = useState<CategoryMatch[] | null>(null);
  const [selected, setSelected] = useState<string>("manual");
  const [manualCategoryId, setManualCategoryId] = useState("");
  const [searching, startSearch] = useTransition();

  const [useAi, setUseAi] = useState(true);
  const [photoPreview, setPhotoPreview] = useState<{ file: File; dataUrl: string } | null>(null);
  const [analyzing, startAnalyzing] = useTransition();
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [aiCategoryLabel, setAiCategoryLabel] = useState<string | null>(null);

  const chosenCategoryId = selected === "manual" ? manualCategoryId : selected;

  function handleFindCategory() {
    startSearch(async () => {
      const results = await findCategoryMatches(title);
      setMatches(results);
      if (results.length > 0) setSelected(results[0].id);
    });
  }

  async function handlePhotoSelected(file: File) {
    setAnalyzeError(null);
    setAiDescription(null);
    setAiCategoryLabel(null);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview({ file, dataUrl: reader.result as string });
    reader.readAsDataURL(file);

    startAnalyzing(async () => {
      try {
        const { base64, mediaType } = await fileToResizedBase64(file);
        const { data, error } = await analyzeListingPhoto(base64, mediaType);
        if (error || !data) {
          setAnalyzeError(error ?? "Couldn't analyze that photo.");
          return;
        }
        setTitle(data.title);
        setManualCategoryId(data.categoryId);
        setSelected(data.categoryId);
        setMatches(null);
        setAiDescription(data.description);
        setAiCategoryLabel(data.categoryLabel);
        const reader2 = new FileReader();
        reader2.onload = () => {
          saveListingDraft({
            title: data.title,
            categoryId: data.categoryId,
            description: data.description,
            imageDataUrl: reader2.result as string,
          });
        };
        reader2.readAsDataURL(file);
      } catch {
        setAnalyzeError("Couldn't analyze that photo — try again or fill in the details yourself below.");
      }
    });
  }

  function handleContinue() {
    if (!title.trim() || !chosenCategoryId) return;
    router.push(`/listings/new/details?title=${encodeURIComponent(title.trim())}&category=${chosenCategoryId}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Have a photo? Let AI fill this in</h2>
          </div>
          <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={useAi}
              onChange={(e) => setUseAi(e.target.checked)}
              className="size-3.5"
            />
            Use AI
          </label>
        </div>
        {!useAi && (
          <p className="text-sm text-muted-foreground">
            AI assistance is off — no photo will be analyzed. Fill in the title and category yourself below.
          </p>
        )}
        {useAi && <div className="flex items-start gap-3">
          {photoPreview ? (
            <div className="relative size-20 shrink-0 overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview, not a remote/optimizable image */}
              <img src={photoPreview.dataUrl} alt="" className="size-full object-cover" />
              {!analyzing && (
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => {
                    setPhotoPreview(null);
                    setAiDescription(null);
                    setAiCategoryLabel(null);
                    setAnalyzeError(null);
                  }}
                  className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-background/90"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          ) : (
            <label className="flex size-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:border-foreground/40 hover:text-foreground">
              <Camera className="size-5" />
              <span className="text-[10px]">Add photo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoSelected(file);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          <div className="flex-1 text-sm">
            {analyzing && <p className="text-muted-foreground">Analyzing photo…</p>}
            {!analyzing && analyzeError && <p className="text-destructive">{analyzeError}</p>}
            {!analyzing && !analyzeError && aiCategoryLabel && (
              <div>
                <p className="text-muted-foreground">
                  Suggested category: <span className="font-medium text-foreground">{aiCategoryLabel}</span>
                </p>
                {aiDescription && <p className="mt-1 text-xs text-muted-foreground">{aiDescription}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  Title and description are filled in below — read them over, then continue.
                </p>
              </div>
            )}
            {!analyzing && !analyzeError && !aiCategoryLabel && (
              <p className="text-muted-foreground">
                Upload a photo of the item and AI will suggest a title, category, and description for you to review.
              </p>
            )}
          </div>
        </div>}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">What do you want to sell?</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <Label htmlFor="title" className="sr-only">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setMatches(null);
              }}
              placeholder="Enter a title"
              maxLength={80}
            />
            <p className="mt-1 text-xs text-muted-foreground">E.g. color, brand, or size</p>
          </div>
          <Button type="button" onClick={handleFindCategory} disabled={title.trim().length < 3 || searching}>
            {searching ? "Searching…" : "Find category"}
          </Button>
        </div>
      </div>

      <div>
        {matches && matches.length > 0 && (
          <fieldset className="mb-4 flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium">Choose a category</legend>
            {matches.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="category_choice"
                  checked={selected === m.id}
                  onChange={() => setSelected(m.id)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block">{m.name}</span>
                  {m.parentLabel && <span className="block text-xs text-muted-foreground">{m.parentLabel}</span>}
                </span>
              </label>
            ))}
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                name="category_choice"
                checked={selected === "manual"}
                onChange={() => setSelected("manual")}
                className="mt-0.5"
              />
              <span>Or select a category yourself</span>
            </label>
          </fieldset>
        )}

        {(!matches || matches.length === 0 || selected === "manual") && (
          <div className="flex flex-col gap-1.5">
            {(!matches || matches.length === 0) && <Label htmlFor="manual_category">Or select a category yourself</Label>}
            <Select value={manualCategoryId} onValueChange={(v) => { setManualCategoryId(v ?? ""); setSelected("manual"); }}>
              <SelectTrigger id="manual_category" className="w-full sm:w-96">
                <SelectValue placeholder="Choose a category">
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
        )}
      </div>

      <Button type="button" onClick={handleContinue} disabled={!title.trim() || !chosenCategoryId} className="self-start">
        Continue
      </Button>
    </div>
  );
}
