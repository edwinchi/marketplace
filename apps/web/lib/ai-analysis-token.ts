import { createHmac, timingSafeEqual } from "node:crypto";

// Carries an AI photo analysis (app/listings/new/analyze-photo-action.ts) from the moment it runs to
// the moment the listing is published, so the listing can get its listing_ai_metadata row (AGENTS.md
// §5: the raw suggestion is recorded for tuning and audit). The analysis happens before the listing
// exists, and the post-ad flow hands it from step 1 to step 2 through the browser
// (lib/listing-draft.ts), so it comes back as an untrusted form field. HMAC-signing it server-side
// means a seller can't forge or edit what "the AI suggested"; binding it to their profile and a
// 24-hour expiry means a token can't be replayed onto someone else's listing or reused much later.
// The key is derived from the service-role key rather than a new env var: it is already a
// server-only secret present everywhere this runs.

export type AiAnalysisPayload = {
  profileId: string;
  issuedAt: number;
  model: string | null;
  title: string;
  description: string;
  categoryId: string;
  categoryLabel: string;
  attributes?: Record<string, string | string[]>;
};

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function signingKey(): Buffer | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return createHmac("sha256", secret).update("listing-ai-analysis-token:v1").digest();
}

function mac(key: Buffer, body: string): string {
  return createHmac("sha256", key).update(body).digest("base64url");
}

export function signAiAnalysis(payload: AiAnalysisPayload): string | null {
  const key = signingKey();
  if (!key) return null;
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${mac(key, body)}`;
}

/** Returns the payload only if the token is genuine, unexpired and issued to this profile. */
export function verifyAiAnalysis(token: string, profileId: string): AiAnalysisPayload | null {
  const key = signingKey();
  const [body, signature] = token.split(".");
  if (!key || !body || !signature) return null;
  const expected = Buffer.from(mac(key, body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AiAnalysisPayload;
    if (payload.profileId !== profileId || Date.now() - payload.issuedAt > MAX_AGE_MS) return null;
    return payload;
  } catch {
    return null;
  }
}
