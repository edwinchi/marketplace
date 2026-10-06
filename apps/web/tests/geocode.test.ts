import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn }));

const { parseNominatim, parseWktPoint } = await import("@/lib/geocode");

describe("parseWktPoint (PDOK centroide_ll)", () => {
  it("reads lng/lat order into lat/lng", () => {
    expect(parseWktPoint("POINT(4.90008448 52.37881084)")).toEqual({ lat: 52.37881084, lng: 4.90008448 });
  });

  it("handles negative coordinates", () => {
    expect(parseWktPoint("POINT(-0.1276 51.5072)")).toEqual({ lat: 51.5072, lng: -0.1276 });
  });

  it("rejects anything else", () => {
    expect(parseWktPoint(undefined)).toBeNull();
    expect(parseWktPoint("POLYGON((0 0))")).toBeNull();
  });
});

describe("parseNominatim", () => {
  it("takes the first result's lat/lon strings", () => {
    expect(parseNominatim([{ lat: "6.4550575", lon: "3.3941795" }])).toEqual({ lat: 6.4550575, lng: 3.3941795 });
  });

  it("returns null for no results or junk", () => {
    expect(parseNominatim([])).toBeNull();
    expect(parseNominatim({ error: "x" })).toBeNull();
    expect(parseNominatim([{ lat: "abc", lon: "1" }])).toBeNull();
  });
});
