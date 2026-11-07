import { describe, expect, it } from "vitest";
import { collectUserData, type ExportDb } from "@/lib/data-export";

// Fake database that records every query and its filters, and serves rows per table. The safety
// rule under test: every query is scoped to the caller (their profile id, or ids that came back
// from their own rows). An unfiltered select would export everyone's data.
const ME = "me-profile";
type Q = { table: string; filters: { op: string; column: string; value: unknown }[] };

function fakeDb(rows: Record<string, Record<string, unknown>[]>) {
  const queries: Q[] = [];
  const db: ExportDb = {
    from: (table) => ({
      select: () => {
        const q: Q = { table, filters: [] };
        queries.push(q);
        const builder = {
          eq(column: string, value: unknown) { q.filters.push({ op: "eq", column, value }); return builder; },
          in(column: string, value: unknown[]) { q.filters.push({ op: "in", column, value }); return builder; },
          or(value: string) { q.filters.push({ op: "or", column: "", value }); return builder; },
          limit() { return builder; },
          then(resolve: (v: { data: unknown[]; error: null }) => unknown) {
            // serve only the rows that match the filters, like a database would
            const data = (rows[table] ?? []).filter((r) =>
              q.filters.every((f) => (f.op === "eq" ? r[f.column] === f.value : f.op === "in" ? (f.value as unknown[]).includes(r[f.column]) : true)),
            );
            return Promise.resolve({ data, error: null }).then(resolve);
          },
        };
        return builder as never;
      },
    }),
  };
  return { db, queries };
}

const rows = {
  profiles: [{ id: ME, username: "me" }, { id: "other", username: "someone-else" }],
  listings: [{ id: "L1", seller_id: ME, title: "Bike", title_embedding: [0.1, 0.2] }, { id: "L9", seller_id: "other", title: "Not mine" }],
  listing_media: [{ id: "m1", listing_id: "L1" }, { id: "m9", listing_id: "L9" }],
  orders: [{ id: "O1", buyer_id: ME, seller_id: "other" }, { id: "O9", buyer_id: "other", seller_id: "x" }],
  payments: [{ id: "p1", order_id: "O1" }, { id: "p9", order_id: "O9" }],
  conversation_participants: [{ conversation_id: "C1", profile_id: ME }, { conversation_id: "C9", profile_id: "other" }],
  messages: [{ id: "msg1", conversation_id: "C1", sender_id: "other" }, { id: "msg9", conversation_id: "C9", sender_id: "other" }],
  reviews: [{ id: "r1", reviewer_profile_id: ME, reviewee_profile_id: "other" }, { id: "r9", reviewer_profile_id: "other", reviewee_profile_id: "x" }],
};

describe("collectUserData", () => {
  it("scopes every query to the caller: their profile id, or ids from their own rows", async () => {
    const { db, queries } = fakeDb(rows);
    await collectUserData(db, ME, { id: "auth-1", email: "me@example.com" });
    expect(queries.length).toBeGreaterThan(20);
    for (const q of queries) {
      expect(q.filters.length, `${q.table} query has no filter`).toBeGreaterThan(0);
      const scoped = q.filters.some((f) => (f.op === "eq" && f.value === ME) || (f.op === "in" && Array.isArray(f.value) && f.value.length > 0));
      expect(scoped, `${q.table} isn't scoped to the caller`).toBe(true);
    }
  });

  it("returns the caller's rows and none of anyone else's", async () => {
    const { db } = fakeDb(rows);
    const out = await collectUserData(db, ME, { id: "auth-1", email: "me@example.com", identities: [{ provider: "email" }] });
    const text = JSON.stringify(out);
    for (const mine of ["Bike", "m1", "p1", "msg1", "r1", "me@example.com"]) expect(text).toContain(mine);
    for (const theirs of ["Not mine", "m9", "p9", "msg9", "r9", "someone-else"]) expect(text).not.toContain(theirs);
    expect(out.profile).toMatchObject({ id: ME });
    expect(out.account.sign_in_methods).toEqual(["email"]);
  });

  it("drops AI search vectors", async () => {
    const { db } = fakeDb(rows);
    const out = await collectUserData(db, ME, { id: "auth-1" });
    expect(out.listings.listings[0]).not.toHaveProperty("title_embedding");
  });

  it("skips second-hop queries when there is nothing to look up", async () => {
    const { db, queries } = fakeDb({ profiles: [{ id: ME }] });
    await collectUserData(db, ME, { id: "auth-1" });
    expect(queries.some((q) => q.table === "messages" || q.table === "payments")).toBe(false);
  });
});
