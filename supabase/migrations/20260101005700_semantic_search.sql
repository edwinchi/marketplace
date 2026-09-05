-- Wires up the pgvector columns from 20260101001200_vector_search.sql, which existed in the
-- schema but were never populated or queried by any app code. title_embedding was sized for
-- OpenAI text-embedding-3-small (1536 dims) -- the model actually used here is OpenRouter's
-- baai/bge-m3 instead (no OpenAI key is configured, and bge-m3 is OpenRouter's own top multilingual
-- recommendation, which matters more here than for an English-only site given AfroDeals serves
-- en/fr/ar/zh). bge-m3 outputs 1024 dims, not 1536. Safe to resize now since the column has never
-- actually been populated -- dropping and re-adding rather than a same-column type change since
-- pgvector doesn't support directly altering a vector column's dimension in place.
alter table listings drop column if exists title_embedding;
alter table listings add column title_embedding vector(1024);
create index listings_title_embedding_idx on listings using hnsw (title_embedding vector_cosine_ops);

-- Ordering by embedding distance (the <=> operator) isn't expressible through PostgREST's query
-- builder, so this is exposed as an RPC the app calls via supabase.rpc(...) -- the standard
-- Supabase/pgvector pattern. Returns ids + a similarity score (not full rows) so the caller
-- re-fetches through the normal RLS-respecting client and keeps one single place responsible for
-- listing shape/joins (app/page.tsx), rather than duplicating that select list here.
create or replace function match_listings_by_embedding(
  query_embedding vector(1024),
  filter_category_ids uuid[] default null,
  filter_city text default null,
  match_count int default 30
)
returns table (id uuid, similarity float)
language sql stable
security definer
set search_path = public
as $$
  select l.id, 1 - (l.title_embedding <=> query_embedding) as similarity
  from listings l
  left join locations loc on loc.id = l.location_id
  where l.status = 'active'
    and l.title_embedding is not null
    and (filter_category_ids is null or l.category_id = any(filter_category_ids))
    and (filter_city is null or loc.city ilike filter_city)
  order by l.title_embedding <=> query_embedding
  limit match_count;
$$;
