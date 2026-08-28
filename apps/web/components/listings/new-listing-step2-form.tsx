"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Camera,
  FileText,
  Truck,
  Tag,
  UserRound,
  MapPin,
  Megaphone,
} from "lucide-react";
import type { AttributeDef } from "@/lib/categories";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { ANCHOR_COUNTRIES } from "@/lib/countries";
import { takeListingDraft } from "@/lib/listing-draft";
import { fileToResizedBase64 } from "@/lib/image";
import { analyzeListingPhoto } from "@/app/listings/new/analyze-photo-action";
import type { ListingFormState } from "@/app/listings/actions";
import { PhotoUpload } from "@/components/listings/photo-upload";
import { CharacteristicsSection } from "@/components/listings/characteristics-section";
import { DeliveryOptions } from "@/components/listings/delivery-options";
import { AdvertiseTierSelector } from "@/components/listings/advertise-tier-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  categoryId: string;
  categoryPath: string[];
  title: string;
  attributes: AttributeDef[];
  action: (state: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  seller: { name: string; email: string; websiteUrl: string | null };
};

function SectionHeading({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      {children}
    </h2>
  );
}

export function NewListingStep2Form({ categoryId, categoryPath, title, attributes, action, seller }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null } as ListingFormState);
  const titleRef = useRef<HTMLInputElement>(null);

  // Picks up the AI-assist draft (if step 1's photo analysis produced one for this exact
  // title+category) — a File can't survive the route change from step 1, so its resized photo and
  // generated description were stashed in sessionStorage and get decoded back here on mount.
  const [draftPhotoFiles, setDraftPhotoFiles] = useState<File[] | undefined>(undefined);
  const [draftDescription, setDraftDescription] = useState<string | undefined>(undefined);
  const [aiAssisted, setAiAssisted] = useState(false);

  useEffect(() => {
    const draft = takeListingDraft(title, categoryId);
    if (!draft) return;
    setAiAssisted(true);
    if (draft.description) setDraftDescription(draft.description);
    fetch(draft.imageDataUrl)
      .then((r) => r.blob())
      .then((blob) => setDraftPhotoFiles([new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" })]))
      .catch(() => {});
    // title/categoryId are the args this hand-off is keyed to, not reactive deps to re-run on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Covers the case where someone lands on step 2 without ever touching step 1's AI assist — picked
  // a category manually, then uploaded photos directly here. This offers the same real analysis
  // (not a different, fake version of it) against whatever the current cover photo is.
  const [useAi, setUseAi] = useState(true);
  const [currentPhotos, setCurrentPhotos] = useState<File[]>([]);
  const handlePhotosChange = useCallback((files: File[]) => setCurrentPhotos(files), []);
  const [analyzing, startAnalyzing] = useTransition();
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [categoryMismatch, setCategoryMismatch] = useState<string | null>(null);

  function analyzeFromPhotos() {
    const cover = currentPhotos[0];
    if (!cover) return;
    setAnalyzeError(null);
    setCategoryMismatch(null);
    startAnalyzing(async () => {
      try {
        const { base64, mediaType } = await fileToResizedBase64(cover);
        const { data, error } = await analyzeListingPhoto(base64, mediaType);
        if (error || !data) {
          setAnalyzeError(error ?? "Couldn't analyze that photo.");
          return;
        }
        if (titleRef.current) titleRef.current.value = data.title;
        setAiAssisted(true);
        setDraftDescription(data.description);
        if (data.categoryId !== categoryId) setCategoryMismatch(data.categoryLabel);
      } catch {
        setAnalyzeError("Couldn't analyze that photo — try again.");
      }
    });
  }

  const card = "rounded-xl border bg-card p-5 shadow-sm";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="category_id" value={categoryId} />

      <div className={`flex items-start justify-between gap-4 ${card} bg-primary/5`}>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Chosen category</p>
          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm font-medium">
            {categoryPath.map((name, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
                {name}
              </span>
            ))}
          </div>
          <Link href="/listings/new" className="mt-1 inline-block text-xs text-muted-foreground underline hover:text-foreground">
            Change
          </Link>
        </div>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={pending}
          className="shrink-0 gap-1.5 text-xs whitespace-nowrap"
        >
          <CheckCircle2 className="size-4" />
          Post your free ad
        </Button>
      </div>

      <section className={card}>
        <SectionHeading icon={Camera}>Photos</SectionHeading>
        <PhotoUpload initialFiles={draftPhotoFiles} onFilesChange={handlePhotosChange} />

        <div className="mt-4 border-t pt-4">
          <label className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={useAi}
              onChange={(e) => setUseAi(e.target.checked)}
              className="size-3.5"
            />
            Use AI to help write the title &amp; description
          </label>
          {useAi && (
            <div className="flex items-start gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPhotos.length === 0 || analyzing}
                onClick={analyzeFromPhotos}
                className="shrink-0 gap-1.5"
              >
                <Sparkles className="size-4 text-primary" />
                {analyzing ? "Analyzing…" : "Fill in title & description with AI"}
              </Button>
              <div className="pt-1 text-xs text-muted-foreground">
                {analyzing && "Looking at your cover photo…"}
                {!analyzing && analyzeError && <span className="text-destructive">{analyzeError}</span>}
                {!analyzing && !analyzeError && currentPhotos.length === 0 && "Add a photo first, then let AI draft the title and description for you."}
                {!analyzing && !analyzeError && currentPhotos.length > 0 && "Uses your cover photo (the first one above)."}
                {categoryMismatch && (
                  <p className="mt-1">
                    This might fit better under <span className="font-medium text-foreground">{categoryMismatch}</span> —{" "}
                    <Link href="/listings/new" className="underline">change category</Link>.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className={`${card} flex flex-col gap-4`}>
        <SectionHeading icon={FileText}>Details</SectionHeading>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input ref={titleRef} id="title" name="title" required maxLength={160} defaultValue={title} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="description">Description</Label>
            {aiAssisted && draftDescription && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="size-3 text-primary" />
                AI-generated — please review
              </span>
            )}
          </div>
          {/* key forces a remount once the async sessionStorage read resolves, so defaultValue
              (uncontrolled, matching every other field in this form) actually takes effect —
              React only applies defaultValue on first mount, and that read can't finish
              synchronously before this first renders. */}
          <Textarea
            key={draftDescription ?? "empty"}
            id="description"
            name="description"
            required
            rows={6}
            defaultValue={draftDescription}
            className="text-base leading-relaxed md:text-base"
          />
        </div>
      </section>

      {attributes.length > 0 && <div className={card}>
        <CharacteristicsSection attributes={attributes} />
      </div>}

      <section className={card}>
        <SectionHeading icon={Truck}>Delivery</SectionHeading>
        <DeliveryOptions />
        {/* Buyer-protection escrow and named carrier integration (Budbee/PostNL/DHL-style)
            aren't real yet — both need Stripe Connect + a logistics partner (agents.md §6/§10
            Phase 3). Showing a safety-tips link instead of an escrow claim we can't back is the
            honest version of this section for now. */}
        <p className="mt-3 flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          Buyer protection isn&apos;t available yet — see our{" "}
          <Link href="/safety" className="underline">Safety Center</Link> for tips on trading safely
          in the meantime.
        </p>
      </section>

      <section className={card}>
        <SectionHeading icon={Tag}>Price</SectionHeading>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price_type">Price type</Label>
          <Select name="price_type" defaultValue="fixed">
            <SelectTrigger id="price_type" className="w-full sm:w-56">
              <SelectValue>{(v: string | null) => (v === "bidding" ? "Accepting offers" : "Fixed price")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed price</SelectItem>
              <SelectItem value="bidding">Accepting offers</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price">Price</Label>
            <Input id="price" name="price" type="number" min="0" step="0.01" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currency_code">Currency</Label>
            <Select name="currency_code" defaultValue={SUPPORTED_CURRENCIES[0]}>
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
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" name="offers_allowed" defaultChecked />
          Allow buyers to make offers
        </label>
      </section>

      <section className={card}>
        <SectionHeading icon={UserRound}>Contact details</SectionHeading>
        <p className="text-sm text-muted-foreground">Buyers will see you as</p>
        <p className="text-sm font-medium">{seller.name}</p>
        <p className="mt-2 text-sm text-muted-foreground">Your email (not shown publicly)</p>
        <p className="text-sm font-medium">{seller.email}</p>
        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="website_url">Website (optional)</Label>
          <Input id="website_url" name="website_url" type="text" placeholder="yourshop.com" defaultValue={seller.websiteUrl ?? ""} />
          <p className="text-xs text-muted-foreground">Shown as a &quot;Visit website&quot; link on all of your listings, not just this one.</p>
        </div>
      </section>

      <section className={card}>
        <SectionHeading icon={MapPin}>Location</SectionHeading>
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
        <div className="mt-4 flex flex-col gap-1.5 sm:w-1/2 sm:pr-2">
          <Label htmlFor="postal_code">Postal code (optional)</Label>
          <Input id="postal_code" name="postal_code" />
        </div>
      </section>

      <section className={card}>
        <SectionHeading icon={Megaphone}>How do you want to advertise?</SectionHeading>
        <p className="mb-3 -mt-2 text-sm text-muted-foreground">Choose a plan that fits your selling needs.</p>
        <AdvertiseTierSelector />
      </section>

      {/* Extra paid promotion add-ons (homepage feature, urgent bump) are the same Stripe-dependent
          gap as the tiers above — omitted rather than shown non-functional, since unlike the tier
          cards there's no honest "coming soon" framing that fits a per-item checkbox-with-a-price.
          (A seller's website link — a paid extra on Marktplaats — is offered free here instead,
          since there's no payment infrastructure to gate it behind; see Contact details above.) */}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Publishing…" : "Post your ad"}
      </Button>
    </form>
  );
}
