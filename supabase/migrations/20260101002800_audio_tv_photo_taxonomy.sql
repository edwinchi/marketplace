-- Generated: full Audio, TV & Photo taxonomy, replacing 6 of the 7 old flat leaves
-- (Televisions is kept and reparented, not deleted) with 8 mid-level groups and their
-- real leaf categories, translated from the Marktplaats 'Audio, Tv en Foto' reference.
-- Confirmed zero listings reference any of the old leaves before writing this.
DELETE FROM category_translations WHERE category_id IN (
  SELECT id FROM categories WHERE stable_key IN (
    'audio-tv-photo-speakers', 'audio-tv-photo-headphones', 'audio-tv-photo-cameras',
    'audio-tv-photo-lenses', 'audio-tv-photo-home-cinema', 'audio-tv-photo-dj-equipment'
  )
);
DELETE FROM categories WHERE stable_key IN (
  'audio-tv-photo-speakers', 'audio-tv-photo-headphones', 'audio-tv-photo-cameras',
  'audio-tv-photo-lenses', 'audio-tv-photo-home-cinema', 'audio-tv-photo-dj-equipment'
);

-- Accessories
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) VALUES ((SELECT id FROM categories WHERE stable_key = 'audio-tv-photo'), 'audio-tv-photo-accessories', 2, 10, true, true);
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Accessories', 'audio-tv-photo-accessories' FROM categories WHERE stable_key = 'audio-tv-photo-accessories';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-accessories-batteries', 3, 10, true, true FROM categories WHERE stable_key = 'audio-tv-photo-accessories';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Batteries', 'audio-tv-photo-accessories-batteries' FROM categories WHERE stable_key = 'audio-tv-photo-accessories-batteries';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-accessories-remote-controls', 3, 20, true, true FROM categories WHERE stable_key = 'audio-tv-photo-accessories';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Remote controls', 'audio-tv-photo-accessories-remote-controls' FROM categories WHERE stable_key = 'audio-tv-photo-accessories-remote-controls';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-accessories-audio-and-tv-cables', 3, 30, true, true FROM categories WHERE stable_key = 'audio-tv-photo-accessories';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Audio and TV cables', 'audio-tv-photo-accessories-audio-and-tv-cables' FROM categories WHERE stable_key = 'audio-tv-photo-accessories-audio-and-tv-cables';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-accessories-chargers', 3, 40, true, true FROM categories WHERE stable_key = 'audio-tv-photo-accessories';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Chargers', 'audio-tv-photo-accessories-chargers' FROM categories WHERE stable_key = 'audio-tv-photo-accessories-chargers';

-- Audio
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) VALUES ((SELECT id FROM categories WHERE stable_key = 'audio-tv-photo'), 'audio-tv-photo-audio', 2, 20, true, true);
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Audio', 'audio-tv-photo-audio' FROM categories WHERE stable_key = 'audio-tv-photo-audio';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-audio-tape-recorders', 3, 10, true, true FROM categories WHERE stable_key = 'audio-tv-photo-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Tape recorders', 'audio-tv-photo-audio-tape-recorders' FROM categories WHERE stable_key = 'audio-tv-photo-audio-tape-recorders';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-audio-tube-amplifiers', 3, 20, true, true FROM categories WHERE stable_key = 'audio-tv-photo-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Tube amplifiers', 'audio-tv-photo-audio-tube-amplifiers' FROM categories WHERE stable_key = 'audio-tv-photo-audio-tube-amplifiers';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-audio-cassette-decks', 3, 30, true, true FROM categories WHERE stable_key = 'audio-tv-photo-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Cassette decks', 'audio-tv-photo-audio-cassette-decks' FROM categories WHERE stable_key = 'audio-tv-photo-audio-cassette-decks';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-audio-cd-players', 3, 40, true, true FROM categories WHERE stable_key = 'audio-tv-photo-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'CD players', 'audio-tv-photo-audio-cd-players' FROM categories WHERE stable_key = 'audio-tv-photo-audio-cd-players';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-audio-converters', 3, 50, true, true FROM categories WHERE stable_key = 'audio-tv-photo-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Converters', 'audio-tv-photo-audio-converters' FROM categories WHERE stable_key = 'audio-tv-photo-audio-converters';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-audio-home-cinema-sets', 3, 60, true, true FROM categories WHERE stable_key = 'audio-tv-photo-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Home cinema sets', 'audio-tv-photo-audio-home-cinema-sets' FROM categories WHERE stable_key = 'audio-tv-photo-audio-home-cinema-sets';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-audio-speakers', 3, 70, true, true FROM categories WHERE stable_key = 'audio-tv-photo-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Speakers', 'audio-tv-photo-audio-speakers' FROM categories WHERE stable_key = 'audio-tv-photo-audio-speakers';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-audio-turntables', 3, 80, true, true FROM categories WHERE stable_key = 'audio-tv-photo-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Turntables', 'audio-tv-photo-audio-turntables' FROM categories WHERE stable_key = 'audio-tv-photo-audio-turntables';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-audio-radios', 3, 90, true, true FROM categories WHERE stable_key = 'audio-tv-photo-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Radios', 'audio-tv-photo-audio-radios' FROM categories WHERE stable_key = 'audio-tv-photo-audio-radios';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-audio-soundbars', 3, 100, true, true FROM categories WHERE stable_key = 'audio-tv-photo-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Soundbars', 'audio-tv-photo-audio-soundbars' FROM categories WHERE stable_key = 'audio-tv-photo-audio-soundbars';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-audio-stereo-sets', 3, 110, true, true FROM categories WHERE stable_key = 'audio-tv-photo-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Stereo sets', 'audio-tv-photo-audio-stereo-sets' FROM categories WHERE stable_key = 'audio-tv-photo-audio-stereo-sets';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-audio-tuners', 3, 120, true, true FROM categories WHERE stable_key = 'audio-tv-photo-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Tuners', 'audio-tv-photo-audio-tuners' FROM categories WHERE stable_key = 'audio-tv-photo-audio-tuners';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-audio-amplifiers-and-receivers', 3, 130, true, true FROM categories WHERE stable_key = 'audio-tv-photo-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Amplifiers and receivers', 'audio-tv-photo-audio-amplifiers-and-receivers' FROM categories WHERE stable_key = 'audio-tv-photo-audio-amplifiers-and-receivers';

-- Portable Audio
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) VALUES ((SELECT id FROM categories WHERE stable_key = 'audio-tv-photo'), 'audio-tv-photo-portable-audio', 2, 30, true, true);
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Portable Audio', 'audio-tv-photo-portable-audio' FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-portable-audio-headphones', 3, 10, true, true FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Headphones', 'audio-tv-photo-portable-audio-headphones' FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio-headphones';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-portable-audio-mp3-accessories-ipod', 3, 20, true, true FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'MP3 accessories (iPod)', 'audio-tv-photo-portable-audio-mp3-accessories-ipod' FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio-mp3-accessories-ipod';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-portable-audio-mp3-accessories-other', 3, 30, true, true FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'MP3 accessories (Other)', 'audio-tv-photo-portable-audio-mp3-accessories-other' FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio-mp3-accessories-other';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-portable-audio-mp3-players-ipod', 3, 40, true, true FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'MP3 players (iPod)', 'audio-tv-photo-portable-audio-mp3-players-ipod' FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio-mp3-players-ipod';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-portable-audio-mp3-players-other', 3, 50, true, true FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'MP3 players (Other)', 'audio-tv-photo-portable-audio-mp3-players-other' FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio-mp3-players-other';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-portable-audio-mp4-players', 3, 60, true, true FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'MP4 players', 'audio-tv-photo-portable-audio-mp4-players' FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio-mp4-players';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-portable-audio-earbuds', 3, 70, true, true FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Earbuds', 'audio-tv-photo-portable-audio-earbuds' FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio-earbuds';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-portable-audio-walkmans-and-discmans', 3, 80, true, true FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Walkmans and Discmans', 'audio-tv-photo-portable-audio-walkmans-and-discmans' FROM categories WHERE stable_key = 'audio-tv-photo-portable-audio-walkmans-and-discmans';

-- Services & Professionals
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) VALUES ((SELECT id FROM categories WHERE stable_key = 'audio-tv-photo'), 'audio-tv-photo-services-professionals', 2, 40, true, true);
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Services & Professionals', 'audio-tv-photo-services-professionals' FROM categories WHERE stable_key = 'audio-tv-photo-services-professionals';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-services-professionals-film-and-video-editing', 3, 10, true, true FROM categories WHERE stable_key = 'audio-tv-photo-services-professionals';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Film and video editing', 'audio-tv-photo-services-professionals-film-and-video-editing' FROM categories WHERE stable_key = 'audio-tv-photo-services-professionals-film-and-video-editing';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-services-professionals-photographers', 3, 20, true, true FROM categories WHERE stable_key = 'audio-tv-photo-services-professionals';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Photographers', 'audio-tv-photo-services-professionals-photographers' FROM categories WHERE stable_key = 'audio-tv-photo-services-professionals-photographers';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-services-professionals-repairs', 3, 30, true, true FROM categories WHERE stable_key = 'audio-tv-photo-services-professionals';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Repairs', 'audio-tv-photo-services-professionals-repairs' FROM categories WHERE stable_key = 'audio-tv-photo-services-professionals-repairs';

-- Film & Television
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) VALUES ((SELECT id FROM categories WHERE stable_key = 'audio-tv-photo'), 'audio-tv-photo-film-television', 2, 50, true, true);
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Film & Television', 'audio-tv-photo-film-television' FROM categories WHERE stable_key = 'audio-tv-photo-film-television';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-film-television-projectors-and-projection-equipment', 3, 10, true, true FROM categories WHERE stable_key = 'audio-tv-photo-film-television';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Projectors and projection equipment', 'audio-tv-photo-film-television-projectors-and-projection-equipment' FROM categories WHERE stable_key = 'audio-tv-photo-film-television-projectors-and-projection-equipment';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-film-television-projector-accessories', 3, 20, true, true FROM categories WHERE stable_key = 'audio-tv-photo-film-television';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Projector accessories', 'audio-tv-photo-film-television-projector-accessories' FROM categories WHERE stable_key = 'audio-tv-photo-film-television-projector-accessories';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-film-television-blu-ray-players', 3, 30, true, true FROM categories WHERE stable_key = 'audio-tv-photo-film-television';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Blu-ray players', 'audio-tv-photo-film-television-blu-ray-players' FROM categories WHERE stable_key = 'audio-tv-photo-film-television-blu-ray-players';
UPDATE categories SET parent_id = (SELECT id FROM categories WHERE stable_key = 'audio-tv-photo-film-television'), level = 3, sort_order = 40 WHERE stable_key = 'audio-tv-photo-televisions';

-- Photo & Video
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) VALUES ((SELECT id FROM categories WHERE stable_key = 'audio-tv-photo'), 'audio-tv-photo-photo-video', 2, 60, true, true);
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Photo & Video', 'audio-tv-photo-photo-video' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-batteries', 3, 10, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Batteries', 'audio-tv-photo-photo-video-batteries' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-batteries';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-action-cameras', 3, 20, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Action cameras', 'audio-tv-photo-photo-video-action-cameras' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-action-cameras';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-dashcams', 3, 30, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Dashcams', 'audio-tv-photo-photo-video-dashcams' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-dashcams';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-slide-projectors', 3, 40, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Slide projectors', 'audio-tv-photo-photo-video-slide-projectors' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-slide-projectors';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-digital-photo-frames', 3, 50, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Digital photo frames', 'audio-tv-photo-photo-video-digital-photo-frames' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-digital-photo-frames';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-darkroom-accessories', 3, 60, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Darkroom accessories', 'audio-tv-photo-photo-video-darkroom-accessories' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-darkroom-accessories';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-drones', 3, 70, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Drones', 'audio-tv-photo-photo-video-drones' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-drones';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-filters', 3, 80, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Filters', 'audio-tv-photo-photo-video-filters' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-filters';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-flashes', 3, 90, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Flashes', 'audio-tv-photo-photo-video-flashes' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-flashes';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-photo-albums-and-accessories', 3, 100, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Photo albums and accessories', 'audio-tv-photo-photo-video-photo-albums-and-accessories' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-photo-albums-and-accessories';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-film-cameras', 3, 110, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Film cameras', 'audio-tv-photo-photo-video-film-cameras' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-film-cameras';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-digital-cameras', 3, 120, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Digital cameras', 'audio-tv-photo-photo-video-digital-cameras' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-digital-cameras';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-photo-frames', 3, 130, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Photo frames', 'audio-tv-photo-photo-video-photo-frames' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-photo-frames';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-photo-paper', 3, 140, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Photo paper', 'audio-tv-photo-photo-video-photo-paper' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-photo-paper';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-photo-studio-and-accessories', 3, 150, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Photo studio and accessories', 'audio-tv-photo-photo-video-photo-studio-and-accessories' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-photo-studio-and-accessories';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-camera-bags', 3, 160, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Camera bags', 'audio-tv-photo-photo-video-camera-bags' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-camera-bags';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-memory-cards', 3, 170, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Memory cards', 'audio-tv-photo-photo-video-memory-cards' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-memory-cards';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-lenses', 3, 180, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Lenses', 'audio-tv-photo-photo-video-lenses' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-lenses';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-underwater-cameras', 3, 190, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Underwater cameras', 'audio-tv-photo-photo-video-underwater-cameras' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-underwater-cameras';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-professional-equipment', 3, 200, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Professional equipment', 'audio-tv-photo-photo-video-professional-equipment' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-professional-equipment';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-tripods-and-ball-heads', 3, 210, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Tripods and ball heads', 'audio-tv-photo-photo-video-tripods-and-ball-heads' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-tripods-and-ball-heads';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-video-surveillance', 3, 220, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Video surveillance', 'audio-tv-photo-photo-video-video-surveillance' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-video-surveillance';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-analog-camcorders', 3, 230, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Analog camcorders', 'audio-tv-photo-photo-video-analog-camcorders' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-analog-camcorders';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-photo-video-digital-camcorders', 3, 240, true, true FROM categories WHERE stable_key = 'audio-tv-photo-photo-video';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Digital camcorders', 'audio-tv-photo-photo-video-digital-camcorders' FROM categories WHERE stable_key = 'audio-tv-photo-photo-video-digital-camcorders';

-- Optical Equipment
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) VALUES ((SELECT id FROM categories WHERE stable_key = 'audio-tv-photo'), 'audio-tv-photo-optical-equipment', 2, 70, true, true);
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Optical Equipment', 'audio-tv-photo-optical-equipment' FROM categories WHERE stable_key = 'audio-tv-photo-optical-equipment';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-optical-equipment-microscopes', 3, 10, true, true FROM categories WHERE stable_key = 'audio-tv-photo-optical-equipment';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Microscopes', 'audio-tv-photo-optical-equipment-microscopes' FROM categories WHERE stable_key = 'audio-tv-photo-optical-equipment-microscopes';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-optical-equipment-telescopes', 3, 20, true, true FROM categories WHERE stable_key = 'audio-tv-photo-optical-equipment';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Telescopes', 'audio-tv-photo-optical-equipment-telescopes' FROM categories WHERE stable_key = 'audio-tv-photo-optical-equipment-telescopes';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-optical-equipment-binoculars', 3, 30, true, true FROM categories WHERE stable_key = 'audio-tv-photo-optical-equipment';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Binoculars', 'audio-tv-photo-optical-equipment-binoculars' FROM categories WHERE stable_key = 'audio-tv-photo-optical-equipment-binoculars';

-- Other
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) VALUES ((SELECT id FROM categories WHERE stable_key = 'audio-tv-photo'), 'audio-tv-photo-other', 2, 80, true, true);
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Other', 'audio-tv-photo-other' FROM categories WHERE stable_key = 'audio-tv-photo-other';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-other-karaoke-equipment', 3, 10, true, true FROM categories WHERE stable_key = 'audio-tv-photo-other';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Karaoke equipment', 'audio-tv-photo-other-karaoke-equipment' FROM categories WHERE stable_key = 'audio-tv-photo-other-karaoke-equipment';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-other-professional-audio-tv-and-video-equipment', 3, 20, true, true FROM categories WHERE stable_key = 'audio-tv-photo-other';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Professional audio, TV and video equipment', 'audio-tv-photo-other-professional-audio-tv-and-video-equipment' FROM categories WHERE stable_key = 'audio-tv-photo-other-professional-audio-tv-and-video-equipment';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-other-weather-stations-and-barometers', 3, 30, true, true FROM categories WHERE stable_key = 'audio-tv-photo-other';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Weather stations and barometers', 'audio-tv-photo-other-weather-stations-and-barometers' FROM categories WHERE stable_key = 'audio-tv-photo-other-weather-stations-and-barometers';
INSERT INTO categories(parent_id, stable_key, level, sort_order, is_active, allows_listings) SELECT id, 'audio-tv-photo-other-other-audio-tv-and-photo-items', 3, 40, true, true FROM categories WHERE stable_key = 'audio-tv-photo-other';
INSERT INTO category_translations(category_id, language_code, name, slug) SELECT id, 'en', 'Other audio, TV and photo items', 'audio-tv-photo-other-other-audio-tv-and-photo-items' FROM categories WHERE stable_key = 'audio-tv-photo-other-other-audio-tv-and-photo-items';
