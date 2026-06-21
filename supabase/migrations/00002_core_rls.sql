create or replace function public.is_family_member(fam_id uuid)
returns boolean as $$
  select exists (
    select 1
    from public.family_members
    where family_id = fam_id
      and user_id = auth.uid()
  );
$$ language sql security definer stable;

create or replace function public.is_family_admin(fam_id uuid)
returns boolean as $$
  select exists (
    select 1
    from public.family_members
    where family_id = fam_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$ language sql security definer stable;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.families to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

create policy "families_select_member_or_creator" on public.families
for select using (public.is_family_member(id) or created_by = auth.uid());

create policy "families_insert_creator" on public.families
for insert with check (auth.uid() = created_by);

create policy "families_update_admin" on public.families
for update using (public.is_family_admin(id));

create policy "family_members_select_member" on public.family_members
for select using (public.is_family_member(family_id));

create policy "family_members_insert_self_or_admin" on public.family_members
for insert with check (auth.uid() = user_id or public.is_family_admin(family_id));

create policy "family_members_update_admin" on public.family_members
for update using (public.is_family_admin(family_id));

create policy "family_members_delete_admin_or_self" on public.family_members
for delete using (auth.uid() = user_id or public.is_family_admin(family_id));


create policy "events_select_member" on public.events
for select using (
  public.is_family_member(family_id)
  and (is_personal = false or created_by = auth.uid())
);

create policy "events_insert_member" on public.events
for insert with check (public.is_family_member(family_id) and created_by = auth.uid());

create policy "events_update_owner_or_admin" on public.events
for update using (created_by = auth.uid() or public.is_family_admin(family_id));

create policy "events_delete_owner_or_admin" on public.events
for delete using (created_by = auth.uid() or public.is_family_admin(family_id));

create policy "tasks_select_member" on public.tasks
for select using (
  public.is_family_member(family_id)
  and (is_personal = false or created_by = auth.uid() or assigned_to = auth.uid())
);

create policy "tasks_insert_member" on public.tasks
for insert with check (public.is_family_member(family_id) and created_by = auth.uid());

create policy "tasks_update_owner_assignee_or_admin" on public.tasks
for update using (
  created_by = auth.uid()
  or assigned_to = auth.uid()
  or public.is_family_admin(family_id)
);

create policy "tasks_delete_owner_or_admin" on public.tasks
for delete using (created_by = auth.uid() or public.is_family_admin(family_id));
