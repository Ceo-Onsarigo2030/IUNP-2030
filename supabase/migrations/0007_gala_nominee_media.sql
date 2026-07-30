-- ============================================================================
-- 0007 — Gala nominee media gallery (photos/videos showing what a nominee does
-- in their category) plus a dedicated storage bucket for nominee profile
-- photos and this media, admin-managed.
-- ============================================================================

create table if not exists public.gala_nominee_media (
  id uuid primary key default gen_random_uuid(),
  nominee_id uuid not null references public.gala_nominees(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists gala_nominee_media_nominee_idx on public.gala_nominee_media(nominee_id);

alter table public.gala_nominee_media enable row level security;

drop policy if exists "gala_nominee_media_public_read" on public.gala_nominee_media;
create policy "gala_nominee_media_public_read" on public.gala_nominee_media
  for select using (
    exists (
      select 1 from public.gala_nominees n
      join public.gala_categories c on c.id = n.category_id
      where n.id = nominee_id and (c.is_open or public.is_admin())
    )
  );

drop policy if exists "gala_nominee_media_admin_write" on public.gala_nominee_media;
create policy "gala_nominee_media_admin_write" on public.gala_nominee_media
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Storage bucket for nominee profile photos + category media ----------
insert into storage.buckets (id, name, public)
values ('gala-media', 'gala-media', true)
on conflict (id) do nothing;

drop policy if exists "gala_media_storage_public_read" on storage.objects;
create policy "gala_media_storage_public_read" on storage.objects
  for select using (bucket_id = 'gala-media');

drop policy if exists "gala_media_storage_admin_write" on storage.objects;
create policy "gala_media_storage_admin_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gala-media' and public.is_admin());

drop policy if exists "gala_media_storage_admin_delete" on storage.objects;
create policy "gala_media_storage_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'gala-media' and public.is_admin());
