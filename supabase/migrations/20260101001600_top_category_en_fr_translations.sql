-- 04_seed.sql only gave the 36 top-level categories Dutch translations (a leftover from the
-- original NL-market draft). Launch languages are English and French (agents.md §1) — subcategories
-- already have English translations (05_subcategories.sql), but with no English name on their
-- parent, any UI resolving "en" names for top-level categories had nothing to fall back to.
-- stable_key values are already clean English-derived slugs, reused directly as the English slug.
with names(stable_key, name_en, slug_en, name_fr, slug_fr) as (values
  ('antiques-art','Antiques & Art','antiques-art','Antiquités et Art','antiquites-et-art'),
  ('audio-tv-photo','Audio, TV & Photo','audio-tv-photo','Audio, TV et Photo','audio-tv-et-photo'),
  ('cars','Cars','cars','Voitures','voitures'),
  ('car-parts','Car Parts','car-parts','Pièces automobiles','pieces-automobiles'),
  ('car-misc','Other Vehicle Items','car-misc','Divers automobile','divers-automobile'),
  ('books','Books','books','Livres','livres'),
  ('caravans-camping','Caravans & Camping','caravans-camping','Caravanes et Camping','caravanes-et-camping'),
  ('cd-dvd','CDs & DVDs','cd-dvd','CD et DVD','cd-et-dvd'),
  ('computers-software','Computers & Software','computers-software','Informatique et Logiciels','informatique-et-logiciels'),
  ('contacts-messages','Contacts & Messages','contacts-messages','Contacts et Messages','contacts-et-messages'),
  ('services-trades','Services & Tradespeople','services-trades','Services et Artisans','services-et-artisans'),
  ('animals-supplies','Animals & Supplies','animals-supplies','Animaux et Accessoires','animaux-et-accessoires'),
  ('diy-renovation','DIY & Renovation','diy-renovation','Bricolage et Rénovation','bricolage-et-renovation'),
  ('bikes-mopeds','Bikes & Mopeds','bikes-mopeds','Vélos et Scooters','velos-et-scooters'),
  ('hobbies-leisure','Hobbies & Leisure','hobbies-leisure','Loisirs','loisirs'),
  ('home-interior','Home & Interior','home-interior','Maison et Décoration','maison-et-decoration'),
  ('houses-rooms','Houses & Rooms','houses-rooms','Maisons et Chambres','maisons-et-chambres'),
  ('children-babies','Children & Babies','children-babies','Enfants et Bébés','enfants-et-bebes'),
  ('womens-clothing','Women''s Clothing','womens-clothing','Vêtements Femmes','vetements-femmes'),
  ('mens-clothing','Men''s Clothing','mens-clothing','Vêtements Hommes','vetements-hommes'),
  ('motorcycles','Motorcycles','motorcycles','Motos','motos'),
  ('music-instruments','Music & Instruments','music-instruments','Musique et Instruments','musique-et-instruments'),
  ('stamps-coins','Stamps & Coins','stamps-coins','Timbres et Monnaies','timbres-et-monnaies'),
  ('jewelry-bags-beauty','Jewelry, Bags & Beauty','jewelry-bags-beauty','Bijoux, Sacs et Beauté','bijoux-sacs-et-beaute'),
  ('consoles-games','Consoles & Games','consoles-games','Consoles et Jeux','consoles-et-jeux'),
  ('sports-fitness','Sports & Fitness','sports-fitness','Sport et Fitness','sport-et-fitness'),
  ('telecom','Telecom','telecom','Télécommunications','telecommunications'),
  ('tickets','Tickets','tickets','Billets','billets'),
  ('garden-patio','Garden & Patio','garden-patio','Jardin et Terrasse','jardin-et-terrasse'),
  ('jobs','Jobs','jobs','Emplois','emplois'),
  ('holidays','Holidays','holidays','Vacances','vacances'),
  ('collectibles','Collectibles','collectibles','Objets de Collection','objets-de-collection'),
  ('watersports-boats','Watersports & Boats','watersports-boats','Sports Nautiques et Bateaux','sports-nautiques-et-bateaux'),
  ('whitegoods-appliances','Appliances','whitegoods-appliances','Électroménager','electromenager'),
  ('business-goods','Business Goods','business-goods','Biens Professionnels','biens-professionnels'),
  ('miscellaneous','Miscellaneous','miscellaneous','Divers','divers')
)
insert into category_translations (category_id, language_code, name, slug)
select c.id, 'en', n.name_en, n.slug_en from categories c join names n using (stable_key)
union all
select c.id, 'fr', n.name_fr, n.slug_fr from categories c join names n using (stable_key)
on conflict (category_id, language_code) do update set name = excluded.name, slug = excluded.slug;
