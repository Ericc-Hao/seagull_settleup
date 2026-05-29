-- Allow group members to record their own paid settlement transfers.

create policy "settlements_member_insert_own_paid" on public.settlements
  for insert to authenticated
  with check (
    public.can_access_group(group_id)
    and status = 'paid'
    and from_member_id is not null
    and exists (
      select 1
      from public.group_members gm
      where gm.id = from_member_id
        and gm.group_id = group_id
        and gm.user_id = auth.uid()
    )
  );
