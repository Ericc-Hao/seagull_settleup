-- Seagull Split core schema
-- Supabase is the only source of truth for business data.
-- No example business rows are inserted by this migration.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  avatar_url text,
  default_currency text not null default 'CAD',
  emt_email text,
  emt_phone text,
  preferred_emt_method text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text,
  currency text not null default 'CAD',
  start_date date,
  end_date date,
  settlement_mode text not null default 'individual',
  status text not null default 'active',
  cover_icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint groups_settlement_mode_check check (settlement_mode in ('individual', 'team')),
  constraint groups_status_check check (status in ('planning', 'active', 'ready_to_settle', 'settled', 'archived'))
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  nickname text,
  avatar_color text,
  emt_email text,
  emt_phone text,
  preferred_emt_method text,
  role text not null default 'member',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  type text not null check (type in ('personal', 'split')),
  payer_member_id uuid references public.group_members(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'CAD',
  category_id uuid,
  category_name text,
  description text,
  note text,
  expense_date date not null default current_date,
  receipt_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint expenses_type_group_check check (
    (type = 'personal' and group_id is null)
    or (type = 'split' and group_id is not null)
  )
);

create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  member_id uuid not null references public.group_members(id) on delete cascade,
  share_amount_cents integer not null check (share_amount_cents >= 0),
  split_type text not null default 'equal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expense_id, member_id)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  receiver_member_id uuid references public.group_members(id) on delete set null,
  payer_member_id uuid references public.group_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  member_id uuid not null references public.group_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, member_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  mode text not null check (mode in ('individual', 'team')),
  from_member_id uuid references public.group_members(id) on delete set null,
  to_member_id uuid references public.group_members(id) on delete set null,
  from_team_id uuid references public.teams(id) on delete set null,
  to_team_id uuid references public.teams(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'CAD',
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger groups_set_updated_at before update on public.groups
  for each row execute function public.set_updated_at();
create trigger group_members_set_updated_at before update on public.group_members
  for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();
create trigger expense_splits_set_updated_at before update on public.expense_splits
  for each row execute function public.set_updated_at();
create trigger teams_set_updated_at before update on public.teams
  for each row execute function public.set_updated_at();
create trigger team_members_set_updated_at before update on public.team_members
  for each row execute function public.set_updated_at();
create trigger settlements_set_updated_at before update on public.settlements
  for each row execute function public.set_updated_at();

create index if not exists idx_groups_owner_id on public.groups(owner_id);
create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_group_members_user_id on public.group_members(user_id);
create index if not exists idx_expenses_user_id on public.expenses(user_id);
create index if not exists idx_expenses_group_id on public.expenses(group_id);
create index if not exists idx_expenses_payer_member_id on public.expenses(payer_member_id);
create index if not exists idx_expense_splits_expense_id on public.expense_splits(expense_id);
create index if not exists idx_expense_splits_member_id on public.expense_splits(member_id);
create index if not exists idx_teams_group_id on public.teams(group_id);
create index if not exists idx_teams_receiver_member_id on public.teams(receiver_member_id);
create index if not exists idx_teams_payer_member_id on public.teams(payer_member_id);
create index if not exists idx_team_members_team_id on public.team_members(team_id);
create index if not exists idx_team_members_member_id on public.team_members(member_id);
create index if not exists idx_settlements_group_id on public.settlements(group_id);
create index if not exists idx_settlements_from_member_id on public.settlements(from_member_id);
create index if not exists idx_settlements_to_member_id on public.settlements(to_member_id);
create index if not exists idx_settlements_from_team_id on public.settlements(from_team_id);
create index if not exists idx_settlements_to_team_id on public.settlements(to_team_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, emt_email, default_currency)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'User'), '@', 1)),
    new.email,
    new.email,
    'CAD'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.settlements enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "groups_select_owner" on public.groups
  for select to authenticated using (owner_id = auth.uid());
create policy "groups_insert_owner" on public.groups
  for insert to authenticated with check (owner_id = auth.uid());
create policy "groups_update_owner" on public.groups
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "groups_delete_owner" on public.groups
  for delete to authenticated using (owner_id = auth.uid());

create policy "group_members_owner_access" on public.group_members
  for all to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));

create policy "expenses_owner_or_owned_group_access" on public.expenses
  for all to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and (
      type = 'personal'
      or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
    )
  );

create policy "expense_splits_owner_access" on public.expense_splits
  for all to authenticated
  using (
    exists (
      select 1 from public.expenses e
      left join public.groups g on g.id = e.group_id
      where e.id = expense_id and (e.user_id = auth.uid() or g.owner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
      left join public.groups g on g.id = e.group_id
      where e.id = expense_id and (e.user_id = auth.uid() or g.owner_id = auth.uid())
    )
  );

create policy "teams_owner_access" on public.teams
  for all to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));

create policy "team_members_owner_access" on public.team_members
  for all to authenticated
  using (
    exists (
      select 1 from public.teams t
      join public.groups g on g.id = t.group_id
      where t.id = team_id and g.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      join public.groups g on g.id = t.group_id
      where t.id = team_id and g.owner_id = auth.uid()
    )
  );

create policy "settlements_owner_access" on public.settlements
  for all to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()))
  with check (exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
