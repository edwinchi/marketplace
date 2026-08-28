-- Backs the "Website" button on the listing detail page (seller-wide, matches Marktplaats'
-- business-seller layout) — optional, sellers set it once and it shows on every one of their
-- listings. Deliberately on profiles (every seller), not a new businesses.website_url + a whole
-- business-account registration flow neither of which exists yet — that would be far more
-- infrastructure than "add a website link" actually needs.
ALTER TABLE profiles ADD COLUMN website_url text;
