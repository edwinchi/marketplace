import { beforeEach, describe, expect, it } from "vitest";
import { rekeyListingDraft, saveListingDraft, takeListingDraft } from "@/lib/listing-draft";

// Step 1's AI analysis saves the photos + description under the AI's title and category; step 2
// only picks them up for an exact match. A seller who edits the title in step 1 used to land on a
// blank step 2 (photos and description gone, found in the 2026-11-09 end-to-end book test).
beforeEach(() => {
  const store = new Map<string, string>();
  globalThis.sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
});

const aiDraft = { title: "Het Huis aan de Haven", categoryId: "cat-a", description: "A novel.", imageDataUrls: ["data:image/jpeg;base64,AA"], attributes: { condition: "used" } };

describe("listing draft hand-off", () => {
  it("an edited title still gets the photos and description", () => {
    saveListingDraft(aiDraft);
    rekeyListingDraft("Het Huis aan de Haven, paperback", "cat-a");
    const d = takeListingDraft("Het Huis aan de Haven, paperback", "cat-a");
    expect(d?.description).toBe("A novel.");
    expect(d?.imageDataUrls).toHaveLength(1);
    expect(d?.attributes).toEqual({ condition: "used" });
  });

  it("another category keeps photos and description but drops that category's attribute guesses", () => {
    saveListingDraft(aiDraft);
    rekeyListingDraft("Het Huis aan de Haven", "cat-b");
    const d = takeListingDraft("Het Huis aan de Haven", "cat-b");
    expect(d?.description).toBe("A novel.");
    expect(d?.attributes).toBeUndefined();
  });

  it("without a re-key, a different title still gets nothing (no stale drafts)", () => {
    saveListingDraft(aiDraft);
    expect(takeListingDraft("Something else", "cat-a")).toBeNull();
  });
});
