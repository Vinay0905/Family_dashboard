import { createClient } from "@/lib/supabase/server";

export async function getCurrentFamilyForUser(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("family_members")
    .select("family_id, display_name, families(name)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getDashboardCounts(familyId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [events, tasks, shopping, expenses] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }).eq("family_id", familyId).gte("start_at", `${today}T00:00:00`).lte("start_at", `${today}T23:59:59`),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("family_id", familyId).neq("status", "completed"),
    supabase.from("shopping_items").select("id", { count: "exact", head: true }).eq("family_id", familyId).eq("is_purchased", false),
    supabase.from("expenses").select("amount").eq("family_id", familyId).gte("expense_date", from).lte("expense_date", to),
  ]);

  const expensesTotal = (expenses.data || []).reduce((sum, item) => sum + Number(item.amount), 0);

  return {
    todayEvents: events.count ?? 0,
    openTasks: tasks.count ?? 0,
    shoppingItems: shopping.count ?? 0,
    expensesTotal,
  };
}