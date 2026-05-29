-- Fix swapped title/body in notify_group_invitation and update response copy

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
  inviter_label text;
  body_text text;
begin
  if new.invited_user_id is not null and new.status = 'pending' then
    select g.name into group_name from public.groups g where g.id = new.group_id;
    select p.display_name, p.email into inviter_name, inviter_email
    from public.profiles p where p.id = new.invited_by;

    if coalesce(trim(inviter_name), '') <> '' and coalesce(trim(inviter_email), '') <> '' then
      inviter_label := trim(inviter_name) || ' (' || trim(inviter_email) || ')';
    elsif coalesce(trim(inviter_name), '') <> '' then
      inviter_label := trim(inviter_name);
    elsif coalesce(trim(inviter_email), '') <> '' then
      inviter_label := trim(inviter_email);
    else
      inviter_label := 'Someone';
    end if;

    body_text := inviter_label || ' invited you to join "' || coalesce(group_name, 'Group') || '".';

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
        body_text,
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

    if coalesce(trim(responder_name), '') <> '' and coalesce(trim(responder_email), '') <> '' then
      responder_label := trim(responder_name) || ' (' || trim(responder_email) || ')';
    elsif coalesce(trim(responder_name), '') <> '' then
      responder_label := trim(responder_name);
    elsif coalesce(trim(responder_email), '') <> '' then
      responder_label := trim(responder_email);
    else
      responder_label := 'Someone';
    end if;

    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.invited_by,
      case when new.status = 'accepted' then 'invitation_accepted' else 'invitation_declined' end,
      case when new.status = 'accepted' then 'Invitation accepted' else 'Invitation declined' end,
      responder_label
        || case when new.status = 'accepted'
          then ' accepted your invitation to "'
          else ' declined your invitation to "'
        end
        || coalesce(group_name, 'Group')
        || '".',
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
