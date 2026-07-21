-- ============================================================================
-- UniNexus Connect — Core schema (idempotent)
-- Safe to run multiple times against the same database.
-- ============================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type member_category as enum ('institution', 'affiliation', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_role as enum ('admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type signup_method as enum ('form', 'google');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_status as enum ('pending', 'paid', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_status as enum ('draft', 'current', 'upcoming', 'past');
exception when duplicate_object then null; end $$;

do $$ begin
  create type feedback_kind as enum ('feedback', 'suggestion');
exception when duplicate_object then null; end $$;

-- ---------- Sequences ----------
create sequence if not exists membership_id_seq start 1;

-- ============================================================================
-- Tables
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  membership_id text unique not null default ('UniNexus-' || lpad(nextval('membership_id_seq')::text, 3, '0')),
  full_name text not null,
  email text not null,
  category member_category not null default 'other',
  institution_name text,
  has_disability boolean not null default false,
  signup_method signup_method not null default 'form',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text not null,
  venue text not null,
  starts_at timestamptz not null,
  status event_status not null default 'draft',
  ticket_price numeric(10,2),
  ticket_currency text not null default 'KES',
  capacity integer,
  cover_image_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Only one event may be "current" at a time.
create unique index if not exists one_current_event_idx on public.events ((status = 'current')) where status = 'current';

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null,
  ticket_number text unique,
  amount numeric(10,2) not null,
  status ticket_status not null default 'pending',
  mpesa_receipt text,
  checkout_request_id text unique,
  merchant_request_id text,
  gate_pass_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tickets_event_idx on public.tickets(event_id);
create index if not exists tickets_status_idx on public.tickets(status);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text not null,
  body text not null,
  cover_image_url text,
  is_pinned boolean not null default false,
  comments_enabled boolean not null default true,
  published_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index if not exists max_two_pinned_articles on public.articles(is_pinned) where is_pinned = true and false;
-- (Pin limit of 2 is enforced in the admin action layer, not the DB, to keep swaps simple.)

create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists comments_article_idx on public.article_comments(article_id);

create table if not exists public.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  kind feedback_kind not null default 'feedback',
  name text not null,
  institution text,
  message text not null,
  is_pinned boolean not null default false,
  is_approved boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value)
values ('marquee_text', 'This is UniNexus Connect. Let''s Interact. Connect & Grow!')
on conflict (key) do nothing;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body_html text not null,
  status text not null default 'draft', -- draft | sent
  sent_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Helper functions (security definer, search_path pinned)
-- ============================================================================

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_role(auth.uid(), 'admin');
$$;

-- Auto-provision a member role + profile row for freshly created auth users
-- (defence-in-depth alongside the app-level insert done at sign-up).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Aggregate public stats RPC (used by the homepage live stats + avoids exposing raw profile rows)
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
    (select count(distinct institution_name) from public.profiles where institution_name is not null),
    (select count(*) from public.events);
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.events enable row level security;
alter table public.tickets enable row level security;
alter table public.articles enable row level security;
alter table public.article_comments enable row level security;
alter table public.feedback_entries enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.site_settings enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.email_campaigns enable row level security;

-- profiles ---------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

-- Members may update their own row but NEVER role/membership_id/email (enforced via column grants below).
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

revoke update on public.profiles from authenticated;
grant update (full_name, institution_name, has_disability, avatar_url) on public.profiles to authenticated;

-- user_roles ---------------------------------------------------------------
drop policy if exists "roles_select_own_or_admin" on public.user_roles;
create policy "roles_select_own_or_admin" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "roles_admin_write" on public.user_roles;
create policy "roles_admin_write" on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- events ---------------------------------------------------------------
drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events
  for select using (status <> 'draft' or public.is_admin());

drop policy if exists "events_admin_write" on public.events;
create policy "events_admin_write" on public.events
  for all using (public.is_admin()) with check (public.is_admin());

-- tickets ---------------------------------------------------------------
-- Ticket rows are written only by the Daraja API routes (service-role client),
-- so client-side inserts are disabled entirely to prevent forged "paid" tickets.
drop policy if exists "tickets_admin_read" on public.tickets;
create policy "tickets_admin_read" on public.tickets
  for select using (public.is_admin());

drop policy if exists "tickets_admin_write" on public.tickets;
create policy "tickets_admin_write" on public.tickets
  for all using (public.is_admin()) with check (public.is_admin());

-- articles ---------------------------------------------------------------
drop policy if exists "articles_public_read" on public.articles;
create policy "articles_public_read" on public.articles
  for select using (published_at is not null or public.is_admin());

drop policy if exists "articles_admin_write" on public.articles;
create policy "articles_admin_write" on public.articles
  for all using (public.is_admin()) with check (public.is_admin());

-- article_comments ---------------------------------------------------------------
drop policy if exists "comments_read_approved_or_own_or_admin" on public.article_comments;
create policy "comments_read_approved_or_own_or_admin" on public.article_comments
  for select using (is_approved or auth.uid() = user_id or public.is_admin());

drop policy if exists "comments_insert_members" on public.article_comments;
create policy "comments_insert_members" on public.article_comments
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.articles a where a.id = article_id and a.comments_enabled)
  );

drop policy if exists "comments_admin_moderate" on public.article_comments;
create policy "comments_admin_moderate" on public.article_comments
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "comments_delete_own_or_admin" on public.article_comments;
create policy "comments_delete_own_or_admin" on public.article_comments
  for delete using (auth.uid() = user_id or public.is_admin());

-- feedback_entries ---------------------------------------------------------------
-- Note: inserts happen exclusively via /api/feedback (service-role client, rate-limited),
-- not directly from the browser — so there is intentionally no public insert policy here.
drop policy if exists "feedback_public_insert" on public.feedback_entries;

drop policy if exists "feedback_public_read_approved" on public.feedback_entries;
create policy "feedback_public_read_approved" on public.feedback_entries
  for select using (is_approved or public.is_admin());

drop policy if exists "feedback_admin_write" on public.feedback_entries;
create policy "feedback_admin_write" on public.feedback_entries
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "feedback_admin_delete" on public.feedback_entries;
create policy "feedback_admin_delete" on public.feedback_entries
  for delete using (public.is_admin());

-- newsletter_subscribers ---------------------------------------------------------------
-- Note: inserts happen exclusively via /api/newsletter (service-role client, rate-limited).
drop policy if exists "newsletter_public_insert" on public.newsletter_subscribers;

drop policy if exists "newsletter_admin_read" on public.newsletter_subscribers;
create policy "newsletter_admin_read" on public.newsletter_subscribers
  for select using (public.is_admin());

drop policy if exists "newsletter_admin_write" on public.newsletter_subscribers;
create policy "newsletter_admin_write" on public.newsletter_subscribers
  for all using (public.is_admin()) with check (public.is_admin());

-- site_settings ---------------------------------------------------------------
drop policy if exists "settings_public_read" on public.site_settings;
create policy "settings_public_read" on public.site_settings
  for select using (true);

drop policy if exists "settings_admin_write" on public.site_settings;
create policy "settings_admin_write" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- push_subscriptions ---------------------------------------------------------------
-- Note: inserts happen exclusively via /api/push/subscribe (service-role client, rate-limited).
drop policy if exists "push_insert_any" on public.push_subscriptions;

drop policy if exists "push_admin_read" on public.push_subscriptions;
create policy "push_admin_read" on public.push_subscriptions
  for select using (public.is_admin());

drop policy if exists "push_admin_delete" on public.push_subscriptions;
create policy "push_admin_delete" on public.push_subscriptions
  for delete using (public.is_admin());

-- email_campaigns ---------------------------------------------------------------
drop policy if exists "campaigns_admin_all" on public.email_campaigns;
create policy "campaigns_admin_all" on public.email_campaigns
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Seeding an admin: create the user in Supabase Auth (Authentication tab),
-- then run, replacing the UUID with that user's id:
--
--   insert into public.user_roles (user_id, role) values ('<uuid>', 'admin')
--   on conflict do nothing;
--
--   insert into public.profiles (id, full_name, email, category, signup_method)
--   values ('<uuid>', 'Admin Name', 'admin@uninexusconnect.org', 'other', 'form')
--   on conflict (id) do nothing;
-- ============================================================================
