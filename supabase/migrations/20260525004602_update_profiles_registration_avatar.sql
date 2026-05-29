-- Registration profile fields and avatar storage.
-- Non-destructive migration for existing profiles table.

alter table public.profiles
  add column if not exists phone text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    email,
    phone,
    emt_email,
    emt_phone,
    default_currency,
    onboarding_completed
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'User'), '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'CAD',
    false
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    email = excluded.email,
    phone = coalesce(public.profiles.phone, excluded.phone),
    emt_email = coalesce(public.profiles.emt_email, excluded.emt_email),
    emt_phone = coalesce(public.profiles.emt_phone, excluded.emt_phone),
    updated_at = now();

  return new;
end;
$$;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_select_public'
  ) then
    create policy "avatars_select_public"
      on storage.objects for select
      using (bucket_id = 'avatars');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_insert_own_folder'
  ) then
    create policy "avatars_insert_own_folder"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_update_own_folder'
  ) then
    create policy "avatars_update_own_folder"
      on storage.objects for update to authenticated
      using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'avatars_delete_own_folder'
  ) then
    create policy "avatars_delete_own_folder"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
