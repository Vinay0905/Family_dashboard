import { createClient } from "@/lib/supabase/server";
import { CreateTaskInput } from "@/lib/validations/tasks.schema";

export async function getTasks(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createTask(familyId: string, userId: string, input: CreateTaskInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, family_id: familyId, created_by: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeTask(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) throw error;
}