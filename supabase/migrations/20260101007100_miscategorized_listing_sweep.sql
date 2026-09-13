-- Daily, fully unattended sweep for listings that ended up in the wrong category -- runs via
-- pg_cron (same mechanism as run-health-check, 20260101006800), no chat session or manual trigger
-- needed. Complements the analyze-photo-action.ts fix (20260101007000_category_embeddings.sql):
-- that fix stops NEW AI-assisted listings from being mis-categorized, but does nothing for
-- listings created before it shipped, or ones a seller filed under the wrong category by hand
-- without ever using the AI photo feature.
--
-- Compares each active listing's own title_embedding (already computed at create time, see
-- lib/embeddings.ts) against its assigned category's name_embedding, and against every other real
-- category's name_embedding, using the same pgvector cosine-similarity technique as
-- match_category_by_embedding. Only auto-corrects a LARGE, confident gap between "best real match"
-- and "currently assigned category" -- this is deliberately conservative: an unattended job that
-- rewrites live listings' categories needs to catch clear, egregious mismatches (a backpack filed
-- under Cars) without also relocating a legitimately unusual-but-correct listing on a marginal
-- embedding difference. Every correction is logged for audit.
--
-- Thresholds calibrated against two real, live data points (baai/bge-m3, cosine similarity) before
-- this shipped: the actual Eastpak-backpack-under-Cars incident scored 0.32 against its wrong
-- category vs. 0.53 against the real best match (Travel bags) -- a 0.21 gap. A correctly-filed
-- control listing (a car, correctly under Cars -> Toyota at 0.60 similarity) scored 0.50 against a
-- plausible-but-wrong neighboring category in the same department -- only a 0.10 gap. The 0.45 /
-- 0.15 thresholds below sit between those two data points; revisit once this has run against more
-- real listings and category_mismatch_log has real volume to check the calibration against.
create table if not exists category_mismatch_log (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null default now(),
  listing_id uuid not null references listings(id) on delete cascade,
  listing_title text not null,
  previous_category_id uuid not null,
  corrected_category_id uuid not null,
  previous_similarity float,
  corrected_similarity float not null
);

alter table category_mismatch_log enable row level security;
-- No public policy -- service-role/admin read only, same lockdown pattern as health_check_log.

create or replace function fix_miscategorized_listings()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_best_id uuid;
  v_best_similarity float;
  v_own_similarity float;
begin
  for r in
    select l.id, l.title, l.category_id, l.title_embedding
    from listings l
    where l.status = 'active'
      and l.title_embedding is not null
  loop
    select (1 - (c.name_embedding <=> r.title_embedding))
      into v_own_similarity
      from categories c
      where c.id = r.category_id and c.name_embedding is not null;

    select c.id, (1 - (c.name_embedding <=> r.title_embedding))
      into v_best_id, v_best_similarity
      from categories c
      where c.is_active = true and c.allows_listings = true and c.name_embedding is not null
      order by c.name_embedding <=> r.title_embedding
      limit 1;

    -- Require the best real match to itself be a genuinely close fit (v_best_similarity > 0.45),
    -- AND a wide margin over whatever it's currently filed under (or no comparable score at all,
    -- e.g. the assigned category predates this migration and has no embedding yet) -- both guard
    -- against "correcting" a listing based on a weak or ambiguous signal either direction.
    if v_best_id is not null and v_best_id <> r.category_id
       and v_best_similarity > 0.45
       and (v_own_similarity is null or v_best_similarity - v_own_similarity > 0.15) then
      insert into category_mismatch_log (listing_id, listing_title, previous_category_id, corrected_category_id, previous_similarity, corrected_similarity)
      values (r.id, r.title, r.category_id, v_best_id, v_own_similarity, v_best_similarity);

      update listings set category_id = v_best_id where id = r.id;
    end if;
  end loop;

  -- 90 days of correction history is enough to spot a pattern (e.g. one category consistently
  -- attracting wrong listings) without the log growing unbounded.
  delete from category_mismatch_log where checked_at < now() - interval '90 days';
end;
$$;

select cron.schedule('fix-miscategorized-listings', '0 3 * * *', $$select fix_miscategorized_listings();$$);
