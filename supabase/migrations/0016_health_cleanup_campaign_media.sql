-- ============================================================================
-- 0016 — failure reasons, campaign health fields, campaign media bucket, performance tidy-up
-- Safe to re-run.
-- ============================================================================

-- Why a payment failed (Safaricom's own description, e.g. "Request cancelled by user").
alter table public.tickets add column if not exists failure_reason text;

-- Email-campaign health: last problem + last activity, shown in the admin panel.
alter table public.email_campaigns add column if not exists last_error text;
alter table public.email_campaigns add column if not exists last_run_at timestamptz;

-- Public bucket for programme PDFs, images and other media linked from campaign emails.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-media', 'campaign-media', true, 26214400,
  array['application/pdf','image/png','image/jpeg','image/webp','image/gif','video/mp4',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "campaign_media_public_read" on storage.objects;
create policy "campaign_media_public_read" on storage.objects for select using (bucket_id = 'campaign-media');
drop policy if exists "campaign_media_admin_write" on storage.objects;
create policy "campaign_media_admin_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'campaign-media' and public.is_admin());
drop policy if exists "campaign_media_admin_delete" on storage.objects;
create policy "campaign_media_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'campaign-media' and public.is_admin());

-- Indexes for foreign keys the performance advisor flagged.
create index if not exists tickets_checked_in_by_idx on public.tickets (checked_in_by);
create index if not exists email_campaigns_created_by_idx on public.email_campaigns (created_by);
create index if not exists email_campaigns_audience_idx on public.email_campaigns (audience_from_campaign);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index if not exists article_comments_user_idx on public.article_comments (user_id);
create index if not exists articles_created_by_idx on public.articles (created_by);
create index if not exists events_created_by_idx on public.events (created_by);

-- Row-level-security speed-up: evaluate auth.uid() ONCE per query instead of once per row
-- (matters as profiles / comments grow into the thousands).
do $$
declare p record; q text; w text; stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check from pg_policies
    where schemaname = 'public' and policyname in (
      'profiles_select_own_or_admin','profiles_insert_self','profiles_update_own_or_admin',
      'roles_select_own_or_admin','comments_read_approved_or_own_or_admin',
      'comments_insert_members','comments_delete_own_or_admin')
  loop
    q := case when p.qual is not null and p.qual not like '%SELECT auth.uid()%' then replace(p.qual, 'auth.uid()', '(select auth.uid())') else p.qual end;
    w := case when p.with_check is not null and p.with_check not like '%SELECT auth.uid()%' then replace(p.with_check, 'auth.uid()', '(select auth.uid())') else p.with_check end;
    if (q is distinct from p.qual) or (w is distinct from p.with_check) then
      stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
      if q is not null then stmt := stmt || format(' using (%s)', q); end if;
      if w is not null then stmt := stmt || format(' with check (%s)', w); end if;
      execute stmt;
    end if;
  end loop;
end $$;
