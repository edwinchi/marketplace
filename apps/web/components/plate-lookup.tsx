"use client";

import { useState, useTransition } from "react";
import { Search, Car, Gauge, Palette, Fuel, DoorOpen, Users, ShieldCheck, Zap, Cog, CircleDot, Leaf, Award } from "lucide-react";
import { searchVehicleByPlate, searchVehicleByKba } from "@/app/categories/plate-lookup-action";
import { translateDutchColor, type VehicleLookupResult } from "@/lib/rdw";
import { VEHICLE_REGISTRY_COUNTRIES, DEFAULT_REGISTRY_COUNTRY } from "@/lib/vehicle-registries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function formatPlate(plate: string) {
  // Purely cosmetic — RDW itself is dash-agnostic, this just echoes back the conventional Dutch
  // display grouping (XX-999-X) for whatever length plate came back, best-effort.
  if (plate.length !== 6) return plate;
  return `${plate.slice(0, 2)}-${plate.slice(2, 5)}-${plate.slice(5)}`;
}

function Field({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b py-2 text-sm last:border-b-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function EmptyTab() {
  return <p className="py-3 text-sm text-muted-foreground">No data available for this vehicle.</p>;
}

export function PlateLookup() {
  const [country, setCountry] = useState(DEFAULT_REGISTRY_COUNTRY);
  const [plate, setPlate] = useState("");
  const [result, setResult] = useState<VehicleLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedCountry = VEHICLE_REGISTRY_COUNTRIES.find((c) => c.code === country);
  const isKbaBased = !!selectedCountry?.kbaBased;

  function handleSearch() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const { data, error: err } = isKbaBased ? await searchVehicleByKba(plate, country) : await searchVehicleByPlate(plate, country);
      if (err) setError(err);
      else setResult(data);
    });
  }

  const basics = result
    ? [
        result.vehicleType && { icon: Car, label: "Type", value: result.vehicleType },
        result.color && { icon: Palette, label: "Colour", value: translateDutchColor(result.color) },
        result.doors != null && { icon: DoorOpen, label: "Doors", value: String(result.doors) },
        result.seats != null && { icon: Users, label: "Seats", value: String(result.seats) },
        result.firstRegisteredAt && { icon: Car, label: "First registered", value: result.firstRegisteredAt },
        result.motExpiresAt && { icon: ShieldCheck, label: "APK (MOT) expires", value: result.motExpiresAt },
      ].filter((f): f is { icon: typeof Car; label: string; value: string } => !!f)
    : [];

  const technical = result
    ? [
        result.transmission && { icon: Cog, label: "Transmission", value: result.transmission },
        result.cylinders != null && { icon: CircleDot, label: "Cylinders", value: String(result.cylinders) },
        result.engineDisplacementCc != null && { icon: Gauge, label: "Engine", value: `${result.engineDisplacementCc} cc` },
        result.powerHp != null && { icon: Zap, label: "Power", value: `${result.powerHp} pk` },
      ].filter((f): f is { icon: typeof Cog; label: string; value: string } => !!f)
    : [];

  const environment = result
    ? [
        result.fuelConsumptionL100km != null && { icon: Fuel, label: "Fuel consumption", value: `${result.fuelConsumptionL100km} l/100km` },
        result.co2GramsPerKm != null && { icon: Leaf, label: "CO₂ emissions", value: `${result.co2GramsPerKm} g/km` },
        result.energyLabel && { icon: Award, label: "Energy label", value: result.energyLabel },
        result.emissionStandard && { icon: ShieldCheck, label: "Emission standard", value: result.emissionStandard },
      ].filter((f): f is { icon: typeof Fuel; label: string; value: string } => !!f)
    : [];

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Car className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Look up a car by its license plate</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Checks each country's official vehicle registry — coverage expands over time, real data only, no guessing.
      </p>
      <div className="flex flex-wrap gap-2">
        <Select
          value={country}
          onValueChange={(v) => {
            if (!v) return;
            setCountry(v);
            setPlate("");
            setResult(null);
            setError(null);
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
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder={isKbaBased ? "e.g. 0588 AVJ" : "e.g. TH-918-F"}
          maxLength={12}
          className={cn("max-w-48", !isKbaBased && "uppercase")}
        />
        <Button type="button" onClick={handleSearch} disabled={pending || !plate.trim()} className="gap-1.5">
          <Search className="size-4" />
          {pending ? "Searching…" : "Search"}
        </Button>
      </div>
      {isKbaBased && (
        <p className="mt-2 text-xs text-muted-foreground">
          Germany doesn't allow plate lookups — enter the HSN/TSN vehicle-type key number from your Fahrzeugschein
          (vehicle registration document) instead.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {result && (
        <div className="mt-4 rounded-lg border bg-muted/30 p-4">
          <div className="mb-1 flex items-baseline justify-between">
            <div>
              <p className="font-semibold">
                {result.make} {result.model}
              </p>
              {result.trim && <p className="text-xs text-muted-foreground">{result.trim}</p>}
            </div>
            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
              {isKbaBased ? result.plate : formatPlate(result.plate)}
            </span>
          </div>
          {result.fuelType && <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground"><Fuel className="size-3" />{result.fuelType}</p>}

          <Tabs defaultValue="basics" className="mt-2">
            <TabsList>
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
              <TabsTrigger value="environment">Environment</TabsTrigger>
            </TabsList>
            <TabsContent value="basics">
              {basics.length ? basics.map((f) => <Field key={f.label} {...f} />) : <EmptyTab />}
            </TabsContent>
            <TabsContent value="technical">
              {technical.length ? technical.map((f) => <Field key={f.label} {...f} />) : <EmptyTab />}
            </TabsContent>
            <TabsContent value="environment">
              {environment.length ? environment.map((f) => <Field key={f.label} {...f} />) : <EmptyTab />}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
