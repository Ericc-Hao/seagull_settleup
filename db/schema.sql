-- Seagull SettleUp MVP schema (CAD-first, Supabase/Postgres compatible)

-- Recommended extensions for UUID and timestamp helpers.
create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'settlement_mode') then
    create type settlement_mode as enum ('individual', 'team');
  end if;
  if not exists (select 1 from pg_type where typname = 'group_status') then
    create type group_status as enum ('active', 'settled', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'split_type') then
    create type split_type as enum ('equal', 'custom_amount');
  end if;
  if not exists (select 1 from pg_type where typname = 'settlement_status') then
    create type settlement_status as enum ('pending', 'paid', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'emt_method') then
    create type emt_method as enum ('email', 'phone');
  end if;
end
$$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id) on delete set null,
  name text not null check (char_length(trim(name)) > 0),
  currency text not null default 'CAD' check (currency = 'CAD'),
  start_date date,
  end_date date,
  settlement_mode settlement_mode not null default 'individual',
  status group_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  display_name text not null check (char_length(trim(display_name)) > 0),
  nickname text,
  emt_name text,
  emt_email text,
  emt_phone text,
  preferred_emt_method emt_method,
  auto_deposit boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, display_name)
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  receiver_member_id uuid references group_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, name)
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  group_member_id uuid not null references group_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, group_member_id)
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  payer_member_id uuid not null references group_members(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'CAD' check (currency = 'CAD'),
  category text not null default 'other',
  description text,
  expense_date date not null default current_date,
  receipt_url text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  member_id uuid not null references group_members(id) on delete cascade,
  share_amount_cents integer not null check (share_amount_cents >= 0),
  split_type split_type not null default 'equal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expense_id, member_id)
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  mode settlement_mode not null,
  from_member_id uuid references group_members(id) on delete set null,
  to_member_id uuid references group_members(id) on delete set null,
  from_team_id uuid references teams(id) on delete set null,
  to_team_id uuid references teams(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  status settlement_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (mode = 'individual' and from_member_id is not null and to_member_id is not null) or
    (mode = 'team' and from_team_id is not null and to_team_id is not null)
  )
);

create table if not exists settlement_proofs (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references settlements(id) on delete cascade,
  image_url text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Useful indexes
create index if not exists idx_group_members_group_id on group_members(group_id);
create index if not exists idx_teams_group_id on teams(group_id);
create index if not exists idx_team_members_team_id on team_members(team_id);
create index if not exists idx_expenses_group_id on expenses(group_id);
create index if not exists idx_expense_splits_expense_id on expense_splits(expense_id);
create index if not exists idx_settlements_group_id on settlements(group_id);
create index if not exists idx_settlements_status on settlements(status);
