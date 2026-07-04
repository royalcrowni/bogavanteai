-- ═══════════════════════════════════════════════════════════
-- BOGAVANTE.AI — Profiles update (run this in the SQL Editor)
-- Adds profile pictures (emoji or initials + background color)
-- and a bio to every profile. Safe to run more than once.
-- ═══════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists avatar text,
  add column if not exists avatar_bg text,
  add column if not exists bio text not null default '';
