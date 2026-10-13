-- ============================================================================
-- 0011 — Membership-ID overflow fix + scale hardening
-- Safe to re-run. (Already applied to production on 2026-10-13.)
--
-- ROOT CAUSE of "Database error saving new user" once ~1000 members existed:
-- the membership_id default used lpad(n, 3, '0'). Postgres lpad TRUNCATES text longer
-- than the pad length, so id 1000 became 'UniNexus-100' — which already existed, the
-- UNIQUE constraint rejected it, and every new sign-up failed. Failed sign-ups also
-- burn sequence numbers, so the counter was far past 999 (it had reached 1644).
-- ============================================================================

-- 1. Id generator in a private (non-API-exposed) schema so nobody can burn sequence
--    numbers by calling it through /rest/v1/rpc.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.next_membership_id()
returns text
language sql
volatile
security definer
set search_path = public
as $$
  select 'UniNexus-' || case when n < 1000 then lpad(n::text, 3, '0') else n::text end
  from (select nextval('public.membership_id_seq') as n) s
$$;

revoke all on function private.next_membership_id() from public, anon;
grant execute on function private.next_membership_id() to authenticated, service_role;

alter table public.profiles alter column membership_id set default private.next_membership_id();
drop function if exists public.next_membership_id();

-- Make sure the counter is never behind the highest existing id (only ever moves forward).
do $$
declare
  hi bigint;
  cur bigint;
begin
  select coalesce(max(substring(membership_id from '[0-9]+$')::bigint), 0) into hi from public.profiles;
  select last_value into cur from public.membership_id_seq;
  if hi > cur then
    perform setval('public.membership_id_seq', hi, true);
  end if;
end $$;

-- 2. Trigger-only functions must not be callable through the public API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_article_like_count() from public, anon, authenticated;

-- 3. Least privilege on tables: the API roles never need TRUNCATE / REFERENCES / TRIGGER,
--    and signed-out visitors never write directly (all public writes go through server routes).
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
revoke insert, update, delete on all tables in schema public from anon;
alter default privileges for role postgres in schema public revoke truncate, references, trigger on tables from anon, authenticated;

-- 4. Indexes for the lists and look-ups that grow with membership.
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);
create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists tickets_tier_status_idx on public.tickets (tier_id, status, created_at);
create index if not exists tickets_event_status_idx on public.tickets (event_id, status);
create index if not exists newsletter_active_idx on public.newsletter_subscribers (is_active) where is_active;
create index if not exists article_comments_approved_idx on public.article_comments (article_id, is_approved);

create extension if not exists pg_trgm with schema extensions;
create index if not exists profiles_full_name_trgm on public.profiles using gin (full_name extensions.gin_trgm_ops);
create index if not exists profiles_institution_trgm on public.profiles using gin (institution_name extensions.gin_trgm_ops);
create index if not exists profiles_email_trgm on public.profiles using gin (email extensions.gin_trgm_ops);

-- 5. Resumable email campaigns (a send can span several admin clicks on a big list).
alter table public.email_campaigns add column if not exists sent_count integer not null default 0;
