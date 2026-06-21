import { createClient } from "@/lib/supabase/server";

export async function getContacts(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("family_id", familyId)
    .order("name");

  if (error) throw error;
  return data;
}

export async function createContact(contact: {
  family_id: string;
  created_by: string;
  name: string;
  category: "doctor" | "school" | "electrician" | "plumber" | "driver" | "other";
  phone?: string;
  email?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert(contact)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteContact(contactId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId);

  if (error) throw error;
}
