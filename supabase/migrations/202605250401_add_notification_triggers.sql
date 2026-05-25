-- Server-side notification creation (bypasses client RLS for cross-user events)

create or replace function public.notify_group_invitation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  group_name text;
  inviter_name text;
  inviter_email text;
begin
  if new.invited_user_id is not null and new.status = 'pending' then
    select g.name into group_name from public.groups g where g.id = new.group_id;
    select p.display_name, p.email into inviter_name, inviter_email
    from public.profiles p where p.id = new.invited_by;

    if not exists (
      select 1
      from public.notifications n
      where n.user_id = new.invited_user_id
        and n.type = 'group_invitation'
        and n.cleared_at is null
        and n.data->>'invitationId' = new.id::text
    ) then
      insert into public.notifications (user_id, type, title, body, data)
      values (
        new.invited_user_id,
        'group_invitation',
        'Group invitation',
        coalesce(nullif(trim(inviter_name), ''), inviter_email, 'Someone')
          || ' invited you to join '
          || coalesce(group_name, 'Group')
          || '.',
        jsonb_build_object(
          'invitationId', new.id,
          'groupId', new.group_id,
          'groupName', coalesce(group_name, 'Group'),
          'invitedBy', new.invited_by,
          'inviterName', inviter_name,
          'inviterEmail', inviter_email
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists group_invitations_notify_invitation on public.group_invitations;
create trigger group_invitations_notify_invitation
  after insert on public.group_invitations
  for each row execute function public.notify_group_invitation();

create or replace function public.notify_invitation_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  group_name text;
  responder_name text;
  responder_email text;
  responder_label text;
begin
  if old.status = 'pending' and new.status in ('accepted', 'declined') then
    select g.name into group_name from public.groups g where g.id = new.group_id;

    select p.display_name, p.email into responder_name, responder_email
    from public.profiles p
    where p.id = coalesce(new.invited_user_id, auth.uid());

    responder_label := coalesce(nullif(trim(responder_name), ''), responder_email, 'Someone');

    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.invited_by,
      case when new.status = 'accepted' then 'invitation_accepted' else 'invitation_declined' end,
      case when new.status = 'accepted' then 'Invitation accepted' else 'Invitation declined' end,
      responder_label
        || case when new.status = 'accepted'
          then ' accepted your invitation to '
          else ' declined your invitation to '
        end
        || coalesce(group_name, 'Group')
        || '.',
      jsonb_build_object(
        'invitationId', new.id,
        'groupId', new.group_id,
        'groupName', coalesce(group_name, 'Group')
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists group_invitations_notify_response on public.group_invitations;
create trigger group_invitations_notify_response
  after update on public.group_invitations
  for each row execute function public.notify_invitation_response();

-- Link invited_user_id on insert when profile exists (helps trigger fire on insert)
create or replace function public.link_invitation_user_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_user_id uuid;
begin
  if new.invited_user_id is null and new.invited_email is not null then
    select p.id into matched_user_id
    from public.profiles p
    where lower(trim(p.email)) = lower(trim(new.invited_email))
    limit 1;

    if matched_user_id is not null then
      new.invited_user_id := matched_user_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists group_invitations_link_user on public.group_invitations;
create trigger group_invitations_link_user
  before insert on public.group_invitations
  for each row execute function public.link_invitation_user_on_insert();
