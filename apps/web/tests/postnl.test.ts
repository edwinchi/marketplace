import { describe, expect, it } from "vitest";
import { normalizeDutchPostcode, postnlTimestamp, splitStreetAndNumber } from "@/lib/postnl";

describe("splitStreetAndNumber", () => {
  it.each([
    ["Damrak 1", { street: "Damrak", houseNr: "1", houseNrExt: "" }],
    ["Damrak 1A", { street: "Damrak", houseNr: "1", houseNrExt: "A" }],
    ["Damrak 1 A", { street: "Damrak", houseNr: "1", houseNrExt: "A" }],
    ["Prinsengracht 263-II", { street: "Prinsengracht", houseNr: "263", houseNrExt: "II" }],
    ["Laan van Meerdervoort 50 bis", { street: "Laan van Meerdervoort", houseNr: "50", houseNrExt: "bis" }],
    ["Plein 1944 12", { street: "Plein 1944", houseNr: "12", houseNrExt: "" }],
    ["2e Hugo de Grootstraat 7-H", { street: "2e Hugo de Grootstraat", houseNr: "7", houseNrExt: "H" }],
  ])("%s", (line, expected) => {
    expect(splitStreetAndNumber(line)).toEqual(expected);
  });

  it("returns null without a house number", () => {
    expect(splitStreetAndNumber("Damrak")).toBeNull();
    expect(splitStreetAndNumber("12")).toBeNull();
  });
});

describe("helpers", () => {
  it("normalizes postcodes", () => {
    expect(normalizeDutchPostcode("1012 ab")).toBe("1012AB");
  });

  it("formats timestamps as dd-mm-yyyy hh:mm:ss", () => {
    expect(postnlTimestamp(new Date(2026, 9, 6, 9, 5, 3))).toBe("06-10-2026 09:05:03");
  });
});
