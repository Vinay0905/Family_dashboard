-- ====================================================================
-- Migration: 00010_database_advisor_remediations.sql
-- Resolves all Supabase security and performance advisor linter issues
-- ====================================================================

-- 1. Create indexes for unindexed foreign keys to optimize joins and cascade deletes
CREATE INDEX IF NOT EXISTS idx_contacts_family_id ON public.contacts(family_id);
CREATE INDEX IF NOT EXISTS idx_contacts_created_by ON public.contacts(created_by);

CREATE INDEX IF NOT EXISTS idx_documents_family_id ON public.documents(family_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);

CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);

CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON public.expenses(paid_by);

CREATE INDEX IF NOT EXISTS idx_families_created_by ON public.families(created_by);

CREATE INDEX IF NOT EXISTS idx_holiday_plans_family_id ON public.holiday_plans(family_id);
CREATE INDEX IF NOT EXISTS idx_holiday_plans_created_by ON public.holiday_plans(created_by);

CREATE INDEX IF NOT EXISTS idx_maintenance_assets_family_id ON public.maintenance_assets(family_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_assets_created_by ON public.maintenance_assets(created_by);

CREATE INDEX IF NOT EXISTS idx_reminders_family_id ON public.reminders(family_id);
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON public.reminders(created_by);

CREATE INDEX IF NOT EXISTS idx_shopping_items_family_id ON public.shopping_items(family_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_added_by ON public.shopping_items(added_by);
CREATE INDEX IF NOT EXISTS idx_shopping_items_list_id ON public.shopping_items(list_id);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_family_id ON public.shopping_lists(family_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_created_by ON public.shopping_lists(created_by);

CREATE INDEX IF NOT EXISTS idx_subscriptions_family_id ON public.subscriptions(family_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_by ON public.subscriptions(created_by);

CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);

-- 2. Secure and restrict security definer functions by setting search_path and revoking public access
ALTER FUNCTION public.join_family_by_code(text, text) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.join_family_by_code(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.join_family_by_code(text, text) TO authenticated;

ALTER FUNCTION public.can_see_content(uuid, uuid) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.can_see_content(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_see_content(uuid, uuid) TO authenticated;

ALTER FUNCTION public.is_family_member(uuid) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.is_family_member(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_family_member(uuid) TO authenticated;

ALTER FUNCTION public.is_family_admin(uuid) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.is_family_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_family_admin(uuid) TO authenticated;

ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated;

-- 3. Optimize RLS Policies to use (select auth.uid()) subqueries instead of direct function evaluation
-- This allows Postgres to cache the user ID instead of re-evaluating it for every scanned row.

-- public.families RLS
DROP POLICY IF EXISTS "families_select_member_or_creator" ON public.families;
CREATE POLICY "families_select_member_or_creator" ON public.families
  FOR SELECT USING (public.is_family_member(id) OR created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "families_insert_creator" ON public.families;
CREATE POLICY "families_insert_creator" ON public.families
  FOR INSERT WITH CHECK (created_by = (SELECT auth.uid()));

-- public.family_members RLS
DROP POLICY IF EXISTS "family_members_insert_self_or_admin" ON public.family_members;
CREATE POLICY "family_members_insert_self_or_admin" ON public.family_members
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_family_admin(family_id));

DROP POLICY IF EXISTS "family_members_delete_admin_or_self" ON public.family_members;
CREATE POLICY "family_members_delete_admin_or_self" ON public.family_members
  FOR DELETE USING (user_id = (SELECT auth.uid()) OR public.is_family_admin(family_id));

-- public.events RLS
DROP POLICY IF EXISTS "events_insert_member" ON public.events;
CREATE POLICY "events_insert_member" ON public.events
  FOR INSERT WITH CHECK (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "events_update_owner_or_admin" ON public.events;
CREATE POLICY "events_update_owner_or_admin" ON public.events
  FOR UPDATE USING (created_by = (SELECT auth.uid()) OR public.is_family_admin(family_id));

DROP POLICY IF EXISTS "events_delete_owner_or_admin" ON public.events;
CREATE POLICY "events_delete_owner_or_admin" ON public.events
  FOR DELETE USING (created_by = (SELECT auth.uid()) OR public.is_family_admin(family_id));

-- public.tasks RLS
DROP POLICY IF EXISTS "tasks_insert_member" ON public.tasks;
CREATE POLICY "tasks_insert_member" ON public.tasks
  FOR INSERT WITH CHECK (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "tasks_update_owner_assignee_or_admin" ON public.tasks;
CREATE POLICY "tasks_update_owner_assignee_or_admin" ON public.tasks
  FOR UPDATE USING (created_by = (SELECT auth.uid()) OR assigned_to = (SELECT auth.uid()) OR public.is_family_admin(family_id));

DROP POLICY IF EXISTS "tasks_delete_owner_or_admin" ON public.tasks;
CREATE POLICY "tasks_delete_owner_or_admin" ON public.tasks
  FOR DELETE USING (created_by = (SELECT auth.uid()) OR public.is_family_admin(family_id));

-- public.expenses RLS
DROP POLICY IF EXISTS "expenses_insert_family" ON public.expenses;
CREATE POLICY "expenses_insert_family" ON public.expenses
  FOR INSERT WITH CHECK (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "expenses_update_owner_admin" ON public.expenses;
CREATE POLICY "expenses_update_owner_admin" ON public.expenses
  FOR UPDATE USING (created_by = (SELECT auth.uid()) OR public.is_family_admin(family_id));

DROP POLICY IF EXISTS "expenses_delete_owner_admin" ON public.expenses;
CREATE POLICY "expenses_delete_owner_admin" ON public.expenses
  FOR DELETE USING (created_by = (SELECT auth.uid()) OR public.is_family_admin(family_id));

-- public.shopping_lists RLS
DROP POLICY IF EXISTS "shopping_lists_insert" ON public.shopping_lists;
CREATE POLICY "shopping_lists_insert" ON public.shopping_lists
  FOR INSERT WITH CHECK (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "shopping_lists_update" ON public.shopping_lists;
CREATE POLICY "shopping_lists_update" ON public.shopping_lists
  FOR UPDATE USING (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "shopping_lists_delete" ON public.shopping_lists;
CREATE POLICY "shopping_lists_delete" ON public.shopping_lists
  FOR DELETE USING (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

-- public.shopping_items RLS
DROP POLICY IF EXISTS "shopping_items_insert" ON public.shopping_items;
CREATE POLICY "shopping_items_insert" ON public.shopping_items
  FOR INSERT WITH CHECK (public.is_family_member(family_id) AND added_by = (SELECT auth.uid()));

-- public.reminders RLS
DROP POLICY IF EXISTS "reminders_insert" ON public.reminders;
CREATE POLICY "reminders_insert" ON public.reminders
  FOR INSERT WITH CHECK (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "reminders_update" ON public.reminders;
CREATE POLICY "reminders_update" ON public.reminders
  FOR UPDATE USING (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "reminders_delete" ON public.reminders;
CREATE POLICY "reminders_delete" ON public.reminders
  FOR DELETE USING (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

-- public.maintenance_assets RLS
DROP POLICY IF EXISTS "maintenance_insert" ON public.maintenance_assets;
CREATE POLICY "maintenance_insert" ON public.maintenance_assets
  FOR INSERT WITH CHECK (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "maintenance_update" ON public.maintenance_assets;
CREATE POLICY "maintenance_update" ON public.maintenance_assets
  FOR UPDATE USING (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "maintenance_delete" ON public.maintenance_assets;
CREATE POLICY "maintenance_delete" ON public.maintenance_assets
  FOR DELETE USING (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

-- public.subscriptions RLS
DROP POLICY IF EXISTS "subscriptions_insert" ON public.subscriptions;
CREATE POLICY "subscriptions_insert" ON public.subscriptions
  FOR INSERT WITH CHECK (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "subscriptions_update" ON public.subscriptions;
CREATE POLICY "subscriptions_update" ON public.subscriptions
  FOR UPDATE USING (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "subscriptions_delete" ON public.subscriptions;
CREATE POLICY "subscriptions_delete" ON public.subscriptions
  FOR DELETE USING (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

-- public.holiday_plans RLS
DROP POLICY IF EXISTS "holiday_insert" ON public.holiday_plans;
CREATE POLICY "holiday_insert" ON public.holiday_plans
  FOR INSERT WITH CHECK (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "holiday_update" ON public.holiday_plans;
CREATE POLICY "holiday_update" ON public.holiday_plans
  FOR UPDATE USING (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "holiday_delete" ON public.holiday_plans;
CREATE POLICY "holiday_delete" ON public.holiday_plans
  FOR DELETE USING (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

-- public.contacts RLS
DROP POLICY IF EXISTS "contacts_insert" ON public.contacts;
CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT WITH CHECK (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "contacts_update" ON public.contacts;
CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE USING (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "contacts_delete" ON public.contacts;
CREATE POLICY "contacts_delete" ON public.contacts
  FOR DELETE USING (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

-- public.documents RLS
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT WITH CHECK (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "documents_update" ON public.documents;
CREATE POLICY "documents_update" ON public.documents
  FOR UPDATE USING (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "documents_delete" ON public.documents;
CREATE POLICY "documents_delete" ON public.documents
  FOR DELETE USING (public.is_family_member(family_id) AND created_by = (SELECT auth.uid()));
