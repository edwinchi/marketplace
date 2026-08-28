-- Real opt-in for a monthly digital invoice email — genuinely saved even though AfroDeals has no
-- paid features to invoice for yet, same sequencing as the rest of the account preferences.
alter table profiles
  add column if not exists digital_invoice_opt_in boolean not null default false;
