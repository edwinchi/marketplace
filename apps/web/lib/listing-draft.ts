// Hand-off for AI-analyzed photo data between the step-1 and step-2 post-ad pages: a File can't
// survive a route change, so the resized image (as a data URL) and the generated description ride
// in sessionStorage under this key, keyed to the exact title+category the user continued with so a
// stale draft from an abandoned earlier attempt never gets picked up by a different listing.
export const LISTING_DRAFT_KEY = "afrodeals:listing-draft";

export type ListingDraft = {
  title: string;
  categoryId: string;
  description: string;
  imageDataUrl: string;
};

export function saveListingDraft(draft: ListingDraft) {
  try {
    sessionStorage.setItem(LISTING_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // sessionStorage can throw in private-browsing / storage-full edge cases — the AI assist is a
    // convenience, not a requirement, so failing silently here just means step 2 loads blank.
  }
}

export function takeListingDraft(title: string, categoryId: string): ListingDraft | null {
  try {
    const raw = sessionStorage.getItem(LISTING_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as ListingDraft;
    // Only consumed on an actual match -- a mismatch (the user tweaked the title/category after
    // step 1's AI fill, e.g. via the category search) leaves the draft in place rather than
    // burning it, so reverting back to the exact AI-filled title/category and continuing still
    // picks it up instead of landing on a blank form.
    if (draft.title !== title || draft.categoryId !== categoryId) return null;
    sessionStorage.removeItem(LISTING_DRAFT_KEY);
    return draft;
  } catch {
    return null;
  }
}
