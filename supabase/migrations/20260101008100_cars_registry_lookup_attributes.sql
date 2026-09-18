-- Adds the remaining fields the RDW plate-lookup display (components/plate-lookup.tsx's own
-- Basics/Technical/Environment tabs) already shows read-only but that had no home as an actual
-- listing attribute: doors, seats, MOT/APK expiry, fuel consumption, CO2 emissions, energy label.
-- Every one of these is a field lib/rdw.ts already fetches (VehicleLookupResult.doors/seats/
-- motExpiresAt/fuelConsumptionL100km/co2GramsPerKm/energyLabel) -- this migration is pure data, the
-- mapping itself lives in lib/vehicle-listing-defaults.ts.
BEGIN;

INSERT INTO attributes(stable_key,data_type,unit_code) VALUES('doors','integer',NULL) ON CONFLICT(stable_key) DO NOTHING;
INSERT INTO attribute_translations(attribute_id,language_code,name) SELECT id,'en','Doors' FROM attributes WHERE stable_key='doors' ON CONFLICT DO NOTHING;
INSERT INTO attributes(stable_key,data_type,unit_code) VALUES('seats','integer',NULL) ON CONFLICT(stable_key) DO NOTHING;
INSERT INTO attribute_translations(attribute_id,language_code,name) SELECT id,'en','Seats' FROM attributes WHERE stable_key='seats' ON CONFLICT DO NOTHING;
INSERT INTO attributes(stable_key,data_type,unit_code) VALUES('mot_expiry','date',NULL) ON CONFLICT(stable_key) DO NOTHING;
INSERT INTO attribute_translations(attribute_id,language_code,name) SELECT id,'en','MOT / APK Expiry' FROM attributes WHERE stable_key='mot_expiry' ON CONFLICT DO NOTHING;
INSERT INTO attributes(stable_key,data_type,unit_code) VALUES('fuel_consumption','decimal','l/100km') ON CONFLICT(stable_key) DO NOTHING;
INSERT INTO attribute_translations(attribute_id,language_code,name) SELECT id,'en','Fuel Consumption' FROM attributes WHERE stable_key='fuel_consumption' ON CONFLICT DO NOTHING;
INSERT INTO attributes(stable_key,data_type,unit_code) VALUES('co2_emissions','integer','g/km') ON CONFLICT(stable_key) DO NOTHING;
INSERT INTO attribute_translations(attribute_id,language_code,name) SELECT id,'en','CO2 Emissions' FROM attributes WHERE stable_key='co2_emissions' ON CONFLICT DO NOTHING;
INSERT INTO attributes(stable_key,data_type,unit_code) VALUES('energy_label','single_select',NULL) ON CONFLICT(stable_key) DO NOTHING;
INSERT INTO attribute_translations(attribute_id,language_code,name) SELECT id,'en','Energy Label' FROM attributes WHERE stable_key='energy_label' ON CONFLICT DO NOTHING;

INSERT INTO category_attributes(category_id,attribute_id,is_required,is_search_filter) SELECT c.id,a.id,false,true FROM categories c,attributes a WHERE c.stable_key='cars' AND a.stable_key='doors' ON CONFLICT DO NOTHING;
INSERT INTO category_attributes(category_id,attribute_id,is_required,is_search_filter) SELECT c.id,a.id,false,true FROM categories c,attributes a WHERE c.stable_key='cars' AND a.stable_key='seats' ON CONFLICT DO NOTHING;
INSERT INTO category_attributes(category_id,attribute_id,is_required,is_search_filter) SELECT c.id,a.id,false,false FROM categories c,attributes a WHERE c.stable_key='cars' AND a.stable_key='mot_expiry' ON CONFLICT DO NOTHING;
INSERT INTO category_attributes(category_id,attribute_id,is_required,is_search_filter) SELECT c.id,a.id,false,false FROM categories c,attributes a WHERE c.stable_key='cars' AND a.stable_key='fuel_consumption' ON CONFLICT DO NOTHING;
INSERT INTO category_attributes(category_id,attribute_id,is_required,is_search_filter) SELECT c.id,a.id,false,false FROM categories c,attributes a WHERE c.stable_key='cars' AND a.stable_key='co2_emissions' ON CONFLICT DO NOTHING;
INSERT INTO category_attributes(category_id,attribute_id,is_required,is_search_filter) SELECT c.id,a.id,false,true FROM categories c,attributes a WHERE c.stable_key='cars' AND a.stable_key='energy_label' ON CONFLICT DO NOTHING;

-- energy_label options -- real EU energy label letters, the only values RDW's zuinigheidsclassificatie
-- ever returns (verified live: "A" for the test plate used to build this feature).
WITH x AS (SELECT id FROM attributes WHERE stable_key='energy_label'), o AS (INSERT INTO attribute_options(attribute_id,stable_key,sort_order) SELECT id,'a',0 FROM x ON CONFLICT(attribute_id,stable_key) DO UPDATE SET sort_order=EXCLUDED.sort_order RETURNING id) INSERT INTO attribute_option_translations(option_id,language_code,label) SELECT id,'en','A' FROM o ON CONFLICT DO NOTHING;
WITH x AS (SELECT id FROM attributes WHERE stable_key='energy_label'), o AS (INSERT INTO attribute_options(attribute_id,stable_key,sort_order) SELECT id,'b',10 FROM x ON CONFLICT(attribute_id,stable_key) DO UPDATE SET sort_order=EXCLUDED.sort_order RETURNING id) INSERT INTO attribute_option_translations(option_id,language_code,label) SELECT id,'en','B' FROM o ON CONFLICT DO NOTHING;
WITH x AS (SELECT id FROM attributes WHERE stable_key='energy_label'), o AS (INSERT INTO attribute_options(attribute_id,stable_key,sort_order) SELECT id,'c',20 FROM x ON CONFLICT(attribute_id,stable_key) DO UPDATE SET sort_order=EXCLUDED.sort_order RETURNING id) INSERT INTO attribute_option_translations(option_id,language_code,label) SELECT id,'en','C' FROM o ON CONFLICT DO NOTHING;
WITH x AS (SELECT id FROM attributes WHERE stable_key='energy_label'), o AS (INSERT INTO attribute_options(attribute_id,stable_key,sort_order) SELECT id,'d',30 FROM x ON CONFLICT(attribute_id,stable_key) DO UPDATE SET sort_order=EXCLUDED.sort_order RETURNING id) INSERT INTO attribute_option_translations(option_id,language_code,label) SELECT id,'en','D' FROM o ON CONFLICT DO NOTHING;
WITH x AS (SELECT id FROM attributes WHERE stable_key='energy_label'), o AS (INSERT INTO attribute_options(attribute_id,stable_key,sort_order) SELECT id,'e',40 FROM x ON CONFLICT(attribute_id,stable_key) DO UPDATE SET sort_order=EXCLUDED.sort_order RETURNING id) INSERT INTO attribute_option_translations(option_id,language_code,label) SELECT id,'en','E' FROM o ON CONFLICT DO NOTHING;
WITH x AS (SELECT id FROM attributes WHERE stable_key='energy_label'), o AS (INSERT INTO attribute_options(attribute_id,stable_key,sort_order) SELECT id,'f',50 FROM x ON CONFLICT(attribute_id,stable_key) DO UPDATE SET sort_order=EXCLUDED.sort_order RETURNING id) INSERT INTO attribute_option_translations(option_id,language_code,label) SELECT id,'en','F' FROM o ON CONFLICT DO NOTHING;
WITH x AS (SELECT id FROM attributes WHERE stable_key='energy_label'), o AS (INSERT INTO attribute_options(attribute_id,stable_key,sort_order) SELECT id,'g',60 FROM x ON CONFLICT(attribute_id,stable_key) DO UPDATE SET sort_order=EXCLUDED.sort_order RETURNING id) INSERT INTO attribute_option_translations(option_id,language_code,label) SELECT id,'en','G' FROM o ON CONFLICT DO NOTHING;

COMMIT;
