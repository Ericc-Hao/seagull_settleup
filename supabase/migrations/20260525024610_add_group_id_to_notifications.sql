-- Link notifications to groups for cascade delete on group removal.

alter table public.notifications
  add column if not exists group_id uuid;

create index if not exists notifications_group_id_idx on public.notifications(group_id);

-- Backfill only when the group still exists.
update public.notifications n
set group_id = (n.data->>'groupId')::uuid
where n.group_id is null
  and n.data ? 'groupId'
  and (n.data->>'groupId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and exists (
    select 1
    from public.groups g
    where g.id = (n.data->>'groupId')::uuid
  );

alter table public.notifications
  drop constraint if exists notifications_group_id_fkey;

alter table public.notifications
  add constraint notifications_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete cascade;

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
      insert into public.notifications (user_id, type, title, body, data, group_id)
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
        ),
        new.group_id
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

    responder_label := coalesce(nullif(trim(responder_name), ''), responder_email, 'Someone');

    insert into public.notifications (user_id, type, title, body, data, group_id)
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
      ),
      new.group_id
    );
  end if;

  return new;
end;
$$;
