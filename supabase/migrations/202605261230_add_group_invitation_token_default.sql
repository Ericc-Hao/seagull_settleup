-- Generate invitation tokens in Postgres so React Native clients do not need
-- platform-specific secure random APIs.
create extension if not exists pgcrypto;

alter table public.group_invitations
  alter column token set default encode(gen_random_bytes(32), 'hex');

update public.group_invitations
set token = encode(gen_random_bytes(32), 'hex')
where token is null;
