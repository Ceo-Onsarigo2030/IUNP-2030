-- ============================================================================
-- Gala Awards Voting System
-- One category (or subcategory) = one page = one nominee list = one vote,
-- enforced per-device via a signed cookie token + a hard DB unique constraint.
-- Raw vote counts are never publicly readable — only via get_category_results(),
-- which returns nothing until the admin explicitly publishes that category.
-- ============================================================================

create table if not exists public.gala_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.gala_categories(id) on delete cascade,
  name text not null,
  slug text unique not null,
  description text,
  is_open boolean not null default false,
  results_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists gala_categories_parent_idx on public.gala_categories(parent_id);

create table if not exists public.gala_nominees (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.gala_categories(id) on delete cascade,
  name text not null,
  bio text,
  photo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists gala_nominees_category_idx on public.gala_nominees(category_id);

create table if not exists public.gala_votes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.gala_categories(id) on delete cascade,
  nominee_id uuid not null references public.gala_nominees(id) on delete cascade,
  device_token text not null,
  ip_hash text,
  created_at timestamptz not null default now(),
  unique (category_id, device_token)
);

create index if not exists gala_votes_category_idx on public.gala_votes(category_id);
create index if not exists gala_votes_nominee_idx on public.gala_votes(nominee_id);

-- ============================================================================
-- Tally access — the ONLY way to read vote counts. Returns an empty set
-- unless the category has results_published = true, or the caller is an admin
-- (admins can preview live counts before deciding to publish).
-- ============================================================================
create or replace function public.get_category_results(_category_id uuid)
returns table (nominee_id uuid, nominee_name text, vote_count bigint)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  _published boolean;
begin
  select results_published into _published from public.gala_categories where id = _category_id;

  if _published is not true and not public.is_admin() then
    return; -- empty result set — hides counts until published
  end if;

  return query
    select n.id, n.name, count(v.id)
    from public.gala_nominees n
    left join public.gala_votes v on v.nominee_id = n.id
    where n.category_id = _category_id
    group by n.id, n.name
    order by count(v.id) desc, n.sort_order;
end;
$$;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.gala_categories enable row level security;
alter table public.gala_nominees enable row level security;
alter table public.gala_votes enable row level security;

drop policy if exists "gala_categories_public_read" on public.gala_categories;
create policy "gala_categories_public_read" on public.gala_categories
  for select using (is_open or public.is_admin());

drop policy if exists "gala_categories_admin_write" on public.gala_categories;
create policy "gala_categories_admin_write" on public.gala_categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "gala_nominees_public_read" on public.gala_nominees;
create policy "gala_nominees_public_read" on public.gala_nominees
  for select using (
    exists (select 1 from public.gala_categories c where c.id = category_id and (c.is_open or public.is_admin()))
  );

drop policy if exists "gala_nominees_admin_write" on public.gala_nominees;
create policy "gala_nominees_admin_write" on public.gala_nominees
  for all using (public.is_admin()) with check (public.is_admin());

-- Votes: nobody can read raw rows directly (not even the voter) — all access
-- goes through get_category_results(). Inserts happen exclusively via
-- /api/gala/vote using the service-role client, never directly from the browser.
drop policy if exists "gala_votes_admin_read" on public.gala_votes;
create policy "gala_votes_admin_read" on public.gala_votes
  for select using (public.is_admin());

drop policy if exists "gala_votes_admin_delete" on public.gala_votes;
create policy "gala_votes_admin_delete" on public.gala_votes
  for delete using (public.is_admin());
