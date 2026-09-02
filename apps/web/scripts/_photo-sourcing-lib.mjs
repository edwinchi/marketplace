// Shared helpers for scripts/source-category-photos.mjs and scripts/source-subcategory-photos.mjs
// -- sourcing, license verification, upload/record. See source-category-photos.mjs's header
// comment for the full rationale (Wikipedia thumbnail > raw Commons search, why the license check
// is mandatory, matching the existing category_gallery_images rows' format).

import fs from "fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
export const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(\S+)/)[1];
const SERVICE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(\S+)/)[1];
export const HEADERS = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
const UA = "AfroDeals/1.0 (https://afrodeals.net; contact: apehgongedwin@gmail.com)";

const FREE_LICENSE_RE = /^(CC0|CC BY|CC BY-SA|Public domain|PD)/i;

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function alreadyHasImage(categoryId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/category_gallery_images?category_id=eq.${categoryId}&select=id&limit=1`, { headers: HEADERS });
  const rows = await res.json();
  return rows.length > 0;
}

async function fetchWikipediaThumbnail(title) {
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=1000&redirects=1`,
    { headers: { "User-Agent": UA } },
  );
  const json = await res.json();
  const page = Object.values(json.query?.pages ?? {})[0];
  return page?.thumbnail?.source ?? null;
}

function filenameFromCommonsUrl(url) {
  const m = url.match(/\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+?)(?:\/\d+px-[^/]+)?(?:\?|$)/i);
  return m ? decodeURIComponent(m[1]) : null;
}

async function fetchCommonsLicense(fileTitle) {
  const res = await fetch(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(`File:${fileTitle}`)}&prop=imageinfo&iiprop=url|extmetadata&format=json`,
    { headers: { "User-Agent": UA } },
  );
  const json = await res.json();
  const page = Object.values(json.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const license = info.extmetadata?.LicenseShortName?.value ?? null;
  const artist = info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, "").trim() ?? "Unknown";
  return { url: info.url, license, artist };
}

async function uploadAndRecord(categoryId, imageUrl, license, artist) {
  const imgRes = await fetch(imageUrl, { headers: { "User-Agent": UA } });
  if (!imgRes.ok) throw new Error(`Image download failed: ${imgRes.status}`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const storageKey = `${categoryId}/0.jpg`;

  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/category-photos/${storageKey}`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: buffer,
  });
  if (!uploadRes.ok) throw new Error(`Storage upload failed: ${uploadRes.status} ${await uploadRes.text()}`);

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/category_gallery_images`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ category_id: categoryId, storage_key: storageKey, sort_order: 0, source_url: imageUrl, author: artist, license }),
  });
  if (!insertRes.ok) throw new Error(`Row insert failed: ${insertRes.status} ${await insertRes.text()}`);
}

// Sources + verifies + uploads one category's photo from a Wikipedia article title. Returns
// { ok: true, license, artist } or { ok: false, reason }; never throws (callers loop over many).
export async function sourceOneCategory(categoryId, term) {
  const thumb = await fetchWikipediaThumbnail(term);
  if (!thumb) return { ok: false, reason: `no Wikipedia thumbnail for "${term}"` };

  const filename = filenameFromCommonsUrl(thumb);
  if (!filename) return { ok: false, reason: `couldn't parse Commons filename from ${thumb}` };

  const licenseInfo = await fetchCommonsLicense(filename);
  if (!licenseInfo || !licenseInfo.license || !FREE_LICENSE_RE.test(licenseInfo.license)) {
    return { ok: false, reason: `no free license found (got: ${licenseInfo?.license ?? "none"})`, file: filename };
  }

  try {
    await uploadAndRecord(categoryId, licenseInfo.url, licenseInfo.license, licenseInfo.artist);
    return { ok: true, license: licenseInfo.license, artist: licenseInfo.artist };
  } catch (e) {
    return { ok: false, reason: String(e.message ?? e) };
  }
}
