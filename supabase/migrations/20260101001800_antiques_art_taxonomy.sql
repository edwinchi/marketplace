-- Antiques & Art had zero subcategories (unlike most other top-level categories, which got a
-- level-2 pass in 05_subcategories.sql). Adds a proper level-2 + level-3 tree, structurally
-- inspired by general antiques/art groupings (tableware, household items, furniture, restoration
-- services, fine art, paintings) — an original taxonomy, not a copy of any one site's, per the
-- legal note in agents.md §4.
begin;

with l2(stable_key, name_en, slug_en, name_fr, slug_fr, sort_order) as (values
  ('antiques-art-tableware','Tableware','antiques-art-tableware','Vaisselle','vaisselle',10),
  ('antiques-art-household','Household Items','antiques-art-household','Objets ménagers','objets-menagers',20),
  ('antiques-art-furniture','Furniture','antiques-art-furniture','Meubles','meubles',30),
  ('antiques-art-curios','Curios & Brocante','antiques-art-curios','Curiosités et Brocante','curiosites-et-brocante',40),
  ('antiques-art-services','Restoration Services','antiques-art-services','Services de Restauration','services-de-restauration',50),
  ('antiques-art-fine-art','Art','antiques-art-fine-art','Art','art',60),
  ('antiques-art-paintings','Paintings','antiques-art-paintings','Peintures','peintures',70)
),
parent as (select id from categories where stable_key = 'antiques-art'),
inserted_l2 as (
  insert into categories (parent_id, stable_key, level, sort_order)
  select parent.id, l2.stable_key, 2, l2.sort_order from l2, parent
  on conflict (stable_key) do update set sort_order = excluded.sort_order
  returning id, stable_key
)
insert into category_translations (category_id, language_code, name, slug)
select inserted_l2.id, 'en', l2.name_en, l2.slug_en from inserted_l2 join l2 using (stable_key)
union all
select inserted_l2.id, 'fr', l2.name_fr, l2.slug_fr from inserted_l2 join l2 using (stable_key)
on conflict (category_id, language_code) do update set name = excluded.name, slug = excluded.slug;

with l3(parent_key, stable_key, name_en, slug_en, name_fr, slug_fr, sort_order) as (values
  ('antiques-art-tableware','antiques-art-tableware-cutlery','Cutlery','cutlery','Couverts','couverts',10),
  ('antiques-art-tableware','antiques-art-tableware-bowls','Bowls','bowls','Bols','bols',20),
  ('antiques-art-tableware','antiques-art-tableware-service-sets','Plates & Service Sets','plates-and-service-sets','Assiettes et Services','assiettes-et-services',30),

  ('antiques-art-household','antiques-art-household-books','Books & Bibles','books-and-bibles','Livres et Bibles','livres-et-bibles',10),
  ('antiques-art-household','antiques-art-household-glass-crystal','Glass & Crystal','glass-and-crystal','Verre et Cristal','verre-et-cristal',20),
  ('antiques-art-household','antiques-art-household-silver-gold','Gold & Silver','gold-and-silver','Or et Argent','or-et-argent',30),
  ('antiques-art-household','antiques-art-household-candlesticks','Candlesticks','candlesticks','Chandeliers','chandeliers',40),
  ('antiques-art-household','antiques-art-household-ceramics','Ceramics & Earthenware','ceramics-and-earthenware','Céramique et Faïence','ceramique-et-faience',50),
  ('antiques-art-household','antiques-art-household-clocks','Clocks','clocks','Horloges','horloges',60),
  ('antiques-art-household','antiques-art-household-copper-bronze','Copper & Bronze','copper-and-bronze','Cuivre et Bronze','cuivre-et-bronze',70),
  ('antiques-art-household','antiques-art-household-lamps','Lamps','lamps','Lampes','lampes',80),
  ('antiques-art-household','antiques-art-household-porcelain','Porcelain','porcelain','Porcelaine','porcelaine',90),
  ('antiques-art-household','antiques-art-household-mirrors','Mirrors','mirrors','Miroirs','miroirs',100),
  ('antiques-art-household','antiques-art-household-vases','Vases','vases','Vases','vases',110),
  ('antiques-art-household','antiques-art-household-tiles','Wall Plaques & Tiles','wall-plaques-and-tiles','Plaques Murales et Carreaux','plaques-murales-et-carreaux',120),
  ('antiques-art-household','antiques-art-household-other','Other Household Antiques','other-household-antiques','Autres Antiquités Ménagères','autres-antiquites-menageres',130),

  ('antiques-art-furniture','antiques-art-furniture-beds','Beds','antique-beds','Lits','lits',10),
  ('antiques-art-furniture','antiques-art-furniture-cabinets','Cabinets','cabinets','Armoires','armoires',20),
  ('antiques-art-furniture','antiques-art-furniture-chairs','Chairs & Benches','chairs-and-benches','Chaises et Bancs','chaises-et-bancs',30),
  ('antiques-art-furniture','antiques-art-furniture-tables','Tables','antique-tables','Tables','tables-antiques',40),

  ('antiques-art-curios','antiques-art-curios-general','Curios & Brocante','curios-and-brocante','Curiosités et Brocante','curiosites-et-brocante-2',10),

  ('antiques-art-services','antiques-art-services-silversmiths','Silversmiths & Jewelry Makers','silversmiths-and-jewelry-makers','Orfèvres et Bijoutiers','orfevres-et-bijoutiers',10),
  ('antiques-art-services','antiques-art-services-photographers','Photographers','photographers','Photographes','photographes',20),
  ('antiques-art-services','antiques-art-services-portrait-artists','Artists & Portrait Painters','artists-and-portrait-painters','Artistes et Portraitistes','artistes-et-portraitistes',30),
  ('antiques-art-services','antiques-art-services-repair','Repair & Restoration','repair-and-restoration','Réparation et Restauration','reparation-et-restauration',40),
  ('antiques-art-services','antiques-art-services-furniture-makers','Carpenters & Furniture Makers','carpenters-and-furniture-makers','Menuisiers et Ébénistes','menuisiers-et-ebenistes',50),

  ('antiques-art-fine-art','antiques-art-fine-art-sculptures','Sculptures & Woodcarving','sculptures-and-woodcarving','Sculptures et Bois Sculpté','sculptures-et-bois-sculpte',10),
  ('antiques-art-fine-art','antiques-art-fine-art-design','Design Objects','design-objects','Objets de Design','objets-de-design',20),
  ('antiques-art-fine-art','antiques-art-fine-art-etchings','Etchings & Engravings','etchings-and-engravings','Eaux-fortes et Gravures','eaux-fortes-et-gravures',30),
  ('antiques-art-fine-art','antiques-art-fine-art-prints','Lithographs & Prints','lithographs-and-prints','Lithographies et Estampes','lithographies-et-estampes',40),
  ('antiques-art-fine-art','antiques-art-fine-art-non-western','Non-Western Art','non-western-art','Art Non-Occidental','art-non-occidental',50),
  ('antiques-art-fine-art','antiques-art-fine-art-drawings','Drawings & Photography','drawings-and-photography','Dessins et Photographie','dessins-et-photographie',60),
  ('antiques-art-fine-art','antiques-art-fine-art-other','Other Art','other-art','Autres Œuvres d''Art','autres-oeuvres-dart',70),

  ('antiques-art-paintings','antiques-art-paintings-abstract','Abstract','abstract-paintings','Abstrait','abstrait',10),
  ('antiques-art-paintings','antiques-art-paintings-classic','Classic','classic-paintings','Classique','classique',20),
  ('antiques-art-paintings','antiques-art-paintings-modern','Modern','modern-paintings','Moderne','moderne',30)
),
parents as (select id, stable_key from categories where level = 2),
inserted_l3 as (
  insert into categories (parent_id, stable_key, level, sort_order)
  select parents.id, l3.stable_key, 3, l3.sort_order
  from l3 join parents on parents.stable_key = l3.parent_key
  on conflict (stable_key) do update set sort_order = excluded.sort_order
  returning id, stable_key
)
insert into category_translations (category_id, language_code, name, slug)
select inserted_l3.id, 'en', l3.name_en, l3.slug_en from inserted_l3 join l3 using (stable_key)
union all
select inserted_l3.id, 'fr', l3.name_fr, l3.slug_fr from inserted_l3 join l3 using (stable_key)
on conflict (category_id, language_code) do update set name = excluded.name, slug = excluded.slug;

commit;
