-- Correct swapped title/body repair for group invitation notifications

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
