-- Phase 3 — Storage bucket for task attachments.
-- One private bucket; objects are foldered by user_id so the RLS policies are
-- a simple prefix match against auth.uid().

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- =========================================================================
-- Policies on storage.objects scoped to the attachments bucket.
-- Path convention: <user_id>/<task_id>/<filename>
-- =========================================================================

drop policy if exists "attachments_select_own" on storage.objects;
create policy "attachments_select_own"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "attachments_insert_own" on storage.objects;
create policy "attachments_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "attachments_delete_own" on storage.objects;
create policy "attachments_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
