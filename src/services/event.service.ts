import { createClient } from "@/lib/supabase/server";
import { CreateEventInput } from "@/lib/validations/event.schema";

export async function getEvents(familyId: string, from: string, to: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("family_id", familyId)
    .gte("start_at", from)
    .lte("start_at", to)
    .order("start_at");

  if (error) throw error;
  return data;
}

export async function createEvent(familyId: string, userId: string, input: CreateEventInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ ...input, family_id: familyId, created_by: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}