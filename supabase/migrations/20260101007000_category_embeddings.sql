-- Fixes AI photo analysis (app/listings/new/analyze-photo-action.ts) mis-categorizing items --
-- confirmed live: a photo of an Eastpak backpack was filed under Cars -> SUVs and crossovers. The
-- prompt asked a cheap/free vision model to pick one category name verbatim out of a list of
-- ~210, and a free-tier fallback model occasionally hallucinates a plausible-sounding but wrong
-- pick from a list that long, even though it gets the title/description right. Same class of
-- unreliability already documented for these free models elsewhere in that file (deprecated
-- models, truncated JSON, etc).
--
-- Fix: stop asking the vision model to choose a category at all. Instead, embed each leaf
-- category's own breadcrumb name once (this migration adds the column + index; the one-time
-- backfill is scripts/backfill-category-embeddings.mjs) and, at analysis time, embed the model's
-- own generated title+description and pick the nearest category by cosine similarity --
-- mirroring match_listings_by_embedding's existing pattern (20260101005700_semantic_search.sql).
-- A nearest-neighbor lookup against real categories can't hallucinate a category that doesn't
-- exist or ignore the list the way free-form generation can.
alter table categories add column if not exists name_embedding vector(1024);
create index if not exists categories_name_embedding_idx on categories using hnsw (name_embedding vector_cosine_ops);

create or replace function match_category_by_embedding(
  query_embedding vector(1024),
  match_count int default 1
)
returns table (id uuid, similarity float)
language sql stable
security definer
set search_path = public
as $$
  select c.id, 1 - (c.name_embedding <=> query_embedding) as similarity
  from categories c
  where c.is_active = true
    and c.allows_listings = true
    and c.name_embedding is not null
  order by c.name_embedding <=> query_embedding
  limit match_count;
$$;
