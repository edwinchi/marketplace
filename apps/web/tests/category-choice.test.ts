import { describe, expect, it } from "vitest";
import { buildCategoryPickPrompt, keywordMatchesName, mergeShortlists, parseCategoryChoice, parseItemReply, titleKeywords } from "@/lib/category-choice";

describe("parseCategoryChoice", () => {
  it("reads the 1-based choice as a 0-based index", () => {
    expect(parseCategoryChoice('{"choice": 3}', 5)).toBe(2);
    expect(parseCategoryChoice('<think>hmm</think>\n```json\n{"choice": "1"}\n```', 5)).toBe(0);
  });
  it("rejects numbers outside the list and replies without a choice", () => {
    expect(parseCategoryChoice('{"choice": 0}', 5)).toBeNull();
    expect(parseCategoryChoice('{"choice": 6}', 5)).toBeNull();
    expect(parseCategoryChoice("Books › Fiction", 5)).toBeNull();
    expect(parseCategoryChoice(null, 5)).toBeNull();
  });
});

describe("parseItemReply", () => {
  it("extracts the item phrase", () => {
    expect(parseItemReply('{"item": "paperback novel"}')).toBe("paperback novel");
    expect(parseItemReply('{"item": ""}')).toBeNull();
    expect(parseItemReply(null)).toBeNull();
  });
});

describe("mergeShortlists", () => {
  it("keeps first-seen order, drops repeats, caps the length", () => {
    expect(mergeShortlists([["a", "b"], ["b", "c", "d"]], 3)).toEqual(["a", "b", "c"]);
  });
});

describe("buildCategoryPickPrompt", () => {
  it("numbers the candidates from 1", () => {
    const prompt = buildCategoryPickPrompt({ title: "Roman", item: "novel" }, ["Books › Fiction", "Stamps & Coins › Netherlands"]);
    expect(prompt).toContain("1. Books › Fiction\n2. Stamps & Coins › Netherlands");
    expect(prompt).toContain("Item: novel");
  });
});

describe("keyword fallback", () => {
  it("matches whole words, not letters hidden inside another word", () => {
    // The live bug: "het" (Dutch "the") matched "Sugar Sachets".
    expect(keywordMatchesName("het", "Sugar Sachets")).toBe(false);
    expect(keywordMatchesName("shirt", "T-shirts")).toBe(true);
    expect(keywordMatchesName("fiets", "Damesfietsen")).toBe(false);
    expect(keywordMatchesName("dames", "Damesfietsen")).toBe(true);
  });
  it("splits titles on punctuation and keeps accented letters", () => {
    expect(titleKeywords("Livre de cuisine – édition 2020, très bon")).toEqual(["livre", "cuisine", "édition", "2020", "très", "bon"]);
  });
});
