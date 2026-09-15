// Downscales before re-encoding as JPEG and base64-encoding, so a phone photo (often 4000px+,
// several MB) doesn't turn into an oversized request. Runs in the browser via canvas — cheap, no
// server round-trip needed just to shrink it. 1024px (not Anthropic's ~1568px useful-resolution
// ceiling) is deliberate here: identifying a listing item and its condition doesn't need the extra
// detail, and image tokens are the single biggest lever against OpenRouter's free-tier per-request
// token cap (agents.md §12) — a listing photo plus the full category list was tipping just over it
// at 1568px.
export async function fileToResizedBase64(file: File, maxDim = 1024, quality = 0.85): Promise<{ base64: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), "image/jpeg", quality),
  );
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { base64, mediaType: "image/jpeg" };
}

// Downscales + re-encodes a real listing photo before it ever leaves the device. Modern phone
// cameras routinely produce 3-15MB originals -- comfortably over Vercel's ~4.5MB serverless
// function request-body ceiling, a platform-level limit that next.config.ts's own
// experimental.serverActions.bodySizeLimit setting cannot override (confirmed live: that setting
// only raises the ceiling Next.js itself would otherwise apply, not the lower one Vercel's own
// routing layer enforces ahead of it) -- once even one or two full-resolution phone photos land in
// the same form submission (every photo travels inside the create/edit-listing Server Action's own
// request body; there's no separate direct-to-storage upload path). Up to 24 photos can ride in one
// submission (see MAX_PHOTOS in photo-upload.tsx/edit-photo-manager.tsx), so a single fixed
// quality/dimension pair sized for "a couple of photos" isn't enough headroom on its own --
// iterating down in both dimension and quality until the file actually lands under targetBytes
// guarantees every photo respects the same real budget regardless of how detailed/busy it is,
// rather than hoping one fixed setting happens to be small enough.
//
// Falls back to the original file if the browser can't decode it (an already-tiny file, or a
// format createImageBitmap doesn't support), or if a given attempt's re-encode comes out larger
// than the best one already found (an already well-compressed photo occasionally does, especially
// on the first, least-aggressive attempt) -- never lose the user's photo outright over a
// compression attempt, and never regress on a photo that was already small.
export async function compressImageFile(file: File, targetBytes = 300 * 1024): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    let dim = 1600;
    let quality = 0.82;
    let best: File = file;

    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, dim / Math.max(bitmap.width, bitmap.height));
      const width = Math.round(bitmap.width * scale);
      const height = Math.round(bitmap.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, width, height);

      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), "image/jpeg", quality),
      );
      if (blob.size < best.size) {
        const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        best = new File([blob], newName, { type: "image/jpeg" });
      }
      if (blob.size <= targetBytes) break;
      if (dim <= 640 && quality <= 0.5) break; // floor reached -- accept whatever this pass produced
      dim = Math.round(dim * 0.78);
      quality = Math.max(0.5, quality - 0.1);
    }
    return best;
  } catch {
    return file;
  }
}
