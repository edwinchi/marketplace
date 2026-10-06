import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({}) }));

const { responseBucketForMinutes } = await import("@/lib/seller-response");

describe("responseBucketForMinutes", () => {
  it.each([
    [5, "hour"],
    [60, "hour"],
    [61, "hours"],
    [6 * 60, "hours"],
    [12 * 60, "day"],
    [2 * 24 * 60, "days"],
  ] as const)("%i minutes -> %s", (minutes, bucket) => {
    expect(responseBucketForMinutes(minutes)).toBe(bucket);
  });

  it("shows nothing when replies typically take longer than three days", () => {
    expect(responseBucketForMinutes(4 * 24 * 60)).toBeNull();
  });
});
