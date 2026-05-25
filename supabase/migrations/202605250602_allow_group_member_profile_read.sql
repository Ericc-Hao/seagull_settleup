-- Allow group members to read co-member profiles (display name, email, avatar).
-- Required for group member avatar display without mock data.

drop policy if exists "profiles_select_group_peer" on public.profiles;

create policy "profiles_select_group_peer" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.group_members viewer
      join public.group_members peer on peer.group_id = viewer.group_id
      where viewer.user_id = auth.uid()
        and viewer.is_active = true
        and viewer.invitation_status = 'active'
        and peer.user_id = profiles.id
    )
    or exists (
      select 1
      from public.groups g
      where g.owner_id = auth.uid()
        and exists (
          select 1
          from public.group_members gm
          where gm.group_id = g.id
            and gm.user_id = profiles.id
        )
    )
  );

drop function if exists public.find_profile_by_email(text);

create or replace function public.find_profile_by_email(search_email text)
returns table(id uuid, display_name text, email text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.email, p.avatar_url
  from public.profiles p
  where lower(p.email) = lower(search_email)
  limit 1;
$$;
