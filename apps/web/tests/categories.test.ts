import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({}) }));

const { isNonPhotoSource } = await import("@/lib/categories");

describe("isNonPhotoSource", () => {
  const commons = (file: string) => `https://upload.wikimedia.org/wikipedia/commons/0/06/${file}?utm_source=commons.wikimedia.org&utm_content=original`;

  it("flags diagrams, logos and video by the file extension before the query string", () => {
    expect(isNonPhotoSource(commons("Drill_scheme.svg"))).toBe(true);
    expect(isNonPhotoSource(commons("Clip.webm"))).toBe(true);
    expect(isNonPhotoSource(commons("Scan.TIF"))).toBe(true);
  });

  it("keeps real photos and rows without a source", () => {
    expect(isNonPhotoSource(commons("Packard_1934_Sedan.jpg"))).toBe(false);
    expect(isNonPhotoSource(commons("Thing.png"))).toBe(false);
    expect(isNonPhotoSource(null)).toBe(false);
  });
});
