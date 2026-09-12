-- Two Vinted-inspired features that don't touch the payment/fund-flow (see Terms.section6Body --
-- Direct Buy pays the seller immediately via Stripe Connect transfer, no escrow/hold exists, and
-- that stays true here; these two are shipping accountability + price-drop notifications only):
--
-- 1. Seller shipping SLA: a seller has 5 days from payment (order status funds_escrowed) to mark
--    an order shipped. Implemented as a single SECURITY DEFINER RPC rather than new RLS policies
--    because it's one narrow, one-directional transition (funds_escrowed -> item_shipped) that
--    also needs to touch shipments + notifications atomically -- matches the existing
--    reserve_ai_photo_analysis_use-style pattern used elsewhere for controlled state transitions.
-- 2. Price-drop alerts: when a listing's price drops, everyone who favorited it gets notified,
--    mirroring notify_new_listing()'s bulk-fan-out-via-INSERT-SELECT shape.

create or replace function mark_order_shipped(p_order_id uuid, p_carrier text default null, p_tracking_number text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller_id uuid;
  v_buyer_id uuid;
  v_listing_id uuid;
  v_status varchar(30);
  v_shipment_id uuid;
begin
  select seller_id, buyer_id, listing_id, status into v_seller_id, v_buyer_id, v_listing_id, v_status
  from orders where id = p_order_id for update;

  if v_seller_id is null then
    raise exception 'Order not found';
  end if;
  if v_seller_id != current_profile_id() then
    raise exception 'Only the seller can mark this order as shipped';
  end if;
  if v_status != 'funds_escrowed' then
    raise exception 'Order must be paid before it can be marked as shipped';
  end if;

  select id into v_shipment_id from shipments where order_id = p_order_id;
  if v_shipment_id is null then
    insert into shipments(order_id, carrier, tracking_number, status, shipped_at)
    values (p_order_id, nullif(p_carrier, ''), nullif(p_tracking_number, ''), 'shipped', now());
  else
    update shipments set carrier = nullif(p_carrier, ''), tracking_number = nullif(p_tracking_number, ''), status = 'shipped', shipped_at = now()
    where id = v_shipment_id;
  end if;

  update orders set status = 'item_shipped' where id = p_order_id;

  insert into notifications(profile_id, notification_type, title, body, payload)
  values (
    v_buyer_id,
    'order_shipped',
    'Your order has shipped',
    case when p_carrier is not null or p_tracking_number is not null
      then trim(concat(nullif(p_carrier, ''), case when p_tracking_number is not null then ' · ' || p_tracking_number else '' end))
      else null end,
    jsonb_build_object('order_id', p_order_id, 'listing_id', v_listing_id)
  );
end;
$$;

alter table profiles add column if not exists notify_price_drops boolean not null default true;

create or replace function notify_price_drop() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.price_minor < OLD.price_minor and NEW.status = 'active' then
    insert into notifications(profile_id, notification_type, title, payload)
    select f.profile_id, 'price_drop', 'Price drop: ' || NEW.title,
      jsonb_build_object('listing_id', NEW.id, 'old_price_minor', OLD.price_minor, 'new_price_minor', NEW.price_minor)
    from favorites f
    join profiles p on p.id = f.profile_id
    where f.listing_id = NEW.id and p.notify_price_drops = true and p.id != NEW.seller_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists listings_price_drop_notify on listings;
create trigger listings_price_drop_notify
  after update of price_minor on listings
  for each row
  execute function notify_price_drop();
