// Text embeddings for semantic listing search (see supabase/migrations/20260101005700_semantic_search.sql).
// baai/bge-m3, not a free-tier model -- OpenRouter's embeddings endpoint has no free option at all,
// unlike the vision/text-completion models used elsewhere in this app -- but at $0.01/M tokens a
// listing title costs a fraction of a cent to embed, and bge-m3 is OpenRouter's own top pick for
// multilingual retrieval, which matters here since AfroDeals serves en/fr/ar/zh.
const EMBEDDING_MODEL = "baai/bge-m3";

// Best-effort by design: every caller treats a null return as "skip this enrichment" rather than
// failing the listing create/update or the search request it's part of -- semantic search is a
// relevance improvement, not something either path should ever depend on to function at all.
export async function getTextEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const input = text.trim();
  if (!apiKey || !input) return null;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        "http-referer": "https://afrodeals.net",
        "x-title": "AfroDeals",
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
    });
    if (!res.ok) {
      console.error(`Embedding request failed (${res.status}):`, await res.text().catch(() => ""));
      return null;
    }
    const json = await res.json();
    const embedding = json?.data?.[0]?.embedding;
    return Array.isArray(embedding) ? embedding : null;
  } catch (err) {
    console.error("Embedding request errored:", err);
    return null;
  }
}
