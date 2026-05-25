-- Store team settlement member selection and other settlement context.

alter table public.settlements
  add column if not exists metadata jsonb not null default '{}'::jsonb;
