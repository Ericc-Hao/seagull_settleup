-- Group lifecycle columns and invitation email tracking.

alter table public.groups
  add column if not exists inactive_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.group_invitations
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_error text;

alter table public.groups drop constraint if exists groups_status_check;

alter table public.groups
  add constraint groups_status_check
  check (status in ('planning', 'active', 'inactive', 'ready_to_settle', 'settled', 'archived'));

-- Owners can set groups inactive (archive-like).
drop policy if exists "groups_update_owner" on public.groups;
create policy "groups_update_owner" on public.groups
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "groups_delete_owner" on public.groups;
create policy "groups_delete_owner" on public.groups
  for delete to authenticated
  using (owner_id = auth.uid());
