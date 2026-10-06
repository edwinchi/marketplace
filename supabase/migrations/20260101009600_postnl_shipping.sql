-- "Ship with PostNL" for Direct Buy, the way Marktplaats' "Verzenden via Marktplaats" works: the
-- buyer picks collect-or-ship at checkout; shipping charges a fixed PostNL rate (numeric setting
-- postnl_label_price_cents) that the platform keeps -- its PostNL contract pays for the label --
-- and collects a Dutch delivery address. The seller then creates the label from
-- /my-account/transactions, which also marks the order shipped with the PostNL barcode.
--
-- orders.shipping_method: 'pickup' | 'postnl' (null on orders from before this existed).
-- orders.shipping_address: the buyer's address from Stripe Checkout, written by the webhook.
-- Neither is user-writable: orders has no user INSERT/UPDATE policy at all (service role only).
alter table orders
  add column if not exists shipping_method varchar(20),
  add column if not exists shipping_address jsonb;

-- Label PDFs. Private, and no storage policies on purpose: only the service-role client (the
-- label action) writes them, and sellers download through a short-lived signed URL issued after an
-- ownership check (app/my-account/transactions/shipping-label-actions.ts).
insert into storage.buckets (id, name, public)
values ('shipping-labels', 'shipping-labels', false)
on conflict (id) do nothing;
