-- Homepage placement upsell: a seller pays a flat platform fee to have their listing appear in a
-- dedicated "Featured" section on the homepage for a limited window. Distinct from the Plus/Premium
-- tier (boost_rank, 20260101008000) -- Marktplaats sells these as independent, stackable add-ons
-- (any ad type + any extra visibility option), not tiers of one another, and this app follows the
-- same shape: a nullable expiry column, not a new boost_rank value.
alter table listings add column if not exists homepage_featured_until timestamptz;

-- Same self-service-bypass concern as boost_rank/published_at before it: this is what a seller is
-- paying Stripe for, so it can't also be something they set on their own listing for free via a
-- raw REST call.
revoke update (homepage_featured_until) on listings from authenticated, anon;

-- SECURITY DEFINER, EXECUTE granted only to service_role -- only ever called from the webhook after
-- Stripe confirms payment. Extends from the later of now() or any still-active placement rather than
-- always resetting to "now() + N days", so a seller who buys another 3 days while already featured
-- gets 3 more days on top, not a wasted repurchase.
create or replace function extend_homepage_placement(p_listing_id uuid, p_days integer default 3)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status varchar(30);
  v_current timestamptz;
begin
  select status, homepage_featured_until into v_status, v_current from listings where id = p_listing_id for update;

  if v_status is null then
    raise exception 'Listing not found';
  end if;
  if v_status != 'active' then
    raise exception 'Listing must be active to be featured';
  end if;

  update listings set homepage_featured_until = greatest(now(), coalesce(v_current, now())) + (p_days || ' days')::interval where id = p_listing_id;
end;
$$;

revoke all on function extend_homepage_placement(uuid, integer) from public, anon, authenticated;
grant execute on function extend_homepage_placement(uuid, integer) to service_role;
