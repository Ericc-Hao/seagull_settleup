-- Group invitations and shared group access.
-- No seed or demo rows are inserted by this migration.

alter table public.group_members
  add column if not exists email text,
  add column if not exists invitation_status text not null default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'group_members_invitation_status_check'
      and conrelid = 'public.group_members'::regclass
  ) then
    alter table public.group_members
      add constraint group_members_invitation_status_check
      check (invitation_status in ('active', 'pending', 'declined', 'removed'));
  end if;
end $$;

create table if not exists public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  invited_email text not null,
  invited_user_id uuid references auth.users(id) on delete set null,
  group_member_id uuid references public.group_members(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  token text unique,
  message text,
  expires_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger group_invitations_set_updated_at before update on public.group_invitations
  for each row execute function public.set_updated_at();

create index if not exists group_invitations_group_id_idx on public.group_invitations(group_id);
create index if not exists group_invitations_invited_email_idx on public.group_invitations(lower(invited_email));
create index if not exists group_invitations_invited_user_id_idx on public.group_invitations(invited_user_id);
create index if not exists group_invitations_status_idx on public.group_invitations(status);
create unique index if not exists group_invitations_pending_email_group_uidx
  on public.group_invitations(lower(invited_email), group_id)
  where status = 'pending';

create index if not exists idx_group_members_email on public.group_members(lower(email));
create index if not exists idx_group_members_invitation_status on public.group_members(invitation_status);

create or replace function public.can_access_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = target_group_id
      and g.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.is_active = true
      and gm.invitation_status = 'active'
  );
$$;

create or replace function public.find_profile_by_email(search_email text)
returns table(id uuid, display_name text, email text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.email
  from public.profiles p
  where lower(p.email) = lower(search_email)
  limit 1;
$$;

grant execute on function public.find_profile_by_email(text) to authenticated;
grant execute on function public.can_access_group(uuid) to authenticated;

alter table public.group_invitations enable row level security;

drop policy if exists "groups_select_owner" on public.groups;
drop policy if exists "group_members_owner_access" on public.group_members;
drop policy if exists "expenses_owner_or_owned_group_access" on public.expenses;
drop policy if exists "expense_splits_owner_access" on public.expense_splits;
drop policy if exists "teams_owner_access" on public.teams;
drop policy if exists "team_members_owner_access" on public.team_members;
drop policy if exists "settlements_owner_access" on public.settlements;
drop policy if exists "receipts_owner_or_owned_group_access" on public.receipts;

create policy "groups_select_accessible" on public.groups
  for select to authenticated using (public.can_access_group(id));

create policy "group_members_select_accessible" on public.group_members
  for select to authenticated using (public.can_access_group(group_id));
create policy "group_members_insert_owner" on public.group_members
  for insert to authenticated
  with check (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));
create policy "group_members_update_owner" on public.group_members
  for update to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));
create policy "group_members_delete_owner" on public.group_members
  for delete to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));

create policy "expenses_select_accessible" on public.expenses
  for select to authenticated
  using (user_id = auth.uid() or (group_id is not null and public.can_access_group(group_id)));
create policy "expenses_insert_accessible" on public.expenses
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      type = 'personal'
      or (group_id is not null and public.can_access_group(group_id))
    )
  );
create policy "expenses_update_creator_or_owner" on public.expenses
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  );
create policy "expenses_delete_creator_or_owner" on public.expenses
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  );

create policy "expense_splits_select_accessible" on public.expense_splits
  for select to authenticated
  using (
    exists (
      select 1
      from public.expenses e
      where e.id = expense_id
        and (e.user_id = auth.uid() or (e.group_id is not null and public.can_access_group(e.group_id)))
    )
  );
create policy "expense_splits_write_creator_or_owner" on public.expense_splits
  for all to authenticated
  using (
    exists (
      select 1
      from public.expenses e
      left join public.groups g on g.id = e.group_id
      where e.id = expense_id
        and (e.user_id = auth.uid() or g.owner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.expenses e
      left join public.groups g on g.id = e.group_id
      where e.id = expense_id
        and (e.user_id = auth.uid() or g.owner_id = auth.uid())
    )
  );

create policy "teams_select_accessible" on public.teams
  for select to authenticated using (public.can_access_group(group_id));
create policy "teams_owner_write" on public.teams
  for all to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));

create policy "team_members_select_accessible" on public.team_members
  for select to authenticated
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_id and public.can_access_group(t.group_id)
    )
  );
create policy "team_members_owner_write" on public.team_members
  for all to authenticated
  using (
    exists (
      select 1 from public.teams t
      join public.groups g on g.id = t.group_id
      where t.id = team_id and g.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      join public.groups g on g.id = t.group_id
      where t.id = team_id and g.owner_id = auth.uid()
    )
  );

create policy "settlements_select_accessible" on public.settlements
  for select to authenticated using (public.can_access_group(group_id));
create policy "settlements_owner_write" on public.settlements
  for all to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));

create policy "receipts_select_accessible" on public.receipts
  for select to authenticated
  using (user_id = auth.uid() or (group_id is not null and public.can_access_group(group_id)));
create policy "receipts_write_uploader_or_owner" on public.receipts
  for all to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and (
      group_id is null
      or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
    )
  );

create policy "group_invitations_insert_inviter" on public.group_invitations
  for insert to authenticated
  with check (
    invited_by = auth.uid()
    and exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  );

create policy "group_invitations_select_owner_or_invitee" on public.group_invitations
  for select to authenticated
  using (
    invited_by = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
    or invited_user_id = auth.uid()
    or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "group_invitations_update_owner_or_invitee" on public.group_invitations
  for update to authenticated
  using (
    exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
    or invited_user_id = auth.uid()
    or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
    or invited_user_id = auth.uid()
    or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "group_invitations_delete_owner" on public.group_invitations
  for delete to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));

grant select, insert, update, delete on public.group_invitations to authenticated;
