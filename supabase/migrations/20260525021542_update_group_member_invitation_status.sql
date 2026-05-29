-- Allow cancelled invitation_status on group_members
alter table public.group_members drop constraint if exists group_members_invitation_status_check;

alter table public.group_members
  add constraint group_members_invitation_status_check
  check (invitation_status in ('active', 'pending', 'declined', 'removed', 'cancelled'));
