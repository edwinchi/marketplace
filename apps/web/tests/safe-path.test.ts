import { describe, expect, it } from "vitest";
import { safeRelativePath } from "@/lib/safe-path";

describe("safeRelativePath (open-redirect guard)", () => {
  it("keeps same-site paths", () => {
    expect(safeRelativePath("/my-account")).toBe("/my-account");
    expect(safeRelativePath("/listings/x-1?ref=mail#top")).toBe("/listings/x-1?ref=mail#top");
    expect(safeRelativePath("/")).toBe("/");
  });
  it("rejects anything a browser would send to another site", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "/\\/evil.com", "/\t/evil.com", "/\n/evil.com", "/\r//evil.com", "https://evil.com", "evil.com", "javascript:alert(1)", " /x"]) {
      expect(safeRelativePath(bad), JSON.stringify(bad)).toBe("/");
    }
  });
  it("uses the fallback for missing or non-string input", () => {
    expect(safeRelativePath(undefined)).toBe("/");
    expect(safeRelativePath(null, "/home")).toBe("/home");
    expect(safeRelativePath(42)).toBe("/");
    expect(safeRelativePath("")).toBe("/");
  });
});
