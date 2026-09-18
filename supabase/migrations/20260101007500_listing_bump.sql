-- Premium visibility upsell ("Omhoogbellen"/ad-bump equivalent): a seller pays a small
-- platform-charged fee (no Stripe Connect transfer -- this is platform revenue, not a
-- peer-to-peer payment, so it doesn't depend on the seller's own Connect onboarding status like
-- Direct Buy does) to move their listing back to the top of recency-sorted feeds. Reuses
-- listings.published_at as the sort key instead of adding a new column: every browse/search query
-- in the app already orders by published_at desc, so a bump is just "republish", with zero changes
-- needed to any existing query. Matches the actual Marktplaats behavior this is modeled on.
--
-- published_at was, until now, only ever set once at creation (app/listings/actions.ts, a plain
-- INSERT) -- no existing code path updates it, confirmed by reading every write site. Revoking
-- column-level UPDATE from authenticated/anon closes what would otherwise be a free self-serve
-- bump (a seller could already PATCH their own listing's published_at directly via the REST API,
-- since the existing listing_write RLS policy is row-level, not column-level) without touching any
-- other column's writability or breaking any existing flow.
revoke update (published_at) on listings from authenticated, anon;

-- SECURITY DEFINER, EXECUTE granted only to service_role: this must only ever run after Stripe
-- confirms payment (the webhook), never directly from a signed-in seller's own session -- unlike
-- mark_order_shipped (a real action a seller legitimately triggers themselves once paid), a bump
-- is the thing being paid for, so it can't also be self-service.
create or replace function bump_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status varchar(30);
  v_published_at timestamptz;
begin
  select status, published_at into v_status, v_published_at from listings where id = p_listing_id for update;

  if v_status is null then
    raise exception 'Listing not found';
  end if;
  if v_status != 'active' then
    raise exception 'Listing must be active to be bumped';
  end if;
  if v_published_at is not null and v_published_at > now() - interval '24 hours' then
    raise exception 'This listing was already bumped in the last 24 hours';
  end if;

  update listings set published_at = now() where id = p_listing_id;
end;
$$;

revoke all on function bump_listing(uuid) from public, anon, authenticated;
grant execute on function bump_listing(uuid) to service_role;
