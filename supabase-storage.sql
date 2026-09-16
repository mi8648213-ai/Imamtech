-- Run after creating the bucket named imamtech-files.
-- Bucket must be private. Files are stored under a folder named
-- with the owner's auth user id, e.g. {owner_id}/photo.jpg
-- Only the owner (via any of their devices/sessions) can access their own folder.

create policy "Owner can view own files"
on storage.objects for select
using (
  bucket_id = 'imamtech-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Owner can upload own files"
on storage.objects for insert
with check (
  bucket_id = 'imamtech-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Owner can update own files"
on storage.objects for update
using (
  bucket_id = 'imamtech-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Owner can delete own files"
on storage.objects for delete
using (
  bucket_id = 'imamtech-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);
