-- "Usually replies within an hour" on the seller card -- a trust signal Marktplaats shows on every
-- seller. Median minutes from the first message someone else sent in a conversation to the
-- seller's first reply after it, over conversations active in the last 90 days. Null until the
-- seller has replied in at least 3 conversations, so one quick (or slow) answer doesn't define them.
--
-- Returns a single aggregate number, never message content or who the seller talks to.
-- service_role only: the listing page reads it through lib/seller-response.ts, cached per seller,
-- so it isn't recomputed on every page view.
create or replace function seller_response_minutes(p_profile_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with asked as (
    select cp.conversation_id,
           (select min(m.created_at)
              from messages m
             where m.conversation_id = cp.conversation_id
               and m.sender_id <> p_profile_id
               and m.deleted_at is null
               and m.created_at > now() - interval '90 days') as asked_at
      from conversation_participants cp
     where cp.profile_id = p_profile_id
  ),
  replied as (
    select a.asked_at,
           (select min(m.created_at)
              from messages m
             where m.conversation_id = a.conversation_id
               and m.sender_id = p_profile_id
               and m.deleted_at is null
               and m.created_at > a.asked_at) as replied_at
      from asked a
     where a.asked_at is not null
  )
  select case
           when count(*) >= 3
           then round(percentile_cont(0.5) within group (order by extract(epoch from (replied_at - asked_at)) / 60))::integer
         end
    from replied
   where replied_at is not null;
$$;

revoke all on function seller_response_minutes(uuid) from public, anon, authenticated;
grant execute on function seller_response_minutes(uuid) to service_role;
