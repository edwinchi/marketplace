import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signAiAnalysis, verifyAiAnalysis, type AiAnalysisPayload } from "@/lib/ai-analysis-token";

const payload: AiAnalysisPayload = {
  profileId: "profile-1",
  issuedAt: Date.now(),
  model: "test-model",
  title: "Mountain bike",
  description: "Lightly used",
  categoryId: "category-1",
  categoryLabel: "Bicycles",
};

const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-signing-secret";
});
afterAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
});

describe("AI analysis tokens", () => {
  it("round-trips a genuine token for the profile it was issued to", () => {
    const token = signAiAnalysis(payload)!;
    expect(verifyAiAnalysis(token, "profile-1")).toEqual(payload);
  });

  it("rejects a token whose contents were edited", () => {
    const signature = signAiAnalysis(payload)!.split(".")[1];
    const forgedBody = Buffer.from(JSON.stringify({ ...payload, title: "Forged" })).toString("base64url");
    expect(verifyAiAnalysis(`${forgedBody}.${signature}`, "profile-1")).toBeNull();
  });

  it("rejects a token presented by a different profile", () => {
    expect(verifyAiAnalysis(signAiAnalysis(payload)!, "profile-2")).toBeNull();
  });

  it("rejects a token older than 24 hours", () => {
    const old = signAiAnalysis({ ...payload, issuedAt: Date.now() - 25 * 60 * 60 * 1000 })!;
    expect(verifyAiAnalysis(old, "profile-1")).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(verifyAiAnalysis("not-a-token", "profile-1")).toBeNull();
    expect(verifyAiAnalysis("", "profile-1")).toBeNull();
  });

  it("issues nothing when the server has no signing secret", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(signAiAnalysis(payload)).toBeNull();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-signing-secret";
  });
});
