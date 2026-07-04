-- ═══════════════════════════════════════════════════════════
-- BOGAVANTE.AI — Delete the Andorra test spot + add 14 spots
-- Run this once in the Supabase SQL Editor. Safe to re-run
-- (inserts are guarded so they won't duplicate).
--
-- The 6 community members that authored these spots
-- (@sarahtravels92, @johnsmithla, @carlosgourmet, @jeanpierrefood,
--  @yukitaka, @chloesafari) live in the site's frontend as curated
-- accounts — their avatars & bios are defined in app.js. That's why
-- these spots only carry author_name (author_id stays null).
-- ═══════════════════════════════════════════════════════════

-- 1) Remove the Andorra test restaurant
delete from public.spots where country = 'Andorra';

-- 2) Add the new restaurants (idempotent: skips ones already present by name)
insert into public.spots (name, description, price, country, lat, lng, directions_url, author_name)
select v.name, '', v.price, v.country, v.lat, v.lng,
       'https://www.google.com/maps?q=' || v.lat || ',' || v.lng, v.author_name
from (values
  ('McLoons Lobster Shack',              2, 'USA',            43.9961,  -69.0976,  'sarahtravels92'),
  ('Union Oyster House',                 3, 'USA',            42.3614,  -71.0566,  'sarahtravels92'),
  ('The Lobster',                        3, 'USA',            34.0102,  -118.4960, 'johnsmithla'),
  ('Halls Harbour Lobster Pound',        2, 'Canada',         45.2006,  -64.6186,  'sarahtravels92'),
  ('Casa Solla',                         3, 'Spain',          42.4332,  -8.6791,   'carlosgourmet'),
  ('Bistrot Caraïbes',                   3, 'France',         18.1023,  -63.0568,  'jeanpierrefood'),
  ('Langosteria',                        3, 'Italy',          45.4516,  9.1724,    'jeanpierrefood'),
  ('Thalassino Ageri',                   2, 'Greece',         35.5190,  24.0329,   'jeanpierrefood'),
  ('Andrew Fairlie at Gleneagles',       3, 'United Kingdom', 56.2874,  -3.7481,   'johnsmithla'),
  ('Xin Rong Ji',                        3, 'Hong Kong',      22.2783,  114.1721,  'yukitaka'),
  ('Nozawa Bar',                         3, 'USA',            34.0664,  -118.4002, 'yukitaka'),
  ('Doyles on the Beach',                3, 'Australia',      -33.8433, 151.2801,  'johnsmithla'),
  ('La Casa de la Langosta (Puerto Nuevo)', 2, 'Mexico',      32.2234,  -116.9295, 'carlosgourmet'),
  ('The Codfather Seafood & Sushi',      2, 'South Africa',   -33.9515, 18.3781,   'chloesafari')
) as v(name, price, country, lat, lng, author_name)
where not exists (select 1 from public.spots s where s.name = v.name);
