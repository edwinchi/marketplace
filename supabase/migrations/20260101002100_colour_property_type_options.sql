-- Several single_select attributes were created with zero attribute_options rows, which renders
-- as a broken empty dropdown (components/listing-attribute-field.tsx now falls back to a text
-- input defensively for any single_select with no options, but real options are still better
-- where a genuinely small fixed set exists — colour and property_type both qualify). brand and
-- material stay free-text: thousands of open-ended values, not something a fixed list fits.
with colours(stable_key, label, sort_order) as (values
  ('black','Black',10),('white','White',20),('grey','Grey',30),('silver','Silver',40),
  ('red','Red',50),('orange','Orange',60),('yellow','Yellow',70),('green','Green',80),
  ('blue','Blue',90),('purple','Purple',100),('pink','Pink',110),('brown','Brown',120),
  ('beige','Beige',130),('gold','Gold',140),('multicolour','Multicolour',150)
),
attr as (select id from attributes where stable_key = 'colour'),
inserted as (
  insert into attribute_options (attribute_id, stable_key, sort_order)
  select attr.id, colours.stable_key, colours.sort_order from colours, attr
  on conflict (attribute_id, stable_key) do update set sort_order = excluded.sort_order
  returning id, stable_key
)
insert into attribute_option_translations (option_id, language_code, label)
select inserted.id, 'en', colours.label from inserted join colours using (stable_key)
on conflict (option_id, language_code) do update set label = excluded.label;

with types(stable_key, label, sort_order) as (values
  ('house','House',10),('apartment','Apartment',20),('room','Room',30),
  ('studio','Studio',40),('commercial','Commercial property',50)
),
attr as (select id from attributes where stable_key = 'property_type'),
inserted as (
  insert into attribute_options (attribute_id, stable_key, sort_order)
  select attr.id, types.stable_key, types.sort_order from types, attr
  on conflict (attribute_id, stable_key) do update set sort_order = excluded.sort_order
  returning id, stable_key
)
insert into attribute_option_translations (option_id, language_code, label)
select inserted.id, 'en', types.label from inserted join types using (stable_key)
on conflict (option_id, language_code) do update set label = excluded.label;
