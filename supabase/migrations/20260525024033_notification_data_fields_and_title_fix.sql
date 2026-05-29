-- Include invitedEmail and createdAt in invitation notification payload

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
      inviter_label := 'A group member';
    end if;

    body_text := inviter_label || ' invited you to join "' || coalesce(group_name, 'this group') || '".';

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
          'groupName', coalesce(group_name, 'this group'),
          'invitedBy', new.invited_by,
          'inviterName', inviter_name,
          'inviterEmail', inviter_email,
          'invitedEmail', new.invited_email,
          'createdAt', new.created_at
        )
      );
    end if;
  end if;

  return new;
end;
$$;

-- Repair legacy rows with swapped title/body or typo title
update public.notifications
set
  body = title,
  title = 'Group invitation'
where type = 'group_invitation'
  and cleared_at is null
  and title ilike '%invited you to join%'
  and (body = 'Group invitation' or body is null);

update public.notifications
set title = 'Group invitation'
where type = 'group_invitation'
  and cleared_at is null
  and lower(title) = 'group invatition';
