-- Distance search ("within 10 km of 1012AB"), Marktplaats' core browse filter. locations.geog and
-- its GiST index have existed since 20260101001100, but nothing ever filled latitude/longitude, so
-- every location's geog was null. The app now geocodes each new listing's location at posting time
-- (lib/geocode.ts: PDOK for the Netherlands, OpenStreetMap Nominatim elsewhere), and an admin
-- button backfills existing ones; the locations_set_geog trigger turns lat/lng into geog as before.
--
-- search_path includes `extensions` because Supabase may have installed PostGIS there rather than
-- in public; either way the st_* calls below resolve.

-- 1. Active listings within a radius, nearest first. Ids and distances only -- the homepage
--    applies its other filters on top, with RLS, through the normal listings query.
create or replace function listing_ids_within(p_lat double precision, p_lng double precision, p_km double precision)
returns table (id uuid, distance_km double precision)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select l.id,
         st_distance(loc.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000 as distance_km
    from listings l
    join locations loc on loc.id = l.location_id
   where l.status = 'active'
     and loc.geog is not null
     and st_dwithin(loc.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, least(greatest(p_km, 1), 500) * 1000)
   order by distance_km
   limit 2000;
$$;

revoke all on function listing_ids_within(double precision, double precision, double precision) from public;
grant execute on function listing_ids_within(double precision, double precision, double precision) to anon, authenticated, service_role;

-- 2. Saved-search alerts honour a saved distance filter (filters.lat / lng / km, written by
--    saveSearch). Otherwise identical to 20260101009100.
create or replace function send_saved_search_alerts()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  s record;
  v_now timestamptz := now();
  v_term text;
  v_min bigint;
  v_max bigint;
  v_lat double precision;
  v_lng double precision;
  v_km double precision;
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
    v_term := nullif(btrim(replace(replace(coalesce(s.query_text, ''), '%', ''), ',', ' ')), '');
    v_min := case when s.filters->>'priceMinMinor' ~ '^[0-9]{1,15}$' then (s.filters->>'priceMinMinor')::bigint end;
    v_max := case when s.filters->>'priceMaxMinor' ~ '^[0-9]{1,15}$' then (s.filters->>'priceMaxMinor')::bigint end;
    v_lat := case when s.filters->>'lat' ~ '^-?[0-9]{1,3}(\.[0-9]+)?$' then (s.filters->>'lat')::double precision end;
    v_lng := case when s.filters->>'lng' ~ '^-?[0-9]{1,3}(\.[0-9]+)?$' then (s.filters->>'lng')::double precision end;
    v_km := case when s.filters->>'km' ~ '^[0-9]{1,3}$' then (s.filters->>'km')::double precision end;

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
        and (v_lat is null or v_lng is null or v_km is null
             or (loc.geog is not null
                 and st_dwithin(loc.geog, st_setsrid(st_makepoint(v_lng, v_lat), 4326)::geography, v_km * 1000)))
    )
    select count(*),
           (array_agg(id order by published_at desc))[1],
           (array_agg(title order by published_at desc))[1]
      into v_count, v_first_id, v_first_title
      from matches;

    if v_count > 0 then
      v_label := coalesce(nullif(s.name, ''), nullif(s.query_text, ''), 'your saved search');
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
