import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// checkRateLimit talks to rate_limit_events through the service client; the fake records every
// call so the tests can check the counting, the insert and the 7-day cleanup (risk R12).
type Call = { op: string; table: string; filters: [string, string, unknown][] };
const calls: Call[] = [];
let existingCount = 0;

function builder(op: string, table: string) {
  const call: Call = { op, table, filters: [] };
  calls.push(call);
  const b = {
    eq: (c: string, v: unknown) => (call.filters.push(["eq", c, v]), b),
    gte: (c: string, v: unknown) => (call.filters.push(["gte", c, v]), b),
    lt: (c: string, v: unknown) => (call.filters.push(["lt", c, v]), b),
    then: (resolve: (r: unknown) => void) => resolve({ count: existingCount, error: null }),
  };
  return b;
}

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => ({
      select: () => builder("select", table),
      delete: () => builder("delete", table),
      insert: async () => (calls.push({ op: "insert", table, filters: [] }), { error: null }),
    }),
  }),
}));

const { checkRateLimit, resetRateLimitPruneClock, RATE_LIMIT_RETENTION_DAYS } = await import("@/lib/rate-limit");
const DAY = 24 * 60 * 60 * 1000;

describe("checkRateLimit", () => {
  beforeEach(() => {
    calls.length = 0;
    existingCount = 0;
    resetRateLimitPruneClock();
    vi.useRealTimers();
  });

  it("allows and records a request under the limit, refuses one at the limit", async () => {
    expect(await checkRateLimit("login-ip:203.0.113.7", 20, 900)).toBe(true);
    expect(calls.some((c) => c.op === "insert")).toBe(true);
    calls.length = 0;
    existingCount = 20;
    expect(await checkRateLimit("login-ip:203.0.113.7", 20, 900)).toBe(false);
    expect(calls.some((c) => c.op === "insert")).toBe(false);
  });

  it("deletes rows older than 7 days, at most once an hour per instance", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-07T12:00:00Z"));
    await checkRateLimit("signup:203.0.113.7", 5, 3600);
    const deletes = () => calls.filter((c) => c.op === "delete");
    expect(deletes()).toHaveLength(1);
    expect(deletes()[0].table).toBe("rate_limit_events");
    expect(deletes()[0].filters).toEqual([["lt", "created_at", new Date(Date.now() - 7 * DAY).toISOString()]]);

    vi.setSystemTime(new Date("2026-11-07T12:59:00Z"));
    await checkRateLimit("signup:203.0.113.7", 5, 3600);
    expect(deletes()).toHaveLength(1);

    vi.setSystemTime(new Date("2026-11-07T13:01:00Z"));
    await checkRateLimit("signup:203.0.113.7", 5, 3600);
    expect(deletes()).toHaveLength(2);
  });

  it("no limit in the app uses a window longer than the retention", () => {
    const root = path.resolve(__dirname, "..");
    const windows: [string, number][] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (["node_modules", ".next", "tests", "vendor"].includes(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name)) {
          for (const m of fs.readFileSync(p, "utf8").matchAll(/checkRateLimit\(\s*`[^`]*`\s*,\s*[^,]+,\s*(\d+)\s*\)/g)) windows.push([p, Number(m[1])]);
        }
      }
    };
    for (const d of ["app", "lib", "components"]) walk(path.join(root, d));
    expect(windows.length).toBeGreaterThan(10);
    const tooLong = windows.filter(([, s]) => s * 1000 > RATE_LIMIT_RETENTION_DAYS * DAY);
    expect(tooLong).toEqual([]);
  });
});
