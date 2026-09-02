"use client";

import { useState, useTransition } from "react";
import { Search, Car, Gauge, Palette, Fuel, DoorOpen, Users, ShieldCheck } from "lucide-react";
import { searchVehicleByPlate } from "@/app/categories/plate-lookup-action";
import type { VehicleLookupResult } from "@/lib/rdw";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function formatPlate(plate: string) {
  // Purely cosmetic — RDW itself is dash-agnostic, this just echoes back the conventional Dutch
  // display grouping (XX-999-X) for whatever length plate came back, best-effort.
  if (plate.length !== 6) return plate;
  return `${plate.slice(0, 2)}-${plate.slice(2, 5)}-${plate.slice(5)}`;
}

function Field({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  );
}

export function PlateLookup() {
  const [plate, setPlate] = useState("");
  const [result, setResult] = useState<VehicleLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSearch() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const { data, error: err } = await searchVehicleByPlate(plate);
      if (err) setError(err);
      else setResult(data);
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Car className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Look up a car by its license plate</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Checks the Dutch vehicle registry (RDW) — works for Dutch-registered plates only.
      </p>
      <div className="flex gap-2">
        <Input
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="e.g. TH-918-F"
          maxLength={12}
          className="max-w-48 uppercase"
        />
        <Button type="button" onClick={handleSearch} disabled={pending || !plate.trim()} className="gap-1.5">
          <Search className="size-4" />
          {pending ? "Searching…" : "Search"}
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {result && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg border bg-muted/30 p-4">
          <div className="mb-1 flex items-baseline justify-between">
            <p className="font-semibold">
              {result.make} {result.model}
            </p>
            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
              {formatPlate(result.plate)}
            </span>
          </div>
          <Field icon={Car} label="Type" value={result.vehicleType || "—"} />
          <Field icon={Palette} label="Colour" value={result.color || "—"} />
          {result.fuelType && <Field icon={Fuel} label="Fuel" value={result.fuelType} />}
          {result.doors != null && <Field icon={DoorOpen} label="Doors" value={String(result.doors)} />}
          {result.seats != null && <Field icon={Users} label="Seats" value={String(result.seats)} />}
          {result.engineDisplacementCc != null && <Field icon={Gauge} label="Engine" value={`${result.engineDisplacementCc} cc`} />}
          {result.firstRegisteredAt && <Field icon={Car} label="First registered" value={result.firstRegisteredAt} />}
          {result.motExpiresAt && <Field icon={ShieldCheck} label="APK (MOT) expires" value={result.motExpiresAt} />}
        </div>
      )}
    </div>
  );
}
