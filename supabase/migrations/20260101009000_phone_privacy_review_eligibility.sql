-- 1. Phone numbers. profiles_public returned phone_number for EVERY profile to any signed-in session
--    (20260101006000), so one throwaway account could download every user's number -- buyers who
--    never published it anywhere included -- with a single REST call. The column stays (dropping it
--    from a view needs DROP VIEW, and existing selects keep working), but is now always null. The
--    only way a number leaves the server is app/listings/phone-actions.ts's revealSellerPhone:
--    signed-in, rate-limited, one active listing's seller per click.
--
-- 2. Reviews. reviews_reviewer_insert only checked reviewer_profile_id = me, so any account could
--    rate any profile -- trivially scripted 1-star campaigns against a competitor, with no
--    transaction behind them. A review now requires real contact: an order between the two
--    (beyond pending_payment), or at least one message the reviewee actually sent the reviewer.
--    Just opening a conversation doesn't count -- "Message seller" creates one in a single click.
--    Existing reviews are untouched.
--
-- 3. account_type: the app treats private -> business as one-way (a declared trader can't quietly
--    switch back -- see app/my-account/profile/edit/actions.ts), but account_type is in the user
--    UPDATE grant, so the REST API could flip it back. Enforced here for user-originated writes.

-- 1. -------------------------------------------------------------------------------------------------
create or replace view profiles_public as
select
  id,
  username,
  display_name,
  account_type,
  created_at,
  website_url,
  stripe_connect_charges_enabled,
  null::varchar as phone_number,
  business_subscription_status
from profiles;

-- 2. -------------------------------------------------------------------------------------------------
-- SECURITY DEFINER so it can see both sides of a conversation/order regardless of RLS, but it only
-- ever answers about the CALLER's own contacts (current_profile_id()), so exposing it via the API
-- leaks nothing about who anyone else talks to.
create or replace function has_interacted_with(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from conversation_participants mine
    join messages m on m.conversation_id = mine.conversation_id
    where mine.profile_id = current_profile_id()
      and m.sender_id = p_other
      and m.deleted_at is null
  ) or exists (
    select 1
    from orders o
    where o.status <> 'pending_payment'
      and ((o.buyer_id = current_profile_id() and o.seller_id = p_other)
        or (o.seller_id = current_profile_id() and o.buyer_id = p_other))
  );
$$;

revoke all on function has_interacted_with(uuid) from public, anon;
grant execute on function has_interacted_with(uuid) to authenticated, service_role;

drop policy if exists reviews_reviewer_insert on reviews;
create policy reviews_reviewer_insert on reviews for insert
  with check (reviewer_profile_id = current_profile_id() and has_interacted_with(reviewee_profile_id));

-- 3. -------------------------------------------------------------------------------------------------
-- SECURITY INVOKER: current_user is the caller's role, so only REST API writes are constrained.
create or replace function profiles_user_write_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon')
     and old.account_type = 'business'
     and new.account_type is distinct from 'business' then
    new.account_type := 'business';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_user_write_guard on profiles;
create trigger profiles_user_write_guard
  before update on profiles
  for each row execute function profiles_user_write_guard();
