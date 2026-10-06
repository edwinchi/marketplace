import { describe, expect, it } from "vitest";
import { parsePriceType, priceMinorFor, priceTypeHasAmount } from "@/lib/price-types";

describe("parsePriceType", () => {
  it("accepts every known type and falls back to fixed", () => {
    expect(parsePriceType("swap")).toBe("swap");
    expect(parsePriceType("on_request")).toBe("on_request");
    expect(parsePriceType("bogus")).toBe("fixed");
    expect(parsePriceType(null)).toBe("fixed");
  });
});

describe("priceMinorFor", () => {
  it("requires a positive amount for fixed and bidding", () => {
    expect(priceMinorFor("fixed", 19.99)).toEqual({ priceMinor: 1999 });
    expect(priceMinorFor("bidding", 250)).toEqual({ priceMinor: 25000 });
    expect("error" in priceMinorFor("fixed", 0)).toBe(true);
    expect("error" in priceMinorFor("bidding", Number.NaN)).toBe(true);
  });

  it("stores free as 0 and amount-less types as null, ignoring any submitted amount", () => {
    expect(priceMinorFor("free", 50)).toEqual({ priceMinor: 0 });
    expect(priceMinorFor("swap", 50)).toEqual({ priceMinor: null });
    expect(priceMinorFor("see_description", 0)).toEqual({ priceMinor: null });
    expect(priceMinorFor("on_request", 0)).toEqual({ priceMinor: null });
  });

  it("only fixed and bidding carry an amount", () => {
    expect(priceTypeHasAmount("fixed")).toBe(true);
    expect(priceTypeHasAmount("free")).toBe(false);
  });
});
