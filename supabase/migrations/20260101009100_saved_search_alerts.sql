-- Saved-search alerts -- Marktplaats' core retention loop ("new results for your search"). Saved
-- searches have existed since the base schema, with notify_push/notify_email toggles on
-- /my-account/saved-searches, but nothing ever checked them for new matches: saving a search did
-- nothing at all.
--
-- send_saved_search_alerts() runs hourly via pg_cron (same pattern as expire-stale-listings). For
-- each active search with in-app alerts on, it finds listings published since that search's
-- last_alerted_at using the same filters the homepage applies (app/page.tsx): keyword in title or
-- description, category plus every descendant, city, price range, condition. It writes ONE
-- notification per search per run -- a digest, not one row per listing -- then advances
-- last_alerted_at. The seller's own listings never match their own searches.
--
-- Email alerts (notify_email) are not sent yet: lib/resend.ts still uses Resend's sandbox sender,
-- which can only deliver to the account owner, until marketitnow.net is verified in Resend.
--
-- filters (jsonb, written by app/my-account/saved-searches/actions.ts):
--   city, condition, priceMinMinor, priceMaxMinor (app ×100 minor units), url (the results page).

alter table saved_searches
  add column if not exists last_alerted_at timestamptz not null default now();

create or replace function send_saved_search_alerts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  v_now timestamptz := now();
  v_term text;
  v_min bigint;
  v_max bigint;
  v_count integer;
  v_first_id uuid;
  v_first_title text;
  v_url text;
  v_label text;
begin
  for s in
    select ss.*
    from saved_searches ss
    join profiles p on p.id = ss.profile_id
    where ss.is_active and ss.notify_push and p.status = 'active'
  loop
    -- Same sanitizing as the homepage's .or() filter; malformed numbers are ignored rather than
    -- cast (a bad cast would abort the whole run for every user).
    v_term := nullif(btrim(replace(replace(coalesce(s.query_text, ''), '%', ''), ',', ' ')), '');
    v_min := case when s.filters->>'priceMinMinor' ~ '^[0-9]{1,15}$' then (s.filters->>'priceMinMinor')::bigint end;
    v_max := case when s.filters->>'priceMaxMinor' ~ '^[0-9]{1,15}$' then (s.filters->>'priceMaxMinor')::bigint end;

    with recursive cats as (
      select c.id from categories c where c.id = s.category_id
      union all
      select c.id from categories c join cats on c.parent_id = cats.id
    ),
    matches as (
      select l.id, l.title, l.published_at
      from listings l
      left join locations loc on loc.id = l.location_id
      where l.status = 'active'
        and l.published_at > s.last_alerted_at
        and l.published_at <= v_now
        and l.seller_id <> s.profile_id
        and (s.category_id is null or l.category_id in (select id from cats))
        and (v_term is null or l.title ilike '%' || v_term || '%' or l.description ilike '%' || v_term || '%')
        and (nullif(s.filters->>'city', '') is null or loc.city ilike s.filters->>'city')
        and (v_min is null or l.price_minor >= v_min)
        and (v_max is null or l.price_minor <= v_max)
        and (nullif(s.filters->>'condition', '') is null or l.condition_code = s.filters->>'condition')
    )
    select count(*),
           (array_agg(id order by published_at desc))[1],
           (array_agg(title order by published_at desc))[1]
      into v_count, v_first_id, v_first_title
      from matches;

    if v_count > 0 then
      v_label := coalesce(nullif(s.name, ''), nullif(s.query_text, ''), 'your saved search');
      -- Only a same-site relative path is ever linked from the notification.
      v_url := case
        when s.filters->>'url' like '/%' and s.filters->>'url' not like '//%' then s.filters->>'url'
        else '/my-account/saved-searches'
      end;
      insert into notifications (profile_id, notification_type, title, body, payload)
      values (
        s.profile_id,
        'saved_search_match',
        case when v_count = 1
          then left('New listing for "' || v_label || '"', 200)
          else left(v_count || ' new listings for "' || v_label || '"', 200)
        end,
        case when v_count = 1 then v_first_title else 'Latest: ' || v_first_title end,
        case when v_count = 1
          then jsonb_build_object('saved_search_id', s.id, 'listing_id', v_first_id)
          else jsonb_build_object('saved_search_id', s.id, 'url', v_url)
        end
      );
    end if;

    update saved_searches set last_alerted_at = v_now where id = s.id;
  end loop;
end;
$$;

revoke all on function send_saved_search_alerts() from public, anon, authenticated;
grant execute on function send_saved_search_alerts() to service_role;

select cron.unschedule('saved-search-alerts') where exists (select 1 from cron.job where jobname = 'saved-search-alerts');
select cron.schedule('saved-search-alerts', '15 * * * *', $$select send_saved_search_alerts();$$);
