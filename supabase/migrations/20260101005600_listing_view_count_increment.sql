-- listings.view_count has existed in the schema since the base migration but nothing has ever
-- incremented it -- it reads 0 for every listing, same dead-column situation the listing detail
-- page already documented for favorite_count (worked around there by counting the favorites table
-- live instead). Seller performance insights needs a real "what gets more views" signal, so this
-- makes view_count a genuinely live counter from here forward rather than fabricating a number.
-- Atomic DB-side increment, same pattern as increment_ai_photo_analysis_uses/increment_ai_bonus_uses
-- -- a listing detail page can get concurrent hits, and a read-then-write here would undercount.
create or replace function increment_listing_view_count(p_listing_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update listings set view_count = view_count + 1 where id = p_listing_id;
$$;
