-- Allow active group members to upload receipts for shared group expenses.

drop policy if exists "receipts_write_uploader_or_owner" on public.receipts;

create policy "receipts_write_accessible" on public.receipts
  for all to authenticated
  using (
    user_id = auth.uid()
    or (group_id is not null and public.can_access_group(group_id))
  )
  with check (
    user_id = auth.uid()
    and (
      group_id is null
      or public.can_access_group(group_id)
    )
  );
