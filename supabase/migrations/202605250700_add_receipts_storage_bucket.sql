-- Receipt image storage for expense attachments.

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do update set public = excluded.public;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'receipts_select_public'
  ) then
    create policy "receipts_select_public"
      on storage.objects for select to authenticated
      using (bucket_id = 'receipts');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'receipts_insert_own_folder'
  ) then
    create policy "receipts_insert_own_folder"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'receipts'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'receipts_update_own_folder'
  ) then
    create policy "receipts_update_own_folder"
      on storage.objects for update to authenticated
      using (
        bucket_id = 'receipts'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'receipts'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'receipts_delete_own_folder'
  ) then
    create policy "receipts_delete_own_folder"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'receipts'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
