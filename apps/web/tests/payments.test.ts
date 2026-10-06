import { beforeEach, describe, expect, it, vi } from "vitest";

const settings: Record<string, number> = {};
vi.mock("@/lib/numeric-settings", () => ({ getNumericSetting: async (key: string) => settings[key] }));
// USD-based, like open.er-api.com: 1 USD = 0.9 EUR = 600 XOF.
let rates: { base: string; rates: Record<string, number> } | null = null;
vi.mock("@/lib/exchange-rates", () => ({ getExchangeRates: async () => rates }));

const { calculateBuyerFeeMinor, isDirectBuyEligible } = await import("@/lib/payments");

describe("isDirectBuyEligible", () => {
  const base = { status: "active", price_type: "fixed", price_minor: 2500 };

  it("allows an active, fixed-price listing with a real price", () => {
    expect(isDirectBuyEligible(base)).toBe(true);
  });

  it.each([
    ["inactive", { ...base, status: "sold" }],
    ["bidding", { ...base, price_type: "bidding" }],
    ["no price", { ...base, price_minor: null }],
    ["zero price", { ...base, price_minor: 0 }],
    ["reserved", { ...base, is_reserved: true }],
  ])("rejects a %s listing", (_label, listing) => {
    expect(isDirectBuyEligible(listing)).toBe(false);
  });
});

describe("calculateBuyerFeeMinor", () => {
  beforeEach(() => {
    settings.buyer_fee_percent_x100 = 500; // 5%
    settings.buyer_fee_min_cents = 50;
    settings.buyer_fee_max_cents = 2500;
  });

  it("charges the percentage between the bounds", async () => {
    await expect(calculateBuyerFeeMinor(10000)).resolves.toBe(500);
  });

  it("clamps to the minimum and maximum", async () => {
    await expect(calculateBuyerFeeMinor(100)).resolves.toBe(50);
    await expect(calculateBuyerFeeMinor(10_000_000)).resolves.toBe(2500);
  });

  it("converts the EUR-cent bounds into the listing's currency", async () => {
    rates = { base: "USD", rates: { USD: 1, EUR: 0.9, XOF: 600 } };
    // €0.50 min = 333.33 XOF -> 33333 minor; €25 max = 16666.67 XOF -> 1666667 minor.
    await expect(calculateBuyerFeeMinor(100, "XOF")).resolves.toBe(33333);
    await expect(calculateBuyerFeeMinor(1_000_000_000, "XOF")).resolves.toBe(1666667);
    await expect(calculateBuyerFeeMinor(1_000_000, "XOF")).resolves.toBe(50000); // 5%, within bounds
  });

  it("falls back to the unconverted bounds when no rate is available", async () => {
    rates = null;
    await expect(calculateBuyerFeeMinor(100, "XOF")).resolves.toBe(50);
  });
});
