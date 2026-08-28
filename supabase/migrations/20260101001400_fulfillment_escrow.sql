-- Escrow-protected fulfillment. Adapted from the escrow state machine in
-- data/smart-locker-integration.md and the smart_locker_shipments table in
-- data/schema.sql (formerly marktplaats-multilingual-schema-v2.sql), onto the UUID orders table from
-- data/02_marketplace.sql.
--
-- orders.status carries the escrow lifecycle (no CHECK constraint, matching the
-- app-level-enum convention already used for listings.status/moderation_status):
--   pending_payment -> funds_escrowed -> item_shipped -> funds_released
--                                     \-> refunded
--                    item_shipped     -> disputed
--
-- Non-locker fulfillment (courier, local pickup) uses the same orders/status model;
-- only the release trigger differs (carrier "delivered" webhook vs locker "picked up"
-- webhook). Don't build a second transaction ledger for it.

CREATE TABLE locker_shipments(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  dropoff_locker_id varchar(100) NOT NULL,
  dropoff_box_number varchar(20),
  pickup_locker_id varchar(100) NOT NULL,
  pickup_box_number varchar(20),
  dropoff_pin varchar(20),
  pickup_pin varchar(20),
  status varchar(30) NOT NULL DEFAULT 'reserved',
  pin_delivered_to_seller boolean NOT NULL DEFAULT false,
  pin_delivered_to_buyer boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  dropped_off_at timestamptz,
  picked_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX locker_shipments_status_idx ON locker_shipments(status);

CREATE TRIGGER locker_shipments_updated_at BEFORE UPDATE ON locker_shipments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE locker_shipments ENABLE ROW LEVEL SECURITY;

-- Read-only to the order's buyer/seller. All writes (reservation, PIN generation,
-- webhook-driven status transitions) happen server-side via the service role, verified
-- against the locker partner's webhook signature before touching this table.
CREATE POLICY locker_shipment_order_party_read ON locker_shipments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_id AND (o.buyer_id = current_profile_id() OR o.seller_id = current_profile_id())
  ));
