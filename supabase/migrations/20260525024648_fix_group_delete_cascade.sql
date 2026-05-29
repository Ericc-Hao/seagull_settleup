-- Ensure group deletion cascades to all related business data.
-- Does not touch auth.users, profiles, or avatar storage.

-- groups -> children (already cascade in init; reassert if constraint names differ)
alter table public.group_members
  drop constraint if exists group_members_group_id_fkey;
alter table public.group_members
  add constraint group_members_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete cascade;

alter table public.group_invitations
  drop constraint if exists group_invitations_group_id_fkey;
alter table public.group_invitations
  add constraint group_invitations_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete cascade;

alter table public.expenses
  drop constraint if exists expenses_group_id_fkey;
alter table public.expenses
  add constraint expenses_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete cascade;

alter table public.teams
  drop constraint if exists teams_group_id_fkey;
alter table public.teams
  add constraint teams_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete cascade;

alter table public.settlements
  drop constraint if exists settlements_group_id_fkey;
alter table public.settlements
  add constraint settlements_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete cascade;

alter table public.receipts
  drop constraint if exists receipts_group_id_fkey;
alter table public.receipts
  add constraint receipts_group_id_fkey
  foreign key (group_id) references public.groups(id) on delete cascade;

-- expenses -> expense_splits, receipts
alter table public.expense_splits
  drop constraint if exists expense_splits_expense_id_fkey;
alter table public.expense_splits
  add constraint expense_splits_expense_id_fkey
  foreign key (expense_id) references public.expenses(id) on delete cascade;

alter table public.receipts
  drop constraint if exists receipts_expense_id_fkey;
alter table public.receipts
  add constraint receipts_expense_id_fkey
  foreign key (expense_id) references public.expenses(id) on delete set null;

-- teams -> team_members
alter table public.team_members
  drop constraint if exists team_members_team_id_fkey;
alter table public.team_members
  add constraint team_members_team_id_fkey
  foreign key (team_id) references public.teams(id) on delete cascade;

-- group_members references: set null on member removal, cascade splits when member row deleted
alter table public.expenses
  drop constraint if exists expenses_payer_member_id_fkey;
alter table public.expenses
  add constraint expenses_payer_member_id_fkey
  foreign key (payer_member_id) references public.group_members(id) on delete set null;

alter table public.teams
  drop constraint if exists teams_receiver_member_id_fkey;
alter table public.teams
  add constraint teams_receiver_member_id_fkey
  foreign key (receiver_member_id) references public.group_members(id) on delete set null;

alter table public.teams
  drop constraint if exists teams_payer_member_id_fkey;
alter table public.teams
  add constraint teams_payer_member_id_fkey
  foreign key (payer_member_id) references public.group_members(id) on delete set null;

alter table public.settlements
  drop constraint if exists settlements_from_member_id_fkey;
alter table public.settlements
  add constraint settlements_from_member_id_fkey
  foreign key (from_member_id) references public.group_members(id) on delete set null;

alter table public.settlements
  drop constraint if exists settlements_to_member_id_fkey;
alter table public.settlements
  add constraint settlements_to_member_id_fkey
  foreign key (to_member_id) references public.group_members(id) on delete set null;

alter table public.group_invitations
  drop constraint if exists group_invitations_group_member_id_fkey;
alter table public.group_invitations
  add constraint group_invitations_group_member_id_fkey
  foreign key (group_member_id) references public.group_members(id) on delete set null;

alter table public.expense_splits
  drop constraint if exists expense_splits_member_id_fkey;
alter table public.expense_splits
  add constraint expense_splits_member_id_fkey
  foreign key (member_id) references public.group_members(id) on delete cascade;

alter table public.team_members
  drop constraint if exists team_members_member_id_fkey;
alter table public.team_members
  add constraint team_members_member_id_fkey
  foreign key (member_id) references public.group_members(id) on delete cascade;
