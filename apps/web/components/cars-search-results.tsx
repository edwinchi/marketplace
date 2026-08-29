import Link from "next/link";
import { cookies } from "next/headers";
import { Car, Calendar, Fuel, Cog, Gauge as GaugeIcon, MapPin, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import type { CarsListing, CarsFilters } from "@/lib/cars-landing";
import { DISPLAY_CURRENCY_COOKIE } from "@/lib/money";
import { getExchangeRates } from "@/lib/exchange-rates";
import { resolveMediaUrl } from "@/lib/media";
import { Price } from "@/components/price";
import { FavoriteButton } from "@/components/favorite-button";
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
  favoritedIds: Set<string>;
  signedIn: boolean;
  filters: CarsFilters;
};

function buildQuery(base: CarsFilters, overrides: Partial<CarsFilters>) {
  const merged = { ...base, ...overrides, page: overrides.page ?? undefined };
  const params = new URLSearchParams();
  if (merged.type) params.set("type", merged.type);
  if (merged.brand) params.set("brand", merged.brand);
  if (merged.city) params.set("city", merged.city);
  if (merged.priceMin != null) params.set("priceMin", String(merged.priceMin));
  if (merged.priceMax != null) params.set("priceMax", String(merged.priceMax));
  if (merged.yearMin != null) params.set("yearMin", String(merged.yearMin));
  if (merged.yearMax != null) params.set("yearMax", String(merged.yearMax));
  if (merged.mileageMin != null) params.set("mileageMin", String(merged.mileageMin));
  if (merged.mileageMax != null) params.set("mileageMax", String(merged.mileageMax));
  for (const f of merged.fuelType ?? []) params.append("fuelType", f);
  for (const t of merged.transmission ?? []) params.append("transmission", t);
  for (const c of merged.condition ?? []) params.append("condition", c);
  if (merged.sellerType) params.set("sellerType", merged.sellerType);
  if (merged.priceType) params.set("priceType", merged.priceType);
  if (merged.page) params.set("page", String(merged.page));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function CheckboxRow({
  name,
  value,
  label,
  count,
  checked,
}: {
  name: string;
  value: string;
  label: string;
  count: number;
  checked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-1 text-sm">
      <span className="flex items-center gap-2">
        <input type="checkbox" name={name} value={value} defaultChecked={checked} className="size-4 rounded border-foreground/30 accent-[#e89818]" />
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </label>
  );
}

function RadioRow({ name, value, label, count, checked }: { name: string; value: string; label: string; count: number; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-1 text-sm">
      <span className="flex items-center gap-2">
        <input type="radio" name={name} value={value} defaultChecked={checked} className="size-4 accent-[#e89818]" />
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </label>
  );
}

async function CarResultCard({ listing, favorited, signedIn }: { listing: CarsListing; favorited: boolean; signedIn: boolean }) {
  const cookieStore = await cookies();
  const displayCurrency = cookieStore.get(DISPLAY_CURRENCY_COOKIE)?.value ?? null;
  const rates = displayCurrency ? await getExchangeRates() : null;
  const imageUrl = listing.photoStorageKey ? resolveMediaUrl(listing.photoStorageKey, process.env.NEXT_PUBLIC_SUPABASE_URL!) : null;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex gap-4 border-b py-4 transition-colors first:pt-0 last:border-b-0 hover:bg-accent/30"
    >
      <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground sm:size-36">
        <FavoriteButton listingId={listing.id} initialFavorited={favorited} signedIn={signedIn} />
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- fixed small thumbnail, not worth next/image's overhead here
          <img src={imageUrl} alt={listing.title} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <Car className="size-8" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div>
          <p className="font-medium text-foreground group-hover:text-[#082040]">{listing.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {listing.year && (
              <span className="flex items-center gap-1"><Calendar className="size-3.5" />{listing.year}</span>
            )}
            {listing.mileage != null && (
              <span className="flex items-center gap-1"><GaugeIcon className="size-3.5" />{listing.mileage.toLocaleString()} km</span>
            )}
            {listing.fuelType && (
              <span className="flex items-center gap-1"><Fuel className="size-3.5" />{listing.fuelType}</span>
            )}
            {listing.transmission && (
              <span className="flex items-center gap-1"><Cog className="size-3.5" />{listing.transmission}</span>
            )}
          </div>
          {listing.price_type === "bidding" && (
            <span className="mt-1.5 inline-block rounded-full bg-[#008848]/10 px-2 py-0.5 text-[11px] font-medium text-[#008848]">
              Open to offers
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 text-xs text-muted-foreground">
            <p className="truncate font-medium text-foreground/80">{listing.seller.name}</p>
            <span className="flex items-center gap-1">
              {listing.city && (<><MapPin className="size-3" />{listing.city}</>)}
            </span>
            {listing.seller.websiteUrl && (
              <a
                href={listing.seller.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 flex items-center gap-1 text-[#e89818] hover:underline"
              >
                <Globe className="size-3" />Visit website
              </a>
            )}
          </div>
          <p className="shrink-0 text-base font-bold whitespace-nowrap">
            <Price minorUnits={listing.price_minor ?? 0} currency={listing.currency_code} displayCurrency={displayCurrency} rates={rates?.rates ?? null} />
          </p>
        </div>
      </div>
    </Link>
  );
}

export function CarsSearchResults({
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
  favoritedIds,
  signedIn,
  filters,
}: Props) {
  const basePath = `/categories/${carsRootId}`;
  const filtered = !!(filters.type || filters.brand || filters.city || filters.priceMin || filters.priceMax || filters.yearMin || filters.yearMax || filters.mileageMin || filters.mileageMax || filters.fuelType?.length || filters.transmission?.length || filters.condition?.length || filters.sellerType || filters.priceType);

  const sortedBrands = [...brandCounts.entries()].sort((a, b) => b[1] - a[1]);
  const visibleBrands = sortedBrands.slice(0, 6);
  const extraBrands = sortedBrands.slice(6);

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{filtered ? "Search results" : "Recent listings"}</h2>
        <p className="text-sm text-muted-foreground">
          {totalMatches} {totalMatches === 1 ? "car" : "cars"}{filtered ? ` of ${totalUnfiltered}` : ""}
        </p>
      </div>

      <form action={basePath} className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        {/* Preserve every filter this form doesn't itself render an input for */}
        {filters.type && <input type="hidden" name="type" value={filters.type} />}
        {filters.city && <input type="hidden" name="city" value={filters.city} />}

        <aside className="flex flex-col gap-5 lg:sticky lg:top-4 lg:self-start">
          {sortedBrands.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold text-[#082040]">Brand</h3>
              <RadioRow name="brand" value="" label="All brands" count={totalUnfiltered} checked={!filters.brand} />
              {visibleBrands.map(([brand, count]) => (
                <RadioRow key={brand} name="brand" value={brand} label={brand} count={count} checked={filters.brand === brand} />
              ))}
              {extraBrands.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs font-medium text-[#e89818]">Show {extraBrands.length} more</summary>
                  <div className="mt-1">
                    {extraBrands.map(([brand, count]) => (
                      <RadioRow key={brand} name="brand" value={brand} label={brand} count={count} checked={filters.brand === brand} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold text-[#082040]">Body type</h3>
            <div className="grid grid-cols-3 gap-2">
              {subcategories.map((sub) => (
                <label
                  key={sub.id}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-2 text-center text-[11px] transition-colors",
                    filters.type === sub.id ? "border-[#e89818] bg-[#e89818]/10 text-[#082040]" : "text-muted-foreground hover:border-foreground/30",
                  )}
                >
                  <input type="radio" name="type" value={sub.id} defaultChecked={filters.type === sub.id} className="sr-only" />
                  <Car className="size-4" />
                  {sub.name}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold text-[#082040]">Price</h3>
            <div className="flex items-center gap-2">
              <input type="number" name="priceMin" min="0" defaultValue={filters.priceMin ?? ""} placeholder="From" className="h-9 w-full rounded-md border bg-background px-2 text-sm focus:border-[#e89818] focus:outline-none" />
              <span className="text-muted-foreground">–</span>
              <input type="number" name="priceMax" min="0" defaultValue={filters.priceMax ?? ""} placeholder="To" className="h-9 w-full rounded-md border bg-background px-2 text-sm focus:border-[#e89818] focus:outline-none" />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold text-[#082040]">Year</h3>
            <div className="flex items-center gap-2">
              <input type="number" name="yearMin" min="1950" max="2030" defaultValue={filters.yearMin ?? ""} placeholder="From" className="h-9 w-full rounded-md border bg-background px-2 text-sm focus:border-[#e89818] focus:outline-none" />
              <span className="text-muted-foreground">–</span>
              <input type="number" name="yearMax" min="1950" max="2030" defaultValue={filters.yearMax ?? ""} placeholder="To" className="h-9 w-full rounded-md border bg-background px-2 text-sm focus:border-[#e89818] focus:outline-none" />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold text-[#082040]">Mileage (km)</h3>
            <div className="flex items-center gap-2">
              <input type="number" name="mileageMin" min="0" defaultValue={filters.mileageMin ?? ""} placeholder="From" className="h-9 w-full rounded-md border bg-background px-2 text-sm focus:border-[#e89818] focus:outline-none" />
              <span className="text-muted-foreground">–</span>
              <input type="number" name="mileageMax" min="0" defaultValue={filters.mileageMax ?? ""} placeholder="To" className="h-9 w-full rounded-md border bg-background px-2 text-sm focus:border-[#e89818] focus:outline-none" />
            </div>
          </div>

          {fuelTypeCounts.size > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-1 text-sm font-semibold text-[#082040]">Fuel type</h3>
              {[...fuelTypeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([fuel, count]) => (
                <CheckboxRow key={fuel} name="fuelType" value={fuel} label={fuel} count={count} checked={filters.fuelType?.includes(fuel) ?? false} />
              ))}
            </div>
          )}

          {transmissionCounts.size > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-1 text-sm font-semibold text-[#082040]">Transmission</h3>
              {[...transmissionCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t, count]) => (
                <CheckboxRow key={t} name="transmission" value={t} label={t} count={count} checked={filters.transmission?.includes(t) ?? false} />
              ))}
            </div>
          )}

          {conditionCounts.size > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-1 text-sm font-semibold text-[#082040]">Condition</h3>
              {[...conditionCounts.entries()].sort((a, b) => b[1] - a[1]).map(([c, count]) => (
                <CheckboxRow key={c} name="condition" value={c} label={c} count={count} checked={filters.condition?.includes(c) ?? false} />
              ))}
            </div>
          )}

          {sellerTypeCounts.size > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-1 text-sm font-semibold text-[#082040]">Seller</h3>
              <RadioRow name="sellerType" value="" label="All sellers" count={totalUnfiltered} checked={!filters.sellerType} />
              {[...sellerTypeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <RadioRow key={type} name="sellerType" value={type} label={type === "private" ? "Private" : "Business"} count={count} checked={filters.sellerType === type} />
              ))}
            </div>
          )}

          <button type="submit" className="rounded-lg bg-[#082040] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#0a2a54]">
            Apply filters
          </button>
          {filtered && (
            <Link href={basePath} className="text-center text-xs text-muted-foreground hover:text-foreground hover:underline">
              Clear all filters
            </Link>
          )}
        </aside>

        <div>
          {listings.length > 0 ? (
            <div className="rounded-xl border bg-card px-4">
              {listings.map((listing) => (
                <CarResultCard key={listing.id} listing={listing} favorited={favoritedIds.has(listing.id)} signedIn={signedIn} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
              <Car className="size-10 text-muted-foreground" />
              <p className="font-medium">No cars match yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">Try clearing a filter, or check back soon — new listings are added all the time.</p>
              <Link href={basePath} className="mt-2 text-sm font-medium text-[#e89818] hover:underline">Clear filters</Link>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Link
                href={basePath + buildQuery(filters, { page: Math.max(1, page - 1) })}
                aria-disabled={page <= 1}
                className={cn("flex size-8 items-center justify-center rounded-md border transition-colors", page <= 1 ? "pointer-events-none opacity-40" : "hover:border-[#e89818]/50")}
              >
                <ChevronLeft className="size-4" />
              </Link>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map((p) => (
                <Link
                  key={p}
                  href={basePath + buildQuery(filters, { page: p })}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md border text-sm transition-colors",
                    p === page ? "border-[#e89818] bg-[#e89818]/10 font-semibold text-[#082040]" : "hover:border-[#e89818]/50",
                  )}
                >
                  {p}
                </Link>
              ))}
              <Link
                href={basePath + buildQuery(filters, { page: Math.min(totalPages, page + 1) })}
                aria-disabled={page >= totalPages}
                className={cn("flex size-8 items-center justify-center rounded-md border transition-colors", page >= totalPages ? "pointer-events-none opacity-40" : "hover:border-[#e89818]/50")}
              >
                <ChevronRight className="size-4" />
              </Link>
              <span className="ml-2 text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
