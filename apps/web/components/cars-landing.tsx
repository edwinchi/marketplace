import Link from "next/link";
import { Car, Zap, Clock3, Sparkle, Bus, ShieldCheck, HandCoins, Gauge, FileText, Receipt, ClipboardCheck, X } from "lucide-react";
import { CarsSearchResults } from "@/components/cars-search-results";
import { CarsBrandGrid } from "@/components/cars-brand-grid";
import type { CarsListing, CarsFilters } from "@/lib/cars-landing";
import { cn } from "@/lib/utils";

type SubCategory = { id: string; name: string; stableKey: string };

type Props = {
  carsRootId: string;
  subcategories: SubCategory[];
  listings: CarsListing[];
  totalMatches: number;
  totalUnfiltered: number;
  page: number;
  totalPages: number;
  brandCounts: Map<string, number>;
  fuelTypeCounts: Map<string, number>;
  transmissionCounts: Map<string, number>;
  conditionCounts: Map<string, number>;
  sellerTypeCounts: Map<string, number>;
  cities: string[];
  browseMakes: { id: string; name: string }[];
  favoritedIds: Set<string>;
  signedIn: boolean;
  filters: CarsFilters;
  totalActiveCount: number;
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "cars-passenger-cars": Car,
  "cars-electric-cars": Zap,
  "cars-classic-cars": Clock3,
  "cars-convertibles": Sparkle,
  "cars-suvs-and-crossovers": Gauge,
  "cars-vans-and-commercial-vehicles": Bus,
};

function buildQuery(base: CarsFilters, overrides: Partial<CarsFilters & { type: string | undefined }>) {
  const merged = { ...base, ...overrides };
  const params = new URLSearchParams();
  if (merged.type) params.set("type", merged.type);
  if (merged.brand) params.set("brand", merged.brand);
  if (merged.city) params.set("city", merged.city);
  if (merged.priceMin != null) params.set("priceMin", String(merged.priceMin));
  if (merged.priceMax != null) params.set("priceMax", String(merged.priceMax));
  if (merged.yearMin != null) params.set("yearMin", String(merged.yearMin));
  if (merged.yearMax != null) params.set("yearMax", String(merged.yearMax));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function CarsLanding({
  carsRootId,
  subcategories,
  listings,
  totalMatches,
  totalUnfiltered,
  page,
  totalPages,
  brandCounts,
  fuelTypeCounts,
  transmissionCounts,
  conditionCounts,
  sellerTypeCounts,
  cities,
  browseMakes,
  favoritedIds,
  signedIn,
  filters,
  totalActiveCount,
}: Props) {
  const basePath = `/categories/${carsRootId}`;

  return (
    <div className="w-full">
      {/* Hero — an angled two-tone band evokes the reference's diagonal cut, using the brand's
          own navy/orange rather than copying Marktplaats' beige. */}
      <div className="relative overflow-hidden bg-[#082040]">
        <div
          className="absolute inset-y-0 right-0 w-2/3 bg-gradient-to-br from-[#e89818] via-[#f2ad3d] to-[#008848]/80"
          style={{ clipPath: "polygon(35% 0, 100% 0, 100% 100%, 0% 100%)" }}
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h1 className="max-w-xl text-3xl font-bold text-white sm:text-4xl">Buy a used or new car</h1>
          <p className="mt-3 max-w-lg text-sm text-white/80 sm:text-base">
            Practical, sporty, or electric — browse real listings from private sellers and dealers across the
            continent, or list your own car for free in minutes.
          </p>
          <p className="mt-4 text-sm font-medium text-white/90">
            {totalActiveCount > 0
              ? `${totalActiveCount} ${totalActiveCount === 1 ? "car" : "cars"} available right now`
              : "Be the first to list a car"}
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Floating filter card, overlapping the hero like the reference's search panel. */}
        <form
          action={basePath}
          className="relative -mt-8 rounded-2xl border bg-card p-5 shadow-lg ring-1 ring-black/5 sm:-mt-10 sm:p-6"
        >
          <div className="flex flex-wrap gap-2">
            <Link
              href={basePath + buildQuery(filters, { type: undefined })}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150 hover:-translate-y-0.5",
                !filters.type ? "border-[#e89818] bg-[#e89818]/10 text-[#082040]" : "text-muted-foreground hover:border-foreground/30",
              )}
            >
              All types
            </Link>
            {subcategories.map((sub) => {
              const Icon = TYPE_ICONS[sub.stableKey] ?? Car;
              const active = filters.type === sub.id;
              return (
                <Link
                  key={sub.id}
                  href={basePath + buildQuery(filters, { type: sub.id })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150 hover:-translate-y-0.5",
                    active ? "border-[#e89818] bg-[#e89818]/10 text-[#082040]" : "text-muted-foreground hover:border-foreground/30",
                  )}
                >
                  <Icon className="size-3.5" />
                  {sub.name}
                </Link>
              );
            })}
          </div>

          <input type="hidden" name="type" value={filters.type ?? ""} />

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Brand</span>
              <select
                name="brand"
                defaultValue={filters.brand ?? ""}
                className="h-9 rounded-md border bg-background px-2 text-sm transition-colors focus:border-[#e89818] focus:outline-none"
              >
                <option value="">All brands</option>
                {browseMakes.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">City</span>
              <select
                name="city"
                defaultValue={filters.city ?? ""}
                className="h-9 rounded-md border bg-background px-2 text-sm transition-colors focus:border-[#e89818] focus:outline-none"
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Max price</span>
              <input
                type="number"
                name="priceMax"
                min="0"
                defaultValue={filters.priceMax ?? ""}
                placeholder="Any"
                className="h-9 rounded-md border bg-background px-2 text-sm transition-colors focus:border-[#e89818] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Year (from)</span>
              <input
                type="number"
                name="yearMin"
                min="1950"
                max="2030"
                defaultValue={filters.yearMin ?? ""}
                placeholder="Any"
                className="h-9 rounded-md border bg-background px-2 text-sm transition-colors focus:border-[#e89818] focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            {(filters.type || filters.brand || filters.city || filters.priceMax != null || filters.yearMin != null) && (
              <Link
                href={basePath}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3.5" /> Clear
              </Link>
            )}
            <button
              type="submit"
              className="rounded-lg bg-[#082040] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#0a2a54]"
            >
              Search {listings.length > 0 ? `(${listings.length})` : ""}
            </button>
          </div>
        </form>

        {/* Quick-filter tiles */}
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Find what suits you</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {subcategories.map((sub) => {
              const Icon = TYPE_ICONS[sub.stableKey] ?? Car;
              return (
                <Link
                  key={sub.id}
                  href={`/categories/${sub.id}`}
                  className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#e89818]/50 hover:shadow-md"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-[#e89818]/10 text-[#e89818] transition-transform duration-200 group-hover:scale-110">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-xs font-medium sm:text-sm">{sub.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Search results — sidebar facets + rich result cards */}
        <CarsSearchResults
          carsRootId={carsRootId}
          subcategories={subcategories}
          listings={listings}
          totalMatches={totalMatches}
          totalUnfiltered={totalUnfiltered}
          page={page}
          totalPages={totalPages}
          brandCounts={brandCounts}
          fuelTypeCounts={fuelTypeCounts}
          transmissionCounts={transmissionCounts}
          conditionCounts={conditionCounts}
          sellerTypeCounts={sellerTypeCounts}
          favoritedIds={favoritedIds}
          signedIn={signedIn}
          filters={filters}
        />

        {/* Buying / selling tips — real, static guidance, not a fabricated "AI-powered" claim */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <ShieldCheck className="mb-2 size-6 text-[#008848]" />
            <h3 className="font-semibold">Inspect before you commit</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Check the odometer reading, service history, and registration documents in person, and take a test
              drive, before agreeing on a price.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <HandCoins className="mb-2 size-6 text-[#e89818]" />
            <h3 className="font-semibold">Compare before you offer</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse a few similar listings — same make, model, year, and condition — to get a feel for a fair
              price before making an offer.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <Gauge className="mb-2 size-6 text-[#082040]" />
            <h3 className="font-semibold">Meet safely</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Meet in a public place, bring someone with you, and never send money before seeing the car. See our{" "}
              <Link href="/safety" className="text-[#e89818] hover:underline">Safety Center</Link> for more.
            </p>
          </div>
        </div>

        {/* Free document templates — real, AfroDeals-branded, no fake paywall */}
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Free templates for your sale</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link
              href="/documents/car-sale-agreement"
              className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#e89818]/50 hover:shadow-md"
            >
              <FileText className="size-8 shrink-0 text-[#082040] transition-transform duration-200 group-hover:scale-110" />
              <div>
                <p className="text-sm font-semibold">Sale agreement</p>
                <p className="text-xs text-muted-foreground">Fill-in-the-blanks template for both sides to sign</p>
              </div>
            </Link>
            <Link
              href="/documents/car-sale-receipt"
              className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#e89818]/50 hover:shadow-md"
            >
              <Receipt className="size-8 shrink-0 text-[#008848] transition-transform duration-200 group-hover:scale-110" />
              <div>
                <p className="text-sm font-semibold">Payment receipt</p>
                <p className="text-xs text-muted-foreground">Simple proof of payment for handover day</p>
              </div>
            </Link>
            <Link
              href="/documents/buying-checklist"
              className="group flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#e89818]/50 hover:shadow-md"
            >
              <ClipboardCheck className="size-8 shrink-0 text-[#e89818] transition-transform duration-200 group-hover:scale-110" />
              <div>
                <p className="text-sm font-semibold">Buying checklist</p>
                <p className="text-xs text-muted-foreground">What to check before you commit</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Browse by city — real cities actually represented among Cars listings. The quick-filter
            dropdown above gets every one of them; this grid caps its own display at 33 so it stays
            tidy as more listings land in more cities. */}
        {cities.length > 0 && (
          <div className="mt-12 mb-4 rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold">Discover used and new cars in these locations:</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
              {cities.slice(0, 33).map((city) => (
                <Link
                  key={city}
                  href={basePath + buildQuery(filters, { city })}
                  className={cn(
                    "text-sm transition-colors duration-150 hover:text-[#082040] hover:underline",
                    filters.city === city ? "font-semibold text-[#e89818]" : "text-[#e89818]/90",
                  )}
                >
                  Cars in {city}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Browse by brand — the real vehicle_makes reference list, all 90, with show-more */}
        {browseMakes.length > 0 && (
          <div className="mt-12 mb-16">
            <h2 className="mb-3 text-lg font-semibold">Browse by brand</h2>
            <CarsBrandGrid
              makes={browseMakes.map((make) => ({
                id: make.id,
                name: make.name,
                href: basePath + buildQuery(filters, { brand: make.name }),
                active: filters.brand === make.name,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
