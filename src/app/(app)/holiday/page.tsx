import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyForUser } from "@/services/dashboard.service";
import { getHolidayPlans, createHolidayPlan, deleteHolidayPlan } from "@/services/planning.service";
import { createExpense } from "@/services/expense.service";
import { Plane, Calendar, Plus, Trash2, Luggage, Wallet, AlertCircle } from "lucide-react";

export default async function HolidayPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const member = await getCurrentFamilyForUser(userData.user.id);
  if (!member) redirect("/onboarding");
  const plans = await getHolidayPlans(member.family_id);

  // Server Action to log trip budget as Expense
  async function logHolidayExpense(formData: FormData) {
    "use server";
    const planId = String(formData.get("planId"));
    const destination = String(formData.get("destination"));
    const budget = Number(formData.get("budget"));

    if (!planId || !destination || !budget || budget <= 0) return;

    const supabase = await createClient();
    const { data: userSession } = await supabase.auth.getUser();
    if (!userSession.user) redirect("/login");

    const mem = await getCurrentFamilyForUser(userSession.user.id);
    if (!mem) return;

    await createExpense({
      family_id: mem.family_id,
      amount: budget,
      category: "travel", // default category for holidays
      description: `Trip Budget: ${destination}`,
      expense_date: new Date().toISOString().slice(0, 10),
      paid_by: userSession.user.id,
      created_by: userSession.user.id,
    });

    revalidatePath("/holiday");
  }

  // Server Action to create Trip Plan
  async function addPlan(formData: FormData) {
    "use server";
    const destination = String(formData.get("destination") || "").trim();
    const startDate = String(formData.get("startDate") || "");
    const endDate = String(formData.get("endDate") || "");
    const budgetEstimate = Number(formData.get("budgetEstimate") || 0);
    const notes = String(formData.get("notes") || "").trim();
    const packingListStr = String(formData.get("packingList") || "").trim();

    if (!destination || !startDate || !endDate) return;

    const supabase = await createClient();
    const { data: userSession } = await supabase.auth.getUser();
    if (!userSession.user) redirect("/login");

    const mem = await getCurrentFamilyForUser(userSession.user.id);
    if (!mem) return;

    const packingList = packingListStr
      ? JSON.stringify(packingListStr.split(",").map((s) => s.trim()).filter(Boolean))
      : "[]";

    await createHolidayPlan({
      family_id: mem.family_id,
      created_by: userSession.user.id,
      destination,
      start_date: startDate,
      end_date: endDate,
      budget_estimate: budgetEstimate || undefined,
      notes: notes || undefined,
      packing_list: packingList,
    });

    revalidatePath("/holiday");
  }

  async function removePlan(formData: FormData) {
    "use server";
    const planId = String(formData.get("planId"));
    if (!planId) return;

    await deleteHolidayPlan(planId);
    revalidatePath("/holiday");
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Holiday <span className="text-primary italic">Planner</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Plan destinations, track travel budgets, and assemble checklists for family getaways.
          </p>
        </div>
      </section>

      {/* Grid Container */}
      <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Planned Holidays List */}
        <div className="space-y-6">
          <h3 className="font-heading text-lg font-bold text-on-surface flex items-center gap-3 border-b border-primary/10 pb-2">
            <span className="w-6 h-1 bg-primary rounded-full"></span> Planned Holidays
          </h3>

          {plans.length === 0 ? (
            <div className="rounded border border-dashed border-primary/10 p-10 text-center text-on-surface-variant/50">
              <Plane className="mx-auto h-8 w-8 mb-2 opacity-30 text-primary animate-bounce-slow" />
              <p className="text-sm font-medium">No holiday plans scheduled yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => {
                const packingItems = (Array.isArray(plan.packing_list) ? plan.packing_list : []) as string[];

                return (
                  <article
                    key={plan.id}
                    className="group relative flex flex-col justify-between rounded border border-outline/10 bg-white p-5 hover:shadow-[0_0_20px_rgba(183,0,79,0.03)] hover:border-primary transition-all duration-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/5 text-primary">
                            <Plane className="h-4.5 w-4.5" />
                          </div>
                          <h4 className="font-heading text-lg font-extrabold text-on-surface leading-tight">
                            {plan.destination}
                          </h4>
                        </div>
                        {plan.notes && (
                          <p className="text-xs text-on-surface-variant/80 font-medium leading-relaxed pl-1">
                            {plan.notes}
                          </p>
                        )}
                      </div>

                      {/* Delete actions */}
                      <form action={removePlan} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <input type="hidden" name="planId" value={plan.id} />
                        <button
                          type="submit"
                          className="flex h-8 w-8 items-center justify-center rounded text-on-surface-variant/45 hover:text-primary transition-colors cursor-pointer"
                          title="Delete Plan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>

                    {/* Timeline & Budget info */}
                    <div className="mt-4 flex flex-wrap gap-4 items-center justify-between text-xs text-on-surface-variant/80 font-semibold border-t border-primary/5 pt-3">
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="text-on-surface font-bold">
                            {new Date(plan.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - {new Date(plan.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>

                        {plan.budget_estimate && (
                          <div className="flex items-center gap-1.5">
                            <Wallet className="h-4 w-4 text-primary" />
                            <span className="text-on-surface-variant/60 font-semibold">Budget:</span>
                            <span className="text-on-surface font-extrabold">₹{Number(plan.budget_estimate).toLocaleString("en-IN")}</span>
                          </div>
                        )}
                      </div>

                      {plan.budget_estimate && (
                        <form action={logHolidayExpense}>
                          <input type="hidden" name="planId" value={plan.id} />
                          <input type="hidden" name="destination" value={plan.destination} />
                          <input type="hidden" name="budget" value={plan.budget_estimate} />
                          <button
                            type="submit"
                            className="flex items-center gap-1 py-1 px-3 bg-primary/5 hover:bg-primary text-primary hover:text-white border border-primary/10 hover:border-transparent text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            Log Budget as Expense
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Packing checklist items */}
                    {packingItems.length > 0 && (
                      <div className="mt-3.5 border-t border-primary/5 pt-3.5">
                        <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1.5 mb-2">
                          <Luggage className="h-3.5 w-3.5" /> Packing Checklist ({packingItems.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {packingItems.map((item: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded border border-secondary/20 bg-secondary/15 px-2.5 py-0.5 text-[10px] font-bold text-secondary uppercase tracking-wide"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Form */}
        <div>
          <form action={addPlan} className="space-y-4 rounded glass-card p-6 bg-surface-container-lowest border border-primary/10 h-fit">
            <div>
              <h3 className="font-heading text-lg font-bold text-on-surface mb-4">Plan New Trip</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Destination</label>
              <input
                name="destination"
                type="text"
                placeholder="e.g. Goa, Paris, Manali"
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Start Date</label>
                <input
                  name="startDate"
                  type="date"
                  className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-primary">End Date</label>
                <input
                  name="endDate"
                  type="date"
                  className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Budget Estimate (₹)</label>
              <input
                name="budgetEstimate"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Itinerary / Notes</label>
              <input
                name="notes"
                type="text"
                placeholder="Hotel name, flights booking ref..."
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Packing Checklist</label>
              <input
                name="packingList"
                type="text"
                placeholder="Swimwear, Chargers, Passports (comma separated)"
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-widest py-3 rounded hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(183,0,79,0.15)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Save Plan
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
