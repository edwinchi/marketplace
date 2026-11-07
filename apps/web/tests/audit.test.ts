import { beforeEach, describe, expect, it, vi } from "vitest";

// recordAdminAction writes to audit_logs through the service client and reads the caller's IP from
// the request headers; both are faked here so the test checks exactly what row would be written.
const inserted: unknown[] = [];
let insertError: { message: string } | null = null;
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => ({
      insert: async (row: unknown) => {
        inserted.push({ table, row });
        return { error: insertError };
      },
    }),
  }),
}));
let forwardedFor: string | null = "203.0.113.7, 10.0.0.1";
vi.mock("next/headers", () => ({
  headers: async () => new Headers(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
}));

const { recordAdminAction } = await import("@/lib/audit");

describe("recordAdminAction", () => {
  beforeEach(() => {
    inserted.length = 0;
    insertError = null;
    forwardedFor = "203.0.113.7, 10.0.0.1";
  });

  it("writes who, what, which record, before/after and the client IP to audit_logs", async () => {
    await recordAdminAction({
      actorProfileId: "11111111-1111-1111-1111-111111111111",
      action: "listing.remove",
      entityType: "listing",
      entityId: "22222222-2222-2222-2222-222222222222",
      previous: { moderation_status: "flagged" },
      next: { status: "deleted" },
    });
    expect(inserted).toEqual([
      {
        table: "audit_logs",
        row: {
          actor_id: "11111111-1111-1111-1111-111111111111",
          action: "listing.remove",
          entity_type: "listing",
          entity_id: "22222222-2222-2222-2222-222222222222",
          previous_values: { moderation_status: "flagged" },
          new_values: { status: "deleted" },
          ip_address: "203.0.113.7",
        },
      },
    ]);
  });

  it("stores no IP rather than an invalid one", async () => {
    forwardedFor = null; // clientIpFromHeaders falls back to "unknown"
    await recordAdminAction({ actorProfileId: null, action: "settings.update", entityType: "app_setting", next: { key: "require_login", value: true } });
    expect((inserted[0] as { row: { ip_address: unknown; entity_id: unknown } }).row).toMatchObject({ ip_address: null, entity_id: null });
  });

  it("never throws when the write fails (the admin action already happened)", async () => {
    insertError = { message: "no partition for this month" };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(recordAdminAction({ actorProfileId: null, action: "ai_uses.grant", entityType: "profile" })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
