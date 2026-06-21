import { createClient } from "@/lib/supabase/server";

export async function getShoppingLists(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_lists")
    .select("*, shopping_items(*)")
    .eq("family_id", familyId)
    .order("created_at");

  if (error) throw error;
  return data || [];
}

export async function createShoppingList(name: string, familyId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_lists")
    .insert({ name, family_id: familyId, created_by: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteShoppingList(listId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_lists")
    .delete()
    .eq("id", listId);

  if (error) throw error;
}

export async function addShoppingItem(item: {
  list_id: string;
  family_id: string;
  added_by: string;
  name: string;
  quantity?: number;
  unit?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_items")
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleShoppingItem(itemId: string, isPurchased: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_items")
    .update({ is_purchased: isPurchased })
    .eq("id", itemId);

  if (error) throw error;
}

export async function deleteShoppingItem(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_items")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
}
