-- Three Marktplaats-parity features. APPLY THIS BEFORE deploying the matching app code: the app's
-- listing queries select listings.is_reserved, so code that ships first would fail every listing
-- page until this column exists. (The column is additive -- the current code is unaffected by it.)
--
-- 1. "Reserved" ("Gereserveerd"): a seller can hold an item for a buyer without taking the listing
--    down. It stays visible with a Reserved badge; Direct Buy and new offers pause while it's set
--    (lib/payments.ts isDirectBuyEligible, app/listings/offer-actions.ts). A flag, not a new
--    status, because listing_read RLS only shows status = 'active' publicly.
-- 2. More price types (lib/price-types.ts): free, swap, see_description, on_request alongside
--    fixed/bidding. price_type has no CHECK constraint (free-form varchar since the base schema);
--    the app validates it. Sellers can now change the type when editing, so it joins the user
--    UPDATE grant (20260101008400), as does is_reserved.
-- 3. Public bid list on "bidding" listings, as Marktplaats shows it ("Biedingen"). offers stay
--    owner/buyer-only under RLS; public_bids() exposes just amount, the bidder's display name and
--    the date -- never profile ids or messages -- and only for active listings whose seller chose
--    bidding (choosing bidding is what makes bids public, the same deal as on Marktplaats).

-- 1 + 2. ---------------------------------------------------------------------------------------------
alter table listings add column if not exists is_reserved boolean not null default false;

grant update (price_type, is_reserved) on listings to authenticated;

-- 3. -------------------------------------------------------------------------------------------------
create or replace function public_bids(p_listing_id uuid)
returns table (amount_minor bigint, currency_code char(3), bidder_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select o.amount_minor,
         o.currency_code,
         -- First name only, the way Marktplaats shows bidders.
         split_part(coalesce(nullif(btrim(p.display_name), ''), p.username), ' ', 1) as bidder_name,
         o.created_at
    from offers o
    join listings l on l.id = o.listing_id
    join profiles p on p.id = o.buyer_id
   where o.listing_id = p_listing_id
     and l.status = 'active'
     and l.price_type = 'bidding'
     and p.status = 'active'
   order by o.amount_minor desc, o.created_at asc
   limit 10;
$$;

revoke all on function public_bids(uuid) from public;
grant execute on function public_bids(uuid) to anon, authenticated, service_role;
