import { afterEach, describe, expect, it, vi } from "vitest";

// Request headers the code under test will see; set per test.
let requestHeaders = new Headers();
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));

const { getSiteOrigin, CANONICAL_ORIGIN } = await import("@/lib/site-url");

afterEach(() => {
  vi.unstubAllEnvs();
  requestHeaders = new Headers();
});

describe("getSiteOrigin", () => {
  it("is always https://marketitnow.net in production, whatever the request host", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    for (const host of ["afrodeals.net", "afrodeals-x-station9x.vercel.app", "marketplace.apps-pilot.nl"]) {
      requestHeaders = new Headers({ host });
      expect(await getSiteOrigin()).toBe("https://marketitnow.net");
    }
    expect(CANONICAL_ORIGIN).toBe("https://marketitnow.net");
  });

  it("ignores a forged X-Forwarded-Host in production (no reset-link poisoning)", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    requestHeaders = new Headers({ host: "marketitnow.net", "x-forwarded-host": "evil.example" });
    expect(await getSiteOrigin()).toBe("https://marketitnow.net");
  });

  it("follows the request host outside production so previews and local dev stay testable", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    requestHeaders = new Headers({ "x-forwarded-host": "afrodeals-abc-station9x.vercel.app", "x-forwarded-proto": "https" });
    expect(await getSiteOrigin()).toBe("https://afrodeals-abc-station9x.vercel.app");
  });

  it("falls back to localhost when there is no host at all", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    expect(await getSiteOrigin()).toBe("http://localhost:3000");
  });
});
