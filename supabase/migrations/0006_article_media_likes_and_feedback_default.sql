-- ============================================================================
-- 0006 — Article media gallery (photos/videos), article likes, and a fix so
-- feedback/suggestion wall entries require admin approval before they go
-- public (previously defaulted to auto-approved, which bypassed moderation).
-- Idempotent — safe to run multiple times.
-- ============================================================================

-- ---------- Articles: like button ----------
alter table public.articles add column if not exists like_count integer not null default 0;

create table if not exists public.article_likes (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  liker_key text not null, -- either the authenticated user's id, or an anonymous per-browser id
  created_at timestamptz not null default now(),
  unique (article_id, liker_key)
);

create index if not exists article_likes_article_idx on public.article_likes(article_id);

-- Keep articles.like_count in sync automatically so reads stay a single cheap column.
create or replace function public.sync_article_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.articles set like_count = like_count + 1 where id = new.article_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.articles set like_count = greatest(0, like_count - 1) where id = old.article_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists on_article_like_change on public.article_likes;
create trigger on_article_like_change
  after insert or delete on public.article_likes
  for each row execute function public.sync_article_like_count();

alter table public.article_likes enable row level security;

-- Likes/unlikes are only ever written by the /api/articles/like route (service-role,
-- rate-limited), same pattern already used for feedback — no direct public write policy.
drop policy if exists "article_likes_public_read" on public.article_likes;
create policy "article_likes_public_read" on public.article_likes
  for select using (true);

-- ---------- Articles: media gallery (5-8 optional photos/videos per article) ----------
create table if not exists public.article_media (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists article_media_article_idx on public.article_media(article_id);

alter table public.article_media enable row level security;

drop policy if exists "article_media_public_read" on public.article_media;
create policy "article_media_public_read" on public.article_media
  for select using (
    exists (
      select 1 from public.articles a
      where a.id = article_id and (a.published_at is not null or public.is_admin())
    )
  );

drop policy if exists "article_media_admin_write" on public.article_media;
create policy "article_media_admin_write" on public.article_media
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Storage bucket for article media uploads ----------
insert into storage.buckets (id, name, public)
values ('article-media', 'article-media', true)
on conflict (id) do nothing;

drop policy if exists "article_media_storage_public_read" on storage.objects;
create policy "article_media_storage_public_read" on storage.objects
  for select using (bucket_id = 'article-media');

drop policy if exists "article_media_storage_admin_write" on storage.objects;
create policy "article_media_storage_admin_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'article-media' and public.is_admin());

drop policy if exists "article_media_storage_admin_delete" on storage.objects;
create policy "article_media_storage_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'article-media' and public.is_admin());

-- ---------- Feedback/suggestion wall: require admin approval before publishing ----------
-- Previously defaulted to `true`, so every submission went live immediately with no
-- moderation. Existing already-approved rows are left untouched; only the default for
-- *new* rows changes, and the API insert (which doesn't set is_approved) now correctly
-- lands entries in the admin queue instead of skipping it.
alter table public.feedback_entries alter column is_approved set default false;
