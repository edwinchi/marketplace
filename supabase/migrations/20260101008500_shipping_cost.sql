-- A seller-set shipping cost, shown to buyers when "Shipping" is offered. Deliberately NOT a
-- carrier selector (Budbee/PostNL/DHL, matching the Marktplaats reference this was requested from)
-- -- named carrier integration needs a real signed account with that carrier first, already
-- documented as out of scope (agents.md Phase 3, components/listings/delivery-options.tsx's own
-- comment). This is just what it looks like on the surface: a plain amount the seller promises to
-- charge for shipping, same minor-units shape as price_minor, in the listing's own currency.
alter table listings add column if not exists shipping_cost_minor integer;

-- Same seller-editable column as price_minor -- additive grant on top of the whole-table lockdown
-- from 20260101008400 (GRANT is additive per-column, so this doesn't need to repeat that migration's
-- full column list).
grant update (shipping_cost_minor) on listings to authenticated;
