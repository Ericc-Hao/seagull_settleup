-- In-app notifications for invitations and group activity

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (
    type in (
      'group_invitation',
      'invitation_accepted',
      'invitation_declined',
      'group_update',
      'expense_update',
      'settlement_update',
      'system'
    )
  ),
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  cleared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_is_read_idx on public.notifications(is_read);
create index if not exists notifications_type_idx on public.notifications(type);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());

create policy notifications_insert_own on public.notifications
  for insert with check (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete using (user_id = auth.uid());

create or replace function public.set_notifications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notifications_set_updated_at on public.notifications;
create trigger notifications_set_updated_at
  before update on public.notifications
  for each row execute function public.set_notifications_updated_at();
