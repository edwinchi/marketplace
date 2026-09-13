// IndexNow -- a single ping tells every participating search engine (Bing, Yandex, Seznam.cz,
// Naver and others) to recrawl a URL immediately, instead of waiting for their next scheduled
// crawl of the sitemap. Deliberately NOT a Google mechanism: Google retired its sitemap-ping
// endpoint in 2023 and has never supported IndexNow -- for Google, submitting the sitemap once in
// Search Console plus normal organic crawling is the real, current mechanism (see agents.md).
// This is a genuine, still-functioning piece of the puzzle for the engines that do support it, not
// a placebo.
//
// The key file at public/<INDEXNOW_KEY>.txt proves domain ownership -- IndexNow's protocol
// requires it be reachable at https://<host>/<key>.txt containing exactly the key, which is how
// the receiving search engine confirms whoever is pinging actually controls this domain.
const INDEXNOW_KEY = "e3b9fa7eae190a4efc219620c759cfe4";

// Best-effort by design, same as every other enrichment call in this codebase (getTextEmbedding,
// the notification fan-out, etc.) -- a missed or failed ping just means that one URL waits for the
// engine's next normal crawl instead of being recrawled immediately. Never worth failing or
// delaying the actual listing create/update it's called from.
export async function pingIndexNow(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        host: "marketitnow.net",
        key: INDEXNOW_KEY,
        keyLocation: `https://marketitnow.net/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
    if (!res.ok) console.error(`IndexNow ping failed (${res.status}) for ${urls.length} url(s)`);
  } catch (err) {
    console.error("IndexNow ping errored:", err);
  }
}
