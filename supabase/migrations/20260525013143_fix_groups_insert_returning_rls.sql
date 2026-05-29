-- Fix group creation: INSERT ... RETURNING was blocked because the only
-- SELECT policy called can_access_group(), which cannot evaluate the newly
-- inserted owner row during RETURNING. Owners can always read their groups.

create policy "groups_select_owner" on public.groups
  for select to authenticated
  using (owner_id = auth.uid());
