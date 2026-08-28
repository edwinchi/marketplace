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
