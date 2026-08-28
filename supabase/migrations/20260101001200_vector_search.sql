-- Semantic and visual listing search, adapted from the pgvector columns in
-- data/schema.sql (formerly marktplaats-multilingual-schema-v2.sql) onto the UUID listings table.
CREATE EXTENSION IF NOT EXISTS vector;

-- 1536 dims matches OpenAI text-embedding-3-small / Gemini text-embedding-004 output size.
ALTER TABLE listings ADD COLUMN title_embedding vector(1536);
-- 512 dims matches CLIP-family image embeddings, for optional visual similarity search.
ALTER TABLE listings ADD COLUMN image_embedding vector(512);

CREATE INDEX listings_title_embedding_idx ON listings
  USING hnsw (title_embedding vector_cosine_ops);
CREATE INDEX listings_image_embedding_idx ON listings
  USING hnsw (image_embedding vector_cosine_ops);

-- Embeddings are generated server-side after create/update (title+description in
-- source_language, or the primary photo) and written via the service role, alongside
-- the outbox-driven search_documents projection from 09_triggers_outbox_search.sql.
-- If per-language semantic search across listing_translations is needed later, add a
-- companion listing_translation_embeddings(listing_id, language_code, embedding) table
-- rather than widening this one — don't build it until a market actually needs it.
