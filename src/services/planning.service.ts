import { createClient } from "@/lib/supabase/server";

// Maintenance Assets
export async function getMaintenanceAssets(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_assets")
    .select("*")
    .eq("family_id", familyId)
    .order("next_due_date", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createMaintenanceAsset(asset: {
  family_id: string;
  created_by: string;
  name: string;
  last_service_date?: string;
  next_due_date?: string;
  vendor?: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_assets")
    .insert(asset)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMaintenanceAsset(assetId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("maintenance_assets")
    .delete()
    .eq("id", assetId);

  if (error) throw error;
}

// Subscriptions
export async function getSubscriptions(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("family_id", familyId)
    .order("renewal_date", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createSubscription(sub: {
  family_id: string;
  created_by: string;
  name: string;
  cost: number;
  billing_cycle: "monthly" | "quarterly" | "yearly";
  renewal_date: string;
  is_active: boolean;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .insert(sub)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSubscription(subId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", subId);

  if (error) throw error;
}

// Holiday Plans
export async function getHolidayPlans(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("holiday_plans")
    .select("*")
    .eq("family_id", familyId)
    .order("start_date", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createHolidayPlan(plan: {
  family_id: string;
  created_by: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget_estimate?: number;
  notes?: string;
  packing_list?: string; // stringified JSON
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("holiday_plans")
    .insert({
      ...plan,
      packing_list: plan.packing_list ? JSON.parse(plan.packing_list) : [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHolidayPlan(planId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("holiday_plans")
    .delete()
    .eq("id", planId);

  if (error) throw error;
}

export function getNextRenewalDate(currentDateStr: string, cycle: "monthly" | "quarterly" | "yearly") {
  const d = new Date(currentDateStr);
  if (cycle === "monthly") {
    d.setMonth(d.getMonth() + 1);
  } else if (cycle === "quarterly") {
    d.setMonth(d.getMonth() + 3);
  } else if (cycle === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.toISOString().slice(0, 10);
}

export async function updateSubscriptionRenewal(subId: string, nextRenewalDate: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ renewal_date: nextRenewalDate })
    .eq("id", subId);

  if (error) throw error;
}
