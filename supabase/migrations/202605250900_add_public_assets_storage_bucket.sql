-- Public brand assets for email templates and external references.

insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do update set public = excluded.public;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'public_assets_select_public'
  ) then
    create policy "public_assets_select_public"
      on storage.objects for select to public
      using (bucket_id = 'public-assets');
  end if;
end $$;
