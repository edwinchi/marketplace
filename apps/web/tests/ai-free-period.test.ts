import { afterEach, describe, expect, it } from "vitest";
import { getAiFreePeriodEnd, isAiFreePeriodActive } from "@/lib/ai-free-period";

describe("free AI period", () => {
  afterEach(() => {
    delete process.env.AI_FREE_PERIOD_ENDS_AT;
  });

  it("runs six months from 7 Nov 2026, ending at midnight Amsterdam time on 7 May 2027", () => {
    expect(getAiFreePeriodEnd().toISOString()).toBe("2027-05-06T22:00:00.000Z");
    expect(isAiFreePeriodActive(new Date("2026-11-07T12:00:00Z"))).toBe(true);
    expect(isAiFreePeriodActive(new Date("2027-05-06T21:59:59Z"))).toBe(true);
  });

  it("switches paid tiers back on by itself once the date passes", () => {
    expect(isAiFreePeriodActive(new Date("2027-05-06T22:00:00Z"))).toBe(false);
    expect(isAiFreePeriodActive(new Date("2028-01-01T00:00:00Z"))).toBe(false);
  });

  it("can be ended early or extended with AI_FREE_PERIOD_ENDS_AT", () => {
    process.env.AI_FREE_PERIOD_ENDS_AT = "2026-12-01T00:00:00Z";
    expect(isAiFreePeriodActive(new Date("2026-12-02T00:00:00Z"))).toBe(false);
    process.env.AI_FREE_PERIOD_ENDS_AT = "2027-11-01T00:00:00Z";
    expect(isAiFreePeriodActive(new Date("2027-06-01T00:00:00Z"))).toBe(true);
  });

  it("ignores an unparseable override instead of ending the period", () => {
    process.env.AI_FREE_PERIOD_ENDS_AT = "next spring";
    expect(getAiFreePeriodEnd().toISOString()).toBe("2027-05-06T22:00:00.000Z");
  });
});
