-- Allow invited users to link and activate their own group_members row on accept/decline.

drop policy if exists "group_members_update_invitee" on public.group_members;
drop policy if exists "group_members_select_invitee_pending" on public.group_members;

create policy "group_members_update_invitee" on public.group_members
  for update to authenticated
  using (
    user_id = auth.uid()
    or (
      lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and exists (
        select 1
        from public.group_invitations gi
        where gi.group_member_id = group_members.id
          and gi.status in ('pending', 'accepted')
          and (
            gi.invited_user_id = auth.uid()
            or lower(gi.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          )
      )
    )
  )
  with check (user_id = auth.uid());

-- Invited users may read their pending membership row before acceptance.
create policy "group_members_select_invitee_pending" on public.group_members
  for select to authenticated
  using (
    public.can_access_group(group_id)
    or (
      user_id = auth.uid()
      or lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- can_access_group already grants select on groups for active members; ensure function is current.
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
