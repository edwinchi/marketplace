import { describe, expect, it } from "vitest";
import { displayCity } from "@/components/listing-grid";

describe("displayCity", () => {
  it("title-cases cities typed in all caps or all lowercase", () => {
    expect(displayCity("ZWOLLE")).toBe("Zwolle");
    expect(displayCity("den haag")).toBe("Den Haag");
    expect(displayCity("ALPHEN-AAN-DEN-RIJN")).toBe("Alphen-Aan-Den-Rijn");
  });
  it("leaves mixed-case names as the seller typed them", () => {
    expect(displayCity("'s-Hertogenbosch")).toBe("'s-Hertogenbosch");
    expect(displayCity("Yaoundé")).toBe("Yaoundé");
  });
  it("returns null for empty input", () => {
    expect(displayCity("  ")).toBeNull();
    expect(displayCity(null)).toBeNull();
  });
});
