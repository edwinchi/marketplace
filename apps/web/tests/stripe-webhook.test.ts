// Contract tests for POST /api/stripe/webhook: what Stripe gets back in every case, signed with
// real Stripe signatures (stripe.webhooks.generateTestHeaderString) and an in-memory database.
// These responses decide whether Stripe retries, so changing one is a behaviour change.
import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; op: string; arg?: unknown };
let calls: Call[] = [];
let dedupeError: { code?: string; message: string } | null = null;
let profilesError: { message: string } | null = null;

// Minimal stand-in for the service-role Supabase client: records every call, lets a test make
// the dedupe insert or a profiles update fail.
function fakeSupabase() {
  return {
    from(table: string) {
      return {
        insert: async (arg: unknown) => {
          calls.push({ table, op: "insert", arg });
          return { error: table === "stripe_webhook_events" ? dedupeError : null };
        },
        update: (arg: unknown) => ({
          eq: async () => {
            calls.push({ table, op: "update", arg });
            return { error: table === "profiles" ? profilesError : null };
          },
        }),
        delete: () => ({
          eq: async (_col: string, value: unknown) => {
            calls.push({ table, op: "delete", arg: value });
            return { error: null };
          },
        }),
      };
    },
  };
}
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => fakeSupabase() }));

const PLATFORM_SECRET = "whsec_test_platform";
const CONNECT_SECRET = "whsec_test_connect";
const stripe = new Stripe("sk_test_dummy_for_signatures_only");

function signedRequest(event: object, secret = PLATFORM_SECRET, signature?: string) {
  const payload = JSON.stringify(event);
  const header = signature ?? stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("https://marketitnow.net/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": header, "content-type": "application/json" },
    body: payload,
  });
}
const event = (type: string, object: object = {}, id = `evt_${Math.random().toString(36).slice(2)}`) => ({
  id,
  object: "event",
  type,
  data: { object },
});

beforeEach(() => {
  calls = [];
  dedupeError = null;
  profilesError = null;
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy_for_signatures_only");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", PLATFORM_SECRET);
  vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", CONNECT_SECRET);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const { POST } = await import("@/app/api/stripe/webhook/route");

describe("POST /api/stripe/webhook", () => {
  it("503 when Stripe isn't configured", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "");
    const res = await POST(signedRequest(event("account.updated")));
    expect(res.status).toBe(503);
  });

  it("400 without a Stripe-Signature header, and touches nothing", async () => {
    const res = await POST(new Request("https://marketitnow.net/api/stripe/webhook", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
    expect(calls).toEqual([]);
  });

  it("400 for a forged signature, and touches nothing", async () => {
    const res = await POST(signedRequest(event("account.updated"), "whsec_attacker"));
    expect(res.status).toBe(400);
    expect(calls).toEqual([]);
  });

  it("400 when the body was altered after signing", async () => {
    const payload = JSON.stringify(event("account.updated", { id: "acct_1", charges_enabled: false }));
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: PLATFORM_SECRET });
    const tampered = payload.replace('"charges_enabled":false', '"charges_enabled":true');
    const res = await POST(new Request("https://marketitnow.net/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": header }, body: tampered }));
    expect(res.status).toBe(400);
    expect(calls).toEqual([]);
  });

  it("200 for a valid event and records its id first (idempotency)", async () => {
    const e = event("account.updated", { id: "acct_1", charges_enabled: true, payouts_enabled: false });
    const res = await POST(signedRequest(e));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(calls[0]).toEqual({ table: "stripe_webhook_events", op: "insert", arg: { id: e.id } });
    expect(calls[1]).toMatchObject({ table: "profiles", op: "update", arg: { stripe_connect_charges_enabled: true, stripe_connect_payouts_enabled: false } });
  });

  it("accepts events signed with the Connect endpoint's secret too", async () => {
    const res = await POST(signedRequest(event("account.updated", { id: "acct_2" }), CONNECT_SECRET));
    expect(res.status).toBe(200);
  });

  it("200 for an event type it doesn't handle (so Stripe stops retrying)", async () => {
    const res = await POST(signedRequest(event("charge.refund.updated")));
    expect(res.status).toBe(200);
  });

  it("200 duplicate for a redelivered event, without processing it again", async () => {
    dedupeError = { code: "23505", message: "duplicate key" };
    const res = await POST(signedRequest(event("account.updated", { id: "acct_1" })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, duplicate: true });
    expect(calls.some((c) => c.table === "profiles")).toBe(false);
  });

  it("500 when the dedupe insert itself fails, so Stripe retries instead of the event being lost", async () => {
    dedupeError = { code: "08006", message: "connection failure" };
    const res = await POST(signedRequest(event("account.updated", { id: "acct_1" })));
    expect(res.status).toBe(500);
    expect(calls.some((c) => c.table === "profiles")).toBe(false);
  });

  it("500 and rolls back the dedupe row when processing fails, so the retry is processed", async () => {
    profilesError = { message: "statement timeout" };
    const e = event("account.updated", { id: "acct_1" });
    const res = await POST(signedRequest(e));
    expect(res.status).toBe(500);
    expect(calls.at(-1)).toEqual({ table: "stripe_webhook_events", op: "delete", arg: e.id });
  });
});
