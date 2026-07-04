-- ═══════════════════════════════════════════════════════════
-- BOGAVANTE.AI — Supabase setup
-- Run this ONCE in: supabase.com → your project → SQL Editor
-- ═══════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── PROFILES ────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null check (username ~ '^[a-z0-9_]{2,24}$'),
  avatar     text,            -- emoji or 1-2 uppercase initials
  avatar_bg  text,            -- hex background color of the avatar disc
  bio        text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id);

-- ── SPOTS ───────────────────────────────────────────────────
create table if not exists public.spots (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 1 and 80),
  description    text not null default '' check (char_length(description) <= 200),
  price          int  not null check (price between 1 and 3),
  country        text not null check (char_length(country) between 1 and 40),
  lat            double precision not null check (lat between -90 and 90),
  lng            double precision not null check (lng between -180 and 180),
  directions_url text,
  last_visited   date,
  author_id      uuid references public.profiles(id) on delete set null,
  author_name    text not null,
  created_at     timestamptz not null default now()
);

alter table public.spots enable row level security;

create policy "Spots are viewable by everyone"
  on public.spots for select using (true);

create policy "Logged-in users can add spots as themselves"
  on public.spots for insert to authenticated
  with check (auth.uid() = author_id);

-- Rate limit: max 3 spots per 24 hours per user (@ignacio is exempt)
create or replace function public.check_spot_rate_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  uname text;
begin
  if new.author_id is null then
    return new;
  end if;

  select username into uname from public.profiles where id = new.author_id;
  if uname = 'ignacio' then
    return new; -- the captain adds as many as he wants
  end if;

  if (select count(*) from public.spots
      where author_id = new.author_id
        and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'RATE_LIMIT: max 3 spots per 24 hours';
  end if;
  return new;
end;
$$;

drop trigger if exists spots_rate_limit on public.spots;
create trigger spots_rate_limit
  before insert on public.spots
  for each row execute function public.check_spot_rate_limit();

-- ── RATINGS ─────────────────────────────────────────────────
create table if not exists public.ratings (
  spot_id    uuid not null references public.spots(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  stars      int  not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (spot_id, user_id)
);

alter table public.ratings enable row level security;

create policy "Ratings are viewable by everyone"
  on public.ratings for select using (true);

create policy "Users can rate as themselves"
  on public.ratings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can change their own rating"
  on public.ratings for update to authenticated
  using (auth.uid() = user_id);

-- ── AUTO-CLAIM: when Ignacio signs up, create his profile and
--    attach the 12 seed spots to his account ─────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.email = 'nachomanzano.1@gmail.com' then
    insert into public.profiles (id, username)
    values (new.id, 'ignacio')
    on conflict (id) do nothing;

    update public.spots
    set author_id = new.id
    where author_name = 'ignacio' and author_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── SEED: the original 12 spots (attributed to @ignacio) ────
-- Guarded so re-running this script never duplicates them.
do $seed$
begin
if not exists (select 1 from public.spots) then
insert into public.spots (name, description, price, country, lat, lng, directions_url, last_visited, author_name) values
  ('The Stoned Crab',            'Best Lobster in the Keys',                2, 'USA',         24.7136,            -81.0785,           'https://maps.app.goo.gl/rkJcZKvjPFn9df6k6', '2025-07-15', 'ignacio'),
  ('Carmín',                     'Very bad Lobster, Taste Poorly.',         1, 'Puerto Rico', 18.4578102,         -65.9861679,        'https://maps.app.goo.gl/N4hiwDeJFzzavsQu6', '2024-04-15', 'ignacio'),
  ('Hoy Como Ayer',              'Great Lobster',                           1, 'Puerto Rico', 18.13894,           -67.18094,          'https://maps.app.goo.gl/PZjXokodTxpbyG8CA', '2022-12-15', 'ignacio'),
  ('Los Montes de Galicia',      'Expensive Lobster and very bad taste.',   3, 'Spain',       40.434849,          -3.668375,          'https://maps.app.goo.gl/2BarrHgRBNxBKqf39', '2026-02-15', 'ignacio'),
  ('Casa Gallega',               'Best Lobster in Madrid.',                 3, 'Spain',       40.4171263,         -3.7073245,         'https://maps.app.goo.gl/DVPQnBqT9rFXN6qW6', '2025-12-15', 'ignacio'),
  ('S''Amarador',                'Great Menorcan Lobster.',                 2, 'Spain',       40.0018990,         3.8359444,          'https://maps.app.goo.gl/kaweAS8bsQnsd4UAA', '2024-09-15', 'ignacio'),
  ('Boater''s Grill',            'Amazing Lobster, great price.',           1, 'USA',         25.675467,          -80.161461,         'https://maps.app.goo.gl/zEoVxFSRpAzHvoTR8', '2025-12-15', 'ignacio'),
  ('Luke''s Lobster',            'You can taste this isn''t fresh Lobster.',2, 'USA',         40.7594852,         -73.9799833,        'https://maps.app.goo.gl/XjVQTa5LyJc5PXoH6', '2023-12-15', 'ignacio'),
  ('Cavalier South Beach Hotel', 'Great Lobster Raviolis 🍝.',              1, 'USA',         25.7844410,         -80.1300338,        'https://maps.app.goo.gl/GLrGp6QUX14Ty7um9', '2025-07-15', 'ignacio'),
  ('Sa Llagosta',                '',                                        3, 'Spain',       40.0557959729479,   4.131086779679226,  'https://maps.app.goo.gl/hCWHuTKbfwukH3tr8', null,         'ignacio'),
  ('Marisquería D''Berto',       '',                                        2, 'Spain',       42.485767,          -8.860930,          'https://maps.app.goo.gl/x8oQP87XkGoVjryg7', '2021-09-15', 'ignacio'),
  ('Juanito Kojua',              '',                                        2, 'Spain',       43.323593973800946, -1.986100345313789, 'https://maps.app.goo.gl/bVkeoLH1a7qLjyAK6', '2021-09-15', 'ignacio');
end if;
end
$seed$;

-- If you already signed up with nachomanzano.1@gmail.com BEFORE
-- running this script, claim the seed spots now:
insert into public.profiles (id, username)
select id, 'ignacio' from auth.users where email = 'nachomanzano.1@gmail.com'
on conflict (id) do nothing;

update public.spots
set author_id = (select id from auth.users where email = 'nachomanzano.1@gmail.com')
where author_name = 'ignacio'
  and author_id is null
  and exists (select 1 from auth.users where email = 'nachomanzano.1@gmail.com');
