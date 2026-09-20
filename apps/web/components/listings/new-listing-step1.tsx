"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Camera, X, Car, Flag } from "lucide-react";
import { findCategoryMatches, type CategoryMatch } from "@/app/listings/new/find-category-action";
import { analyzeListingPhoto, type PhotoAnalysis } from "@/app/listings/new/analyze-photo-action";
import { reportAiOutput } from "@/app/listings/new/report-ai-output-action";
import { fileToResizedBase64 } from "@/lib/image";
import { saveListingDraft } from "@/lib/listing-draft";
import { MAX_ANALYSIS_PHOTOS as MAX_AI_PHOTOS } from "@/lib/ai-photo-analysis";
import type { VehicleLookupResult } from "@/lib/rdw";
import { vehicleLookupTitle } from "@/lib/vehicle-listing-defaults";
import type { CategoryOption } from "@/lib/categories";
import { SellCarPlateModal } from "@/components/listings/sell-car-plate-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function ReportAiOutput({ result, extraText }: { result: PhotoAnalysis; extraText: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return <p className="mt-2 text-xs text-muted-foreground">Thanks — this has been reported for review.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        <Flag className="size-3" /> Something wrong with this? Report it
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-md border border-dashed p-3">
      <Label htmlFor="ai_report_reason" className="text-xs">What&apos;s wrong with the AI-generated text?</Label>
      <Textarea
        id="ai_report_reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="E.g. wrong item, offensive language, made-up details..."
        rows={2}
        className="text-sm"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!reason.trim() || pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await reportAiOutput({
                categoryId: result.categoryId,
                title: result.title,
                description: result.description,
                extraText,
                reason: reason.trim(),
              });
              if (res.error) setError(res.error);
              else setDone(true);
            })
          }
        >
          {pending ? "Sending…" : "Submit report"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function NewListingStep1({
  categoryOptions,
  initialUsesLeft,
  freeLimit,
}: {
  categoryOptions: CategoryOption[];
  initialUsesLeft: number;
  freeLimit: number;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [matches, setMatches] = useState<CategoryMatch[] | null>(null);
  const [selected, setSelected] = useState<string>("manual");
  const [manualCategoryId, setManualCategoryId] = useState("");
  const [searching, startSearch] = useTransition();

  const [useAi, setUseAi] = useState(true);
  const [photoPreviews, setPhotoPreviews] = useState<{ file: File; dataUrl: string }[]>([]);
  const [extraText, setExtraText] = useState("");
  const [analyzing, startAnalyzing] = useTransition();
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<PhotoAnalysis | null>(null);
  const [usesLeft, setUsesLeft] = useState(initialUsesLeft);

  const chosenCategoryId = selected === "manual" ? manualCategoryId : selected;
  const carsCategory = categoryOptions.find((c) => c.stableKey === "cars");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [plateModalOpen, setPlateModalOpen] = useState(false);

  function handleSellCar() {
    if (!carsCategory) return;
    setPlateModalOpen(true);
  }

  function handlePlateSkip() {
    if (!carsCategory) return;
    setManualCategoryId(carsCategory.id);
    setSelected(carsCategory.id);
    setMatches(null);
    setPlateModalOpen(false);
    titleInputRef.current?.focus();
  }

  // A successful plate lookup carries enough to go straight to step 2 -- the same instant payoff
  // the reference "Sell your car" shortcut gives, rather than making the seller retype what the
  // registry already told us. Navigating with state just set is a stale-closure risk (setState is
  // async), so this passes the resolved values straight through instead of reading title/selected
  // back out of state.
  function handlePlateUsed(result: VehicleLookupResult) {
    if (!carsCategory) return;
    const finalTitle = vehicleLookupTitle(result) || title.trim() || "Car";
    setTitle(finalTitle);
    setManualCategoryId(carsCategory.id);
    setSelected(carsCategory.id);
    setMatches(null);
    setPlateModalOpen(false);
    saveListingDraft({ title: finalTitle, categoryId: carsCategory.id, vehicleLookup: result });
    router.push(`/listings/new/details?title=${encodeURIComponent(finalTitle)}&category=${carsCategory.id}`);
  }

  function handleFindCategory() {
    startSearch(async () => {
      const results = await findCategoryMatches(title);
      setMatches(results);
      if (results.length > 0) setSelected(results[0].id);
    });
  }

  function handlePhotosSelected(files: FileList) {
    const room = MAX_AI_PHOTOS - photoPreviews.length;
    if (room <= 0) return;
    setAiResult(null);
    setAnalyzeError(null);
    for (const file of Array.from(files).slice(0, room)) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreviews((prev) => (prev.length >= MAX_AI_PHOTOS ? prev : [...prev, { file, dataUrl: reader.result as string }]));
      reader.readAsDataURL(file);
    }
  }

  function removePhoto(index: number) {
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
    setAiResult(null);
    setAnalyzeError(null);
  }

  const analyzeInFlight = useRef(false);

  // A deliberate button click, not auto-triggered per photo (unlike the single-photo version this
  // replaced) -- with up to 3 photos now selectable, auto-analyzing on every add would burn through
  // the free-use limit (see FREE_USE_LIMIT, app/listings/new/analyze-photo-action.ts) just from
  // adding photos one at a time. Matches the reference's own explicit "Maak mijn advertentie"
  // button rather than an implicit trigger.
  function handleAnalyze() {
    if (analyzeInFlight.current || photoPreviews.length === 0) return;
    analyzeInFlight.current = true;
    setAnalyzeError(null);
    setAiResult(null);

    startAnalyzing(async () => {
      try {
        const images = await Promise.all(photoPreviews.map((p) => fileToResizedBase64(p.file)));
        const { data, error, usesLeft: left } = await analyzeListingPhoto(images, extraText);
        setUsesLeft(left);
        if (error || !data) {
          setAnalyzeError(error ?? "Couldn't analyze those photos.");
          return;
        }
        setTitle(data.title);
        setManualCategoryId(data.categoryId);
        setSelected(data.categoryId);
        setMatches(null);
        setAiResult(data);
        saveListingDraft({
          title: data.title,
          categoryId: data.categoryId,
          description: data.description,
          attributes: data.attributes,
          imageDataUrls: photoPreviews.map((p) => p.dataUrl),
        });
      } catch {
        setAnalyzeError("Couldn't analyze those photos — try again or fill in the details yourself below.");
      } finally {
        analyzeInFlight.current = false;
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
            <h2 className="text-sm font-semibold">Optional: skip the typing with AI</h2>
          </div>
          {usesLeft > 0 ? (
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={useAi}
                onChange={(e) => setUseAi(e.target.checked)}
                className="size-3.5"
              />
              Use AI
            </label>
          ) : (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              0 free uses left
            </span>
          )}
        </div>
        {usesLeft > 0 && usesLeft <= 2 && (
          <p className="mb-2 text-xs text-amber-600">
            {usesLeft} free AI {usesLeft === 1 ? "use" : "uses"} left —{" "}
            <Link href="/my-account/ai-features" className="underline underline-offset-2">
              see what&apos;s next
            </Link>
            .
          </p>
        )}
        {usesLeft === 0 && (
          <div className="flex flex-col gap-2 rounded-md border border-dashed p-3 text-sm">
            <p className="text-muted-foreground">
              You&apos;ve used all {freeLimit} free AI photo analyses. Fill in the title and category
              yourself below, or upgrade for continued AI autofill.
            </p>
            <Link
              href="/my-account/ai-features"
              className="w-fit rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-transform duration-150 hover:-translate-y-0.5"
            >
              See upgrade options
            </Link>
          </div>
        )}
        {usesLeft === 0 ? null : !useAi ? (
          <p className="text-sm text-muted-foreground">
            AI assistance is off — no photo will be analyzed. Fill in the title and category yourself below.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start gap-3">
              {photoPreviews.map((p, i) => (
                <div key={i} className="relative size-20 shrink-0 overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview, not a remote/optimizable image */}
                  <img src={p.dataUrl} alt="" className="size-full object-cover" />
                  {!analyzing && (
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => removePhoto(i)}
                      className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-background/90"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              ))}
              {photoPreviews.length < MAX_AI_PHOTOS && (
                <label className="flex size-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:border-foreground/40 hover:text-foreground">
                  <Camera className="size-5" />
                  <span className="text-[10px]">{photoPreviews.length > 0 ? "Add more" : "Add photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) handlePhotosSelected(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            {photoPreviews.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Add up to {MAX_AI_PHOTOS} photos and AI drafts a title, category, description, and matching details for
                you to review — saves you the typing, but it&apos;s entirely optional. Prefer to do it yourself? Just
                skip this and fill in the fields below.
              </p>
            )}

            {photoPreviews.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="extra_text" className="text-xs text-muted-foreground">
                  Add details AI can&apos;t see from the photo (brand, exact size, condition...) — optional
                </Label>
                <Textarea
                  id="extra_text"
                  value={extraText}
                  onChange={(e) => setExtraText(e.target.value)}
                  placeholder="E.g. Size 42, barely worn, original box included"
                  rows={2}
                  className="text-sm"
                />
              </div>
            )}

            {photoPreviews.length > 0 && !aiResult && (
              <Button type="button" size="sm" disabled={analyzing} onClick={handleAnalyze} className="self-start gap-1.5">
                <Sparkles className="size-3.5" />
                {analyzing ? "Analyzing…" : "Analyze with AI"}
              </Button>
            )}

            {analyzeError && <p className="text-sm text-destructive">{analyzeError}</p>}

            {aiResult && (
              <div className="rounded-md border bg-background p-3 text-sm">
                <p className="text-muted-foreground">
                  Suggested category: <span className="font-medium text-foreground">{aiResult.categoryLabel}</span>
                </p>
                {aiResult.description && <p className="mt-1 text-xs text-muted-foreground">{aiResult.description}</p>}
                {aiResult.attributes && Object.keys(aiResult.attributes).length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Also filled in {Object.keys(aiResult.attributes).length} matching detail
                    {Object.keys(aiResult.attributes).length === 1 ? "" : "s"} below.
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Title, description, and details are filled in below — review them, then continue.
                </p>
                <ReportAiOutput result={aiResult} extraText={extraText} />
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">What do you want to sell?</h2>
        {carsCategory && (
          <button
            type="button"
            onClick={handleSellCar}
            className="mb-4 flex w-full items-center gap-3 rounded-lg border border-[#008200]/30 bg-[#008200]/5 p-3 text-left transition-colors hover:bg-[#008200]/10 sm:w-auto"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#008200] text-white">
              <Car className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Sell your car</span>
              <span className="block text-xs text-muted-foreground">Jump straight into the Cars category</span>
            </span>
          </button>
        )}
        <SellCarPlateModal
          open={plateModalOpen}
          onOpenChange={setPlateModalOpen}
          onUsePlate={handlePlateUsed}
          onSkip={handlePlateSkip}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <Label htmlFor="title" className="sr-only">Title</Label>
            <Input
              id="title"
              ref={titleInputRef}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setMatches(null);
              }}
              placeholder={selected === carsCategory?.id ? "E.g. 2019 Volkswagen Golf 1.5 TSI" : "Enter a title"}
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
