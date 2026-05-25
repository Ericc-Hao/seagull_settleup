-- Extend public invitation preview RPC with group_id and expires_at.

drop function if exists public.get_invitation_preview_by_token(text);

create or replace function public.get_invitation_preview_by_token(invite_token text)
returns table (
  invitation_id uuid,
  group_id uuid,
  group_name text,
  inviter_name text,
  inviter_email text,
  invited_email text,
  status text,
  expires_at timestamptz,
  is_valid boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    gi.id as invitation_id,
    gi.group_id,
    g.name as group_name,
    p.display_name as inviter_name,
    p.email as inviter_email,
    gi.invited_email,
    gi.status,
    gi.expires_at,
    (
      gi.status = 'pending'
      and (gi.expires_at is null or gi.expires_at > now())
    ) as is_valid
  from public.group_invitations gi
  join public.groups g on g.id = gi.group_id
  join public.profiles p on p.id = gi.invited_by
  where gi.token = invite_token
  limit 1;
$$;

revoke all on function public.get_invitation_preview_by_token(text) from public;
grant execute on function public.get_invitation_preview_by_token(text) to anon, authenticated;
