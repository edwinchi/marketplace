import { describe, expect, it } from "vitest";
import { idFromSlugParam, idFromSlugSegments, slugPath } from "@/lib/slug";

const ID = "3f2b8c1e-9a4d-4e5f-8b6a-1c2d3e4f5a6b";

describe("slugPath", () => {
  it("builds a readable slug ending in the id", () => {
    expect(slugPath("Volkswagen Golf 1.4 TSI", ID)).toBe(`volkswagen-golf-1-4-tsi-${ID}`);
  });

  it("strips diacritics", () => {
    expect(slugPath("Café crème", ID)).toBe(`cafe-creme-${ID}`);
  });

  it("falls back to the bare id when nothing slug-able is left", () => {
    expect(slugPath("!!!", ID)).toBe(ID);
  });
});

describe("idFromSlugParam", () => {
  it("recovers the id from a slug, or from the legacy x-<id> form", () => {
    expect(idFromSlugParam(slugPath("Some bike", ID))).toBe(ID);
    expect(idFromSlugParam(`x-${ID}`)).toBe(ID);
    expect(idFromSlugSegments(["fietsen", slugPath("Some bike", ID)])).toBe(ID);
  });
});
