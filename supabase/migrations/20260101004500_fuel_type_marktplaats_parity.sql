-- Expands fuel_type's options to match Marktplaats.nl's 9-value Brandstof filter (source:
-- car.md, captured 2026-09-02) -- splits the generic "Hybrid" into petrol/diesel-based hybrids
-- (the two real categories buyers actually search by), and adds CNG and a catch-all "Other".
-- Existing 'hybrid' rows are left as-is (not deleted/renamed) so listings already tagged with it
-- stay valid; it just stops being the only hybrid option going forward.
WITH x AS (SELECT id FROM attributes WHERE stable_key='fuel_type'), o AS (INSERT INTO attribute_options(attribute_id,stable_key,sort_order) SELECT id,'hybrid_petrol',31 FROM x ON CONFLICT(attribute_id,stable_key) DO UPDATE SET sort_order=EXCLUDED.sort_order RETURNING id) INSERT INTO attribute_option_translations(option_id,language_code,label) SELECT id,'en','Hybrid (Petrol)' FROM o ON CONFLICT DO NOTHING;
WITH x AS (SELECT id FROM attributes WHERE stable_key='fuel_type'), o AS (INSERT INTO attribute_options(attribute_id,stable_key,sort_order) SELECT id,'hybrid_diesel',32 FROM x ON CONFLICT(attribute_id,stable_key) DO UPDATE SET sort_order=EXCLUDED.sort_order RETURNING id) INSERT INTO attribute_option_translations(option_id,language_code,label) SELECT id,'en','Hybrid (Diesel)' FROM o ON CONFLICT DO NOTHING;
WITH x AS (SELECT id FROM attributes WHERE stable_key='fuel_type'), o AS (INSERT INTO attribute_options(attribute_id,stable_key,sort_order) SELECT id,'cng',45 FROM x ON CONFLICT(attribute_id,stable_key) DO UPDATE SET sort_order=EXCLUDED.sort_order RETURNING id) INSERT INTO attribute_option_translations(option_id,language_code,label) SELECT id,'en','CNG' FROM o ON CONFLICT DO NOTHING;
WITH x AS (SELECT id FROM attributes WHERE stable_key='fuel_type'), o AS (INSERT INTO attribute_options(attribute_id,stable_key,sort_order) SELECT id,'other',60 FROM x ON CONFLICT(attribute_id,stable_key) DO UPDATE SET sort_order=EXCLUDED.sort_order RETURNING id) INSERT INTO attribute_option_translations(option_id,language_code,label) SELECT id,'en','Other' FROM o ON CONFLICT DO NOTHING;

-- Fix a label casing typo from the original seed ("Lpg" -> "LPG") while touching this attribute.
UPDATE attribute_option_translations SET label='LPG'
WHERE language_code='en' AND label='Lpg'
  AND option_id IN (SELECT id FROM attribute_options WHERE stable_key='lpg' AND attribute_id=(SELECT id FROM attributes WHERE stable_key='fuel_type'));
