-- ============================================================================
-- 0009 — Institution alias mapping for live stats.
-- Previously "institutions on board" counted every distinct raw string in
-- profiles.institution_name — so "Kenyatta University" and "KU" (entered by two
-- different members for the same real institution) counted as TWO institutions
-- instead of one. This adds an admin-managed alias table and updates
-- get_public_stats() to fold known aliases into one canonical name before
-- counting. Plain case/whitespace differences ("Kenyatta University" vs
-- "kenyatta university ") are now also folded together automatically, even
-- without an alias entry, since both sides are lower-cased and trimmed.
-- ============================================================================

create table if not exists public.institution_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null unique,
  canonical_name text not null,
  created_at timestamptz not null default now()
);

alter table public.institution_aliases enable row level security;

drop policy if exists "institution_aliases_admin_all" on public.institution_aliases;
create policy "institution_aliases_admin_all" on public.institution_aliases
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.get_public_stats()
returns table (members bigint, disability bigint, institutions bigint, events bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles where has_disability),
    (
      select count(distinct lower(trim(coalesce(ia.canonical_name, p.institution_name))))
      from public.profiles p
      left join public.institution_aliases ia on lower(trim(ia.alias)) = lower(trim(p.institution_name))
      where p.institution_name is not null and trim(p.institution_name) <> ''
    ),
    (select count(*) from public.events);
$$;
