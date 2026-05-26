-- Performance indexes for app business queries.
-- Single-column indexes that already exist under other names (e.g. idx_groups_owner_id)
-- are not duplicated here to avoid redundant write overhead.

-- profiles
create index if not exists profiles_email_idx
  on public.profiles (lower(email));

-- groups
create index if not exists groups_status_idx
  on public.groups (status);

-- group_members (composite filters for active membership lookups)
create index if not exists group_members_active_user_idx
  on public.group_members (user_id, is_active, invitation_status);

create index if not exists group_members_group_active_idx
  on public.group_members (group_id, is_active, invitation_status);

-- group_invitations
create index if not exists group_invitations_token_idx
  on public.group_invitations (token);

create index if not exists group_invitations_email_status_idx
  on public.group_invitations (lower(invited_email), status);

-- notifications (partial indexes for inbox queries)
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read)
  where cleared_at is null;

create index if not exists notifications_user_created_at_idx
  on public.notifications (user_id, created_at desc)
  where cleared_at is null;

-- expenses
create index if not exists expenses_group_date_idx
  on public.expenses (group_id, expense_date desc);

create index if not exists expenses_user_date_idx
  on public.expenses (user_id, expense_date desc);

create index if not exists expenses_type_idx
  on public.expenses (type);

create index if not exists expenses_deleted_at_idx
  on public.expenses (deleted_at);

-- expense_splits
create index if not exists expense_splits_member_expense_idx
  on public.expense_splits (member_id, expense_id);

-- settlements
create index if not exists settlements_status_idx
  on public.settlements (status);

create index if not exists settlements_group_status_idx
  on public.settlements (group_id, status);

create index if not exists settlements_paid_at_idx
  on public.settlements (paid_at desc);
