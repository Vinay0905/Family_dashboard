-- Helper function to check if a user can see content created by another user in the family
create or replace function public.can_see_content(item_family_id uuid, item_creator_id uuid)
returns boolean as $$
declare
  viewer_role public.user_role;
  creator_role public.user_role;
begin
  -- If same user, always allow
  if item_creator_id = auth.uid() then
    return true;
  end if;

  -- Get viewer's role
  select role into viewer_role
  from public.family_members
  where family_id = item_family_id and user_id = auth.uid();

  -- If viewer is not a family member, deny
  if viewer_role is null then
    return false;
  end if;

  -- Get creator's role
  select role into creator_role
  from public.family_members
  where family_id = item_family_id and user_id = item_creator_id;

  -- If creator is not a member, default to true
  if creator_role is null then
    return true;
  end if;

  -- Visibility matrix:
  if viewer_role = 'admin' then
    return true; -- admin can see all
  elsif viewer_role = 'member' then
    return creator_role in ('member', 'child'); -- member cannot see admin content
  elsif viewer_role = 'child' then
    return creator_role = 'child'; -- child can only see child content
  end if;

  return false;
end;
$$ language plpgsql security definer stable;

-- 1. events
drop policy if exists "events_select_member" on public.events;
create policy "events_select_member" on public.events
for select using (
  public.is_family_member(family_id)
  and (is_personal = false or created_by = auth.uid())
  and public.can_see_content(family_id, created_by)
);

-- 2. tasks
drop policy if exists "tasks_select_member" on public.tasks;
create policy "tasks_select_member" on public.tasks
for select using (
  public.is_family_member(family_id)
  and (is_personal = false or created_by = auth.uid() or assigned_to = auth.uid())
  and (created_by = auth.uid() or assigned_to = auth.uid() or public.can_see_content(family_id, created_by))
);

-- 3. shopping_lists
drop policy if exists "shopping_lists_family_all" on public.shopping_lists;
create policy "shopping_lists_select" on public.shopping_lists
for select using (public.is_family_member(family_id) and public.can_see_content(family_id, created_by));
create policy "shopping_lists_insert" on public.shopping_lists
for insert with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy "shopping_lists_update" on public.shopping_lists
for update using (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin(family_id)));
create policy "shopping_lists_delete" on public.shopping_lists
for delete using (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin(family_id)));

-- 4. shopping_items
drop policy if exists "shopping_items_family_all" on public.shopping_items;
create policy "shopping_items_select" on public.shopping_items
for select using (public.is_family_member(family_id) and public.can_see_content(family_id, added_by));
create policy "shopping_items_insert" on public.shopping_items
for insert with check (public.is_family_member(family_id) and added_by = auth.uid());
create policy "shopping_items_update" on public.shopping_items
for update using (public.is_family_member(family_id));
create policy "shopping_items_delete" on public.shopping_items
for delete using (public.is_family_member(family_id));

-- 5. reminders
drop policy if exists "reminders_family_all" on public.reminders;
create policy "reminders_select" on public.reminders
for select using (public.is_family_member(family_id) and public.can_see_content(family_id, created_by));
create policy "reminders_insert" on public.reminders
for insert with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy "reminders_update" on public.reminders
for update using (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin(family_id)));
create policy "reminders_delete" on public.reminders
for delete using (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin(family_id)));

-- 6. expenses
drop policy if exists "expenses_select_family" on public.expenses;
create policy "expenses_select_family" on public.expenses
for select using (public.is_family_member(family_id) and public.can_see_content(family_id, created_by));

-- 7. maintenance_assets
drop policy if exists "maintenance_family_all" on public.maintenance_assets;
create policy "maintenance_select" on public.maintenance_assets
for select using (public.is_family_member(family_id) and public.can_see_content(family_id, created_by));
create policy "maintenance_insert" on public.maintenance_assets
for insert with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy "maintenance_update" on public.maintenance_assets
for update using (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin(family_id)));
create policy "maintenance_delete" on public.maintenance_assets
for delete using (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin(family_id)));

-- 8. subscriptions
drop policy if exists "subscriptions_family_all" on public.subscriptions;
create policy "subscriptions_select" on public.subscriptions
for select using (public.is_family_member(family_id) and public.can_see_content(family_id, created_by));
create policy "subscriptions_insert" on public.subscriptions
for insert with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy "subscriptions_update" on public.subscriptions
for update using (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin(family_id)));
create policy "subscriptions_delete" on public.subscriptions
for delete using (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin(family_id)));

-- 9. holiday_plans
drop policy if exists "holiday_family_all" on public.holiday_plans;
create policy "holiday_select" on public.holiday_plans
for select using (public.is_family_member(family_id) and public.can_see_content(family_id, created_by));
create policy "holiday_insert" on public.holiday_plans
for insert with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy "holiday_update" on public.holiday_plans
for update using (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin(family_id)));
create policy "holiday_delete" on public.holiday_plans
for delete using (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin(family_id)));

-- 10. contacts
drop policy if exists "contacts_family_all" on public.contacts;
create policy "contacts_select" on public.contacts
for select using (public.is_family_member(family_id) and public.can_see_content(family_id, created_by));
create policy "contacts_insert" on public.contacts
for insert with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy "contacts_update" on public.contacts
for update using (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin(family_id)));
create policy "contacts_delete" on public.contacts
for delete using (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin(family_id)));

-- 11. documents
drop policy if exists "documents_family_all" on public.documents;
create policy "documents_select" on public.documents
for select using (public.is_family_member(family_id) and public.can_see_content(family_id, created_by));
create policy "documents_insert" on public.documents
for insert with check (public.is_family_member(family_id) and created_by = auth.uid());
create policy "documents_update" on public.documents
for update using (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin(family_id)));
create policy "documents_delete" on public.documents
for delete using (public.is_family_member(family_id) and (created_by = auth.uid() or public.is_family_admin(family_id)));

-- Grant permissions on shopping lists, shopping items, and reminders to authenticated role
grant select, insert, update, delete on public.shopping_lists to authenticated;
grant select, insert, update, delete on public.shopping_items to authenticated;
grant select, insert, update, delete on public.reminders to authenticated;
