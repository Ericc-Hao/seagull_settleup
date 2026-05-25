-- Seagull Split receipts and categories
-- System categories are configuration data.

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.expenses(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  storage_path text not null,
  public_url text,
  file_name text,
  mime_type text,
  file_size integer,
  ocr_status text not null default 'none' check (ocr_status in ('none', 'pending', 'completed', 'failed')),
  ocr_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  type text not null default 'both' check (type in ('personal', 'split', 'both')),
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger receipts_set_updated_at before update on public.receipts
  for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create index if not exists idx_receipts_expense_id on public.receipts(expense_id);
create index if not exists idx_receipts_user_id on public.receipts(user_id);
create index if not exists idx_receipts_group_id on public.receipts(group_id);
create index if not exists idx_categories_user_id on public.categories(user_id);
create index if not exists idx_categories_default on public.categories(is_default) where is_default = true;

alter table public.receipts enable row level security;
alter table public.categories enable row level security;

create policy "categories_select_default_or_own" on public.categories
  for select to authenticated
  using ((is_default = true and user_id is null) or user_id = auth.uid());

create policy "categories_insert_own" on public.categories
  for insert to authenticated
  with check (user_id = auth.uid() and is_default = false);

create policy "categories_update_own" on public.categories
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and is_default = false);

create policy "categories_delete_own" on public.categories
  for delete to authenticated
  using (user_id = auth.uid() and is_default = false);

create policy "receipts_owner_or_owned_group_access" on public.receipts
  for all to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and (
      group_id is null
      or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
    )
  );

insert into public.categories (name, icon, color, type, is_default, sort_order)
values
  ('Food & Drinks', 'building-storefront', '#F97316', 'both', true, 10),
  ('Transportation', 'truck', '#3B82F6', 'both', true, 20),
  ('Shopping', 'shopping-bag', '#14B8A6', 'both', true, 30),
  ('Rent & Bills', 'home-modern', '#8B5CF6', 'both', true, 40),
  ('Groceries', 'shopping-cart', '#22C55E', 'personal', true, 50),
  ('Hotel', 'home-modern', '#6366F1', 'split', true, 60),
  ('Gas', 'truck', '#2563EB', 'both', true, 70),
  ('Tickets', 'ticket', '#10B981', 'split', true, 80),
  ('Parking', 'map', '#64748B', 'both', true, 90),
  ('Entertainment', 'sparkles', '#EC4899', 'both', true, 100),
  ('Travel', 'briefcase', '#0EA5E9', 'both', true, 110),
  ('Other', 'ellipsis', '#64748B', 'both', true, 120)
on conflict do nothing;
