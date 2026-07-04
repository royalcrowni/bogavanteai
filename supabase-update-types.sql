-- ═══════════════════════════════════════════════════════════
-- BOGAVANTE.AI — Spot types + webmaster powers
-- Run this once in the Supabase SQL Editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════

-- 1) Spot type: premium / casual / beach
alter table public.spots add column if not exists type text not null default 'casual';
alter table public.spots drop constraint if exists spots_type_check;
alter table public.spots add constraint spots_type_check check (type in ('premium','casual','beach'));

-- Sensible starting point: $$$ places become Premium (tweak freely in the table editor)
update public.spots set type = 'premium' where price = 3 and type = 'casual';

-- 2) Webmaster: @ignacio can edit any profile and delete any spot
-- (security definer avoids RLS recursion on the profiles lookup)
create or replace function public.is_webmaster()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and username = 'ignacio'
  );
$$;

drop policy if exists "Webmaster can update any profile" on public.profiles;
create policy "Webmaster can update any profile"
  on public.profiles for update to authenticated
  using (public.is_webmaster());

drop policy if exists "Webmaster can delete spots" on public.spots;
create policy "Webmaster can delete spots"
  on public.spots for delete to authenticated
  using (public.is_webmaster());
