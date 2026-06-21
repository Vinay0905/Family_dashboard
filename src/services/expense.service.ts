import { createClient } from "@/lib/supabase/server";

export async function getExpensesForMonth(familyId: string, year: number, month: number) {
  const supabase = await createClient();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = new Date(year, month, 0).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("family_id", familyId)
    .gte("expense_date", from)
    .lte("expense_date", to)
    .order("expense_date", { ascending: false });

  if (error) throw error;
  return data;
}

export function getExpenseTotal(expenses: { amount: number }[]) {
  return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
}

export async function createExpense(expense: {
  family_id: string;
  amount: number;
  category: string;
  description: string;
  expense_date: string;
  paid_by: string;
  created_by: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert(expense as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExpense(expenseId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) throw error;
}

export async function getFamilyMembers(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("family_members")
    .select("user_id, display_name")
    .eq("family_id", familyId);

  if (error) throw error;
  return data;
}
