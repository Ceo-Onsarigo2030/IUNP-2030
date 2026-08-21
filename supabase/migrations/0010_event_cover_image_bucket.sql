-- ============================================================================
-- 0010 — Storage bucket for event cover images/logos. The `events.cover_image_url`
-- column already existed but nothing in the admin panel could ever set it —
-- there was no upload UI at all, only a plain URL field would have worked, and
-- there wasn't even that.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('event-media', 'event-media', true)
on conflict (id) do nothing;

drop policy if exists "event_media_storage_public_read" on storage.objects;
create policy "event_media_storage_public_read" on storage.objects
  for select using (bucket_id = 'event-media');

drop policy if exists "event_media_storage_admin_write" on storage.objects;
create policy "event_media_storage_admin_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'event-media' and public.is_admin());

drop policy if exists "event_media_storage_admin_delete" on storage.objects;
create policy "event_media_storage_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'event-media' and public.is_admin());
