"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { searchVehicleByPlate, searchVehicleByKba } from "@/app/categories/plate-lookup-action";
import type { VehicleLookupResult } from "@/lib/rdw";
import { VEHICLE_REGISTRY_COUNTRIES, DEFAULT_REGISTRY_COUNTRY } from "@/lib/vehicle-registries";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// The "Sell your car" step-1 shortcut's plate-entry step -- mirrors the immediate plate-modal UX
// real listing sites use for this exact shortcut, rather than only offering the plate lookup
// buried further down step 2's own "Have the plate number?" section (still there for anyone who
// skips this or picks Cars manually). Reuses the exact same server actions and result mapping
// (lib/vehicle-listing-defaults.ts) as that section, so a plate entered here or there fills in
// identical fields.
export function SellCarPlateModal({
  open,
  onOpenChange,
  onUsePlate,
  onSkip,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUsePlate: (result: VehicleLookupResult) => void;
  onSkip: () => void;
}) {
  const [country, setCountry] = useState(DEFAULT_REGISTRY_COUNTRY);
  const [plate, setPlate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedCountry = VEHICLE_REGISTRY_COUNTRIES.find((c) => c.code === country);
  const isKbaBased = !!selectedCountry?.kbaBased;

  function handleUsePlate() {
    if (!plate.trim()) {
      setError("Enter your license plate, or skip this step.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const { data, error: err } = isKbaBased ? await searchVehicleByKba(plate, country) : await searchVehicleByPlate(plate, country);
      if (err || !data) {
        setError(err ?? "Couldn't look up that plate.");
        return;
      }
      onUsePlate(data);
    });
  }

  function reset() {
    setPlate("");
    setError(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter your license plate</DialogTitle>
          <DialogDescription>
            We&apos;ll look up your car in the official vehicle registry and fill in the make, model, and specs
            for you. Or skip and enter everything yourself.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Select
            value={country}
            onValueChange={(v) => {
              if (!v) return;
              setCountry(v);
              setPlate("");
              setError(null);
            }}
          >
            <SelectTrigger className="w-full">
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

          {/* A generic EU-style plate: a dark country band plus a bold monospace plate body --
              recognizable at a glance as "this is a license plate field", not a copy of any one
              country's specific plate colours (which would be wrong for every country but that one). */}
          <div className="flex overflow-hidden rounded-md border-2 border-foreground/20">
            <span className="flex w-12 shrink-0 items-center justify-center bg-[#082040] text-xs font-bold text-white">
              {country}
            </span>
            <input
              value={plate}
              onChange={(e) => {
                setPlate(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleUsePlate()}
              placeholder={isKbaBased ? "e.g. 0588 AVJ" : "e.g. TH-918-F"}
              maxLength={12}
              autoFocus
              className={`w-full bg-[#f5d90a] px-3 py-2.5 text-center text-lg font-bold tracking-widest text-[#082040] outline-none placeholder:text-[#082040]/40 ${isKbaBased ? "" : "uppercase"}`}
            />
          </div>
          {isKbaBased && (
            <p className="-mt-1 text-xs text-muted-foreground">
              Germany doesn&apos;t allow plate lookups — enter the HSN/TSN vehicle-type key number from your
              Fahrzeugschein (vehicle registration document) instead.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="mt-1 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onSkip} disabled={pending}>
              Skip
            </Button>
            <Button type="button" onClick={handleUsePlate} disabled={pending} className="gap-1.5">
              <Search className="size-4" />
              {pending ? "Looking up…" : "Use plate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
