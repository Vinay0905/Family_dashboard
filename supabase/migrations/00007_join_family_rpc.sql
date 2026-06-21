-- Remote Procedure Call to join a family by invite code.
-- Bypasses the initial SELECT RLS restriction for non-members because it is security definer.
create or replace function public.join_family_by_code(invite_code_input text, display_name_input text)
returns uuid as $$
declare
  target_family_id uuid;
begin
  -- Find the family ID case-insensitively
  select id into target_family_id
  from public.families
  where lower(invite_code) = lower(invite_code_input);

  if target_family_id is null then
    raise exception 'Invalid invite code. Please check and try again.';
  end if;

  -- Insert the member
  insert into public.family_members (family_id, user_id, role, display_name)
  values (target_family_id, auth.uid(), 'member', display_name_input)
  on conflict (family_id, user_id) do update
  set display_name = excluded.display_name;

  return target_family_id;
end;
$$ language plpgsql security definer;

-- Grant execution to authenticated users
grant execute on function public.join_family_by_code(text, text) to authenticated;

-- Storage Policies for 'documents' bucket
-- Allows family members to access their own family folder (which uses the family_id as the top-level directory)
create policy "Select document object if family member" on storage.objects
for select to authenticated
using (
  bucket_id = 'documents'
  and public.is_family_member((split_part(name, '/', 1))::uuid)
);

create policy "Insert document object if family member" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documents'
  and public.is_family_member((split_part(name, '/', 1))::uuid)
);

create policy "Delete document object if family member" on storage.objects
for delete to authenticated
using (
  bucket_id = 'documents'
  and public.is_family_member((split_part(name, '/', 1))::uuid)
);
