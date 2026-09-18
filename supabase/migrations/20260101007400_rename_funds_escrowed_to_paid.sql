-- orders.status = 'funds_escrowed' is a leftover label from the original held-fund-escrow plan
-- (agents.md §6, superseded -- see 20260101006900_shipping_sla_and_price_drop_alerts.sql's own
-- comment: "Direct Buy pays the seller immediately via Stripe Connect transfer, no escrow/hold
-- exists, and that stays true here"). The Terms of Service (messages/en.json section6Body) already
-- tells users this plainly, and the UI already displays this status as "Paid", not "Escrowed" --
-- only the internal value itself was still misleadingly named, real risk for a future
-- reader/agent to mistake for actual fund-holding (nearly happened in this session). Renamed to
-- 'paid', matching what actually happens and what the UI already calls it.
update orders set status = 'paid' where status = 'funds_escrowed';

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
  if v_status != 'paid' then
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
