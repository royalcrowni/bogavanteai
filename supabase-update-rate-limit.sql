-- ═══════════════════════════════════════════════════════════
-- BOGAVANTE.AI — Rate limit update (run this in the SQL Editor)
-- Old rule: 1 spot per hour.
-- New rule: 3 spots per 24 hours, @ignacio unlimited.
--
-- Why you got blocked without adding anything: when the setup
-- script ran, the 12 seed spots were created with created_at =
-- "right now", and signing in as @ignacio claimed them — so the
-- old trigger counted 12 spots "in the last hour". This version
-- exempts @ignacio entirely.
-- ═══════════════════════════════════════════════════════════

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

-- Optional tidy-up: backdate the 12 seed spots so they don't look
-- like they were all added today.
update public.spots
set created_at = coalesce(last_visited::timestamptz, '2025-01-01'::timestamptz)
where author_name = 'ignacio' and created_at > now() - interval '7 days';
