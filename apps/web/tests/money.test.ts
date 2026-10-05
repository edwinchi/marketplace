import { describe, expect, it } from "vitest";
import { fromStripeAmount, toMinorUnits, toStripeAmount } from "@/lib/money";

describe("toMinorUnits", () => {
  it("stores every currency ×100", () => {
    expect(toMinorUnits(19.99)).toBe(1999);
    expect(toMinorUnits(5000)).toBe(500000);
  });

  it("rounds away float noise", () => {
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
  });
});

describe("toStripeAmount", () => {
  it("passes two-decimal currencies through", () => {
    expect(toStripeAmount(1999, "EUR")).toBe(1999);
    expect(toStripeAmount(1999, "eur")).toBe(1999);
    expect(toStripeAmount(250000, "NGN")).toBe(250000);
  });

  it("sends zero-decimal currencies as whole units (no 100× overcharge)", () => {
    expect(toStripeAmount(500000, "XOF")).toBe(5000);
    expect(toStripeAmount(500000, "XAF")).toBe(5000);
    expect(toStripeAmount(123456, "RWF")).toBe(1235);
  });

  it("sends ISK/UGX ×100 but always a whole number of units", () => {
    expect(toStripeAmount(199950, "ISK")).toBe(200000);
    expect(toStripeAmount(500000, "UGX")).toBe(500000);
  });

  it("sends three-decimal TND in millimes", () => {
    expect(toStripeAmount(1999, "TND")).toBe(19990);
  });
});

describe("fromStripeAmount", () => {
  it("round-trips back into the app's ×100 minor units", () => {
    for (const [minor, currency] of [
      [1999, "EUR"],
      [500000, "XOF"],
      [1999, "TND"],
      [500000, "UGX"],
    ] as const) {
      expect(fromStripeAmount(toStripeAmount(minor, currency), currency)).toBe(minor);
    }
  });
});
