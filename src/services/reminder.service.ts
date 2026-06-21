import { createClient } from "@/lib/supabase/server";

export async function getReminders(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("family_id", familyId)
    .eq("is_acknowledged", false)
    .order("remind_at");

  if (error) throw error;
  return data;
}