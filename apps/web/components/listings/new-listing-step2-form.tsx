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
  Car,
  Search,
} from "lucide-react";
import type { AttributeDef } from "@/lib/categories";
import { ANCHOR_COUNTRIES, getCurrencyForCountry } from "@/lib/countries";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/money";
import { takeListingDraft } from "@/lib/listing-draft";
import { fileToResizedBase64 } from "@/lib/image";
import { analyzeListingPhoto } from "@/app/listings/new/analyze-photo-action";
import { searchVehicleByPlate, searchVehicleByKba } from "@/app/categories/plate-lookup-action";
import { mapVehicleLookupToAttributeDefaults, vehicleLookupTitle } from "@/lib/vehicle-listing-defaults";
import { VEHICLE_REGISTRY_COUNTRIES, DEFAULT_REGISTRY_COUNTRY } from "@/lib/vehicle-registries";
import type { ListingFormState } from "@/app/listings/actions";
import { PhotoUpload } from "@/components/listings/photo-upload";
import { CharacteristicsSection } from "@/components/listings/characteristics-section";
import { CAR_ATTRIBUTE_GROUPS } from "@/lib/car-attribute-groups";
import { DeliveryOptions } from "@/components/listings/delivery-options";
import { AdvertiseTierSelector } from "@/components/listings/advertise-tier-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DescriptionEditor } from "@/components/listings/description-editor";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  categoryId: string;
  categoryPath: string[];
  title: string;
  attributes: AttributeDef[];
  action: (state: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  seller: { name: string; email: string; websiteUrl: string | null };
  initialUsesLeft: number;
  unlimited: boolean;
  plusPriceCents: number;
  premiumPriceCents: number;
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

export function NewListingStep2Form({ categoryId, categoryPath, title, attributes, action, seller, initialUsesLeft, unlimited, plusPriceCents, premiumPriceCents }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: null } as ListingFormState);
  const titleRef = useRef<HTMLInputElement>(null);

  // Picks up the AI-assist draft (if step 1's photo analysis produced one for this exact
  // title+category) — a File can't survive the route change from step 1, so its resized photo and
  // generated description were stashed in sessionStorage and get decoded back here on mount.
  const [draftPhotoFiles, setDraftPhotoFiles] = useState<File[] | undefined>(undefined);
  const [draftDescription, setDraftDescription] = useState<string | undefined>(undefined);
  const [aiAssisted, setAiAssisted] = useState(false);
  const [attributeDefaults, setAttributeDefaults] = useState<Record<string, string | string[]> | undefined>(undefined);

  useEffect(() => {
    const draft = takeListingDraft(title, categoryId);
    if (!draft) return;
    if (draft.description) {
      // One-time hydration from sessionStorage (an external system) right after mount -- the
      // textbook effect use case. Can't move to a lazy useState initializer: takeListingDraft
      // deletes the draft as a side effect, so it must run exactly once, not during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAiAssisted(true);
      setDraftDescription(draft.description);
    }
    if (draft.imageDataUrls?.length) {
      Promise.all(
        draft.imageDataUrls.map((url, i) =>
          fetch(url)
            .then((r) => r.blob())
            .then((blob) => new File([blob], `photo${i}.jpg`, { type: blob.type || "image/jpeg" })),
        ),
      )
        .then(setDraftPhotoFiles)
        .catch(() => {});
    }
    // Carried over by the step-1 AI-assist photo analysis -- already resolved to real
    // attribute_option ids server-side (lib/ai-attribute-guess.ts), same shape
    // mapVehicleLookupToAttributeDefaults below produces.
    if (draft.attributes) setAttributeDefaults(draft.attributes);
    // Carried over by the step-1 "Sell your car" plate modal -- same mapping step 2's own inline
    // plate search uses, so a plate entered at either point fills in the same fields.
    if (draft.vehicleLookup) setAttributeDefaults(mapVehicleLookupToAttributeDefaults(draft.vehicleLookup, attributes));
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
  const [usesLeft, setUsesLeft] = useState<number | null>(initialUsesLeft);

  // Plate lookup (RDW, Dutch-registered vehicles only — see lib/rdw.ts) is only useful once the
  // category actually has car-specific fields; fuel_type is only ever attached to the Cars
  // category (supabase/migrations/20260101000600_seed_attributes_mappings.sql), so its presence
  // here is a reliable "this is a car listing" signal without hardcoding a category id.
  const isCarCategory = attributes.some((a) => a.stableKey === "fuel_type");
  const [plateCountry, setPlateCountry] = useState(DEFAULT_REGISTRY_COUNTRY);
  const [plateInput, setPlateInput] = useState("");
  const [plateError, setPlateError] = useState<string | null>(null);
  const [plateSearching, startPlateSearch] = useTransition();
  const isPlateCountryKbaBased = !!VEHICLE_REGISTRY_COUNTRIES.find((c) => c.code === plateCountry)?.kbaBased;

  function handlePlateSearch() {
    setPlateError(null);
    startPlateSearch(async () => {
      const { data, error } = isPlateCountryKbaBased
        ? await searchVehicleByKba(plateInput, plateCountry)
        : await searchVehicleByPlate(plateInput, plateCountry);
      if (error || !data) {
        setPlateError(error ?? "Couldn't look up that plate.");
        return;
      }
      if (titleRef.current && !titleRef.current.value.trim()) {
        titleRef.current.value = vehicleLookupTitle(data);
      }
      setAttributeDefaults(mapVehicleLookupToAttributeDefaults(data, attributes));
    });
  }

  // Currency is an independent, explicit choice under the price field -- per explicit request, not
  // tied to country. Defaults to the initial country's currency as a sensible starting point (most
  // sellers list in their own local currency), but changing country afterward does NOT change an
  // already-selected currency; the server validates whatever is actually submitted against the real
  // currency list rather than re-deriving it (see createListing in app/listings/actions.ts).
  const [countryCode, setCountryCode] = useState(ANCHOR_COUNTRIES[0].code);
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(() => getCurrencyForCountry(ANCHOR_COUNTRIES[0].code));

  const analyzeInFlight = useRef(false);

  function analyzeFromPhotos() {
    const cover = currentPhotos[0];
    if (!cover || analyzeInFlight.current) return;
    analyzeInFlight.current = true;
    setAnalyzeError(null);
    setCategoryMismatch(null);
    startAnalyzing(async () => {
      try {
        const image = await fileToResizedBase64(cover);
        const { data, error, usesLeft: left } = await analyzeListingPhoto([image]);
        setUsesLeft(left);
        if (error || !data) {
          setAnalyzeError(error ?? "Couldn't analyze that photo.");
          return;
        }
        if (titleRef.current) titleRef.current.value = data.title;
        setAiAssisted(true);
        setDraftDescription(data.description);
        if (data.categoryId !== categoryId) setCategoryMismatch(data.categoryLabel);
        // Only applied when the AI's own category guess actually matches the category already
        // chosen on this page -- data.attributes' option ids are specific to data.categoryId's
        // attribute list, and silently applying them under a mismatched category risks a
        // same-named-but-different attribute (e.g. two categories both having a "colour" field
        // with unrelated option ids) getting a wrong default with no visible error.
        if (data.categoryId === categoryId && data.attributes) setAttributeDefaults(data.attributes);
      } catch {
        setAnalyzeError("Couldn't analyze that photo — try again.");
      } finally {
        analyzeInFlight.current = false;
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
        <SectionHeading icon={Camera}>Photos (optional, but listings with photos sell faster)</SectionHeading>
        <PhotoUpload initialFiles={draftPhotoFiles} onFilesChange={handlePhotosChange} />

        <div className="mt-4 border-t pt-4">
          <label className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={useAi}
              onChange={(e) => setUseAi(e.target.checked)}
              className="size-3.5"
            />
            Use AI to help write the title &amp; description (optional — saves you the typing)
          </label>
          {useAi && (
            <div className="flex items-start gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPhotos.length === 0 || analyzing || (!unlimited && usesLeft === 0)}
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
                {usesLeft === 0 ? (
                  <p className="mt-1 text-amber-600">
                    That was your last free AI use —{" "}
                    <Link href="/my-account/ai-features" className="underline underline-offset-2">upgrade for more</Link>.
                  </p>
                ) : usesLeft !== null && usesLeft <= 2 ? (
                  <p className="mt-1">{usesLeft} free AI {usesLeft === 1 ? "use" : "uses"} left.</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </section>

      {isCarCategory && (
        <section className={card}>
          <SectionHeading icon={Car}>Have the plate number?</SectionHeading>
          <p className="-mt-2 mb-3 text-sm text-muted-foreground">
            Looks up the official vehicle registry and fills in the title, make, model, colour, fuel type, body
            type, emission class, and every technical spec it has on file — coverage expands over time, real
            data only.
          </p>
          <div className="flex flex-wrap gap-2">
            <Select
              value={plateCountry}
              onValueChange={(v) => {
                if (!v) return;
                setPlateCountry(v);
                setPlateInput("");
                setPlateError(null);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue>{(v: string | null) => VEHICLE_REGISTRY_COUNTRIES.find((c) => c.code === v)?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_REGISTRY_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                    {!c.available && " (soon)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={plateInput}
              onChange={(e) => setPlateInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handlePlateSearch())}
              placeholder={isPlateCountryKbaBased ? "e.g. 0588 AVJ" : "e.g. TH-918-F"}
              maxLength={12}
              className={isPlateCountryKbaBased ? "max-w-48" : "max-w-48 uppercase"}
            />
            <Button type="button" variant="outline" onClick={handlePlateSearch} disabled={plateSearching || !plateInput.trim()} className="gap-1.5">
              <Search className="size-4" />
              {plateSearching ? "Looking up…" : "Look up"}
            </Button>
          </div>
          {isPlateCountryKbaBased && (
            <p className="mt-2 text-xs text-muted-foreground">
              Germany doesn&apos;t allow plate lookups — enter the HSN/TSN vehicle-type key number from your
              Fahrzeugschein instead.
            </p>
          )}
          {plateError && <p className="mt-2 text-sm text-destructive">{plateError}</p>}
          {attributeDefaults && !plateError && (
            <p className="mt-2 text-sm text-[#008848]">Filled in below — review before continuing.</p>
          )}
        </section>
      )}

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
          <DescriptionEditor
            key={draftDescription ?? "empty"}
            id="description"
            name="description"
            required
            rows={9}
            disabled={analyzing}
            defaultValue={draftDescription}
            className="text-base leading-relaxed md:text-base"
          />
          {analyzing && (
            <p className="text-xs text-muted-foreground">Description is locked while AI writes a draft — it&apos;ll unlock in a few seconds.</p>
          )}
        </div>
      </section>

      {attributes.length > 0 && <div className={card}>
        <CharacteristicsSection attributes={attributes} defaultValues={attributeDefaults} groups={isCarCategory ? CAR_ATTRIBUTE_GROUPS : undefined} />
      </div>}

      <section className={card}>
        <SectionHeading icon={Truck}>Delivery</SectionHeading>
        <DeliveryOptions currencyCode={currencyCode} />
        {/* Direct Buy (app/listings/payment-actions.ts) is real and live -- a buyer-paid
            protection fee via Stripe Connect, Terms of Service §6 -- but it's not a fund hold, and
            named carrier integration (Budbee/PostNL/DHL-style) still isn't real (agents.md §6/§10
            Phase 3). This form doesn't know this seller's own Stripe Connect onboarding status, so
            the copy stays platform-level rather than promising Direct Buy is active on this
            specific listing. */}
        <p className="mt-3 flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          Buyers can pay securely in-app with Direct Buy (once you&apos;ve set up payouts via{" "}
          <Link href="/my-account/payments/enable" className="underline">Enable payments</Link>).
          See our <Link href="/safety" className="underline">Safety Center</Link> for tips on
          trading safely either way.
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
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price">Price</Label>
            <Input id="price" name="price" type="number" min="0" step="0.01" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currency_code">Currency</Label>
            <Select name="currency_code" value={currencyCode} onValueChange={(v) => v && setCurrencyCode(v as CurrencyCode)}>
              <SelectTrigger id="currency_code" className="w-full">
                <SelectValue>{currencyCode}</SelectValue>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="country_code">Country</Label>
            <Select name="country_code" value={countryCode} onValueChange={(v) => v && setCountryCode(v)}>
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
        <AdvertiseTierSelector plusPriceCents={plusPriceCents} premiumPriceCents={premiumPriceCents} />
      </section>

      {/* Extra paid promotion add-ons (homepage feature, urgent bump) are the same Stripe-dependent
          gap as the tiers above — omitted rather than shown non-functional, since unlike the tier
          cards there's no honest "coming soon" framing that fits a per-item checkbox-with-a-price.
          (A seller's website link — a paid extra on Marktplaats — is offered free here instead,
          since there's no payment infrastructure to gate it behind; see Contact details above.) */}

      <TurnstileWidget />

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Publishing…" : "Post your ad"}
      </Button>
    </form>
  );
}
