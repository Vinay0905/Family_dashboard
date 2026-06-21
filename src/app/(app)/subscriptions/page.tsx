import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyForUser } from "@/services/dashboard.service";
import { getSubscriptions, createSubscription, deleteSubscription, getNextRenewalDate, updateSubscriptionRenewal } from "@/services/planning.service";
import { createExpense } from "@/services/expense.service";
import { CreditCard, Calendar, Plus, Trash2, CheckCircle2 } from "lucide-react";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const member = await getCurrentFamilyForUser(userData.user.id);
  if (!member) redirect("/onboarding");
  const subs = await getSubscriptions(member.family_id);

  // Calculate normalized monthly cost sum
  const totalMonthlyCost = subs
    .filter((s) => s.is_active)
    .reduce((sum, s) => {
      const cost = Number(s.cost);
      if (s.billing_cycle === "monthly") return sum + cost;
      if (s.billing_cycle === "quarterly") return sum + cost / 3;
      if (s.billing_cycle === "yearly") return sum + cost / 12;
      return sum;
    }, 0);

  // Server Action to Log Sub payment as Expense
  async function paySubscription(formData: FormData) {
    "use server";
    const subId = String(formData.get("subId"));
    const name = String(formData.get("name"));
    const cost = Number(formData.get("cost"));
    const cycle = String(formData.get("cycle")) as "monthly" | "quarterly" | "yearly";
    const currentRenewal = String(formData.get("renewalDate"));

    if (!subId || !name || !cost) return;

    const supabase = await createClient();
    const { data: userSession } = await supabase.auth.getUser();
    if (!userSession.user) redirect("/login");

    const mem = await getCurrentFamilyForUser(userSession.user.id);
    if (!mem) return;

    // 1. Create a matching expense log
    await createExpense({
      family_id: mem.family_id,
      amount: cost,
      category: "entertainment", // Default category for subscriptions
      description: `Auto-logged renewal payment: ${name}`,
      expense_date: new Date().toISOString().slice(0, 10),
      paid_by: userSession.user.id,
      created_by: userSession.user.id,
    });

    // 2. Advance renewal date to the next cycle period
    const nextRenewal = getNextRenewalDate(currentRenewal, cycle);
    await updateSubscriptionRenewal(subId, nextRenewal);

    revalidatePath("/subscriptions");
  }

  // Server Action to Add Sub
  async function addSub(formData: FormData) {
    "use server";
    const name = String(formData.get("name") || "").trim();
    const cost = Number(formData.get("cost"));
    const billingCycle = String(formData.get("billingCycle")) as "monthly" | "quarterly" | "yearly";
    const renewalDate = String(formData.get("renewalDate") || "");
    const notes = String(formData.get("notes") || "").trim();

    if (!name || !cost || cost <= 0 || !renewalDate) return;

    const supabase = await createClient();
    const { data: userSession } = await supabase.auth.getUser();
    if (!userSession.user) redirect("/login");

    const mem = await getCurrentFamilyForUser(userSession.user.id);
    if (!mem) return;

    await createSubscription({
      family_id: mem.family_id,
      created_by: userSession.user.id,
      name,
      cost,
      billing_cycle: billingCycle,
      renewal_date: renewalDate,
      is_active: true,
      notes: notes || undefined,
    });

    revalidatePath("/subscriptions");
  }

  async function removeSub(formData: FormData) {
    "use server";
    const subId = String(formData.get("subId"));
    if (!subId) return;

    await deleteSubscription(subId);
    revalidatePath("/subscriptions");
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Family <span className="text-primary italic">Subscriptions</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Track shared streaming services, software licenses, utility plans, and monthly recurring bills.
          </p>
        </div>

        {/* Total Cost Outflow Badge */}
        <div className="rounded bg-primary/10 border border-primary/20 px-5 py-3 text-primary font-semibold text-sm flex items-center gap-3 shadow-[0_0_15px_rgba(183,0,79,0.02)]">
          <CreditCard className="h-5 w-5 shrink-0" />
          <div>
            <span className="block text-[9px] uppercase font-bold text-primary/75 tracking-wider">Outflow Equivalent</span>
            <span className="text-base font-heading font-black">₹{totalMonthlyCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / month</span>
          </div>
        </div>
      </section>

      {/* Grid Container */}
      <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Subscriptions Stream */}
        <div className="space-y-6">
          <h3 className="font-heading text-lg font-bold text-on-surface flex items-center gap-3 border-b border-primary/10 pb-2">
            <span className="w-6 h-1 bg-primary rounded-full"></span> Active Subscriptions
          </h3>

          {subs.length === 0 ? (
            <div className="rounded border border-dashed border-primary/10 p-10 text-center text-on-surface-variant/50">
              <CreditCard className="mx-auto h-8 w-8 mb-2 opacity-30 text-primary" />
              <p className="text-sm font-medium">No active subscriptions currently tracked.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subs.map((sub) => {
                const isRenewingSoon = sub.renewal_date && sub.renewal_date >= today && 
                  (new Date(sub.renewal_date).getTime() - new Date(today).getTime()) < (7 * 24 * 60 * 60 * 1000);
                
                return (
                  <article
                    key={sub.id}
                    className="group relative flex items-center justify-between rounded border border-outline/10 bg-white p-4 hover:shadow-[0_0_20px_rgba(183,0,79,0.03)] hover:border-primary transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/5 text-primary">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading text-base font-extrabold text-on-surface">{sub.name}</h4>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-primary/10 bg-primary/5 text-primary uppercase">
                            {sub.billing_cycle}
                          </span>
                          {isRenewingSoon && (
                            <span className="bg-error text-on-error px-2 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase animate-pulse">
                              Renewing Soon
                            </span>
                          )}
                        </div>
                        {sub.notes && <p className="text-xs text-on-surface-variant/80 mt-1 font-medium">{sub.notes}</p>}
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-on-surface-variant/60 font-semibold">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          <span>RENEWAL DATE: {new Date(sub.renewal_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Log Payment Trigger */}
                      <form action={paySubscription}>
                        <input type="hidden" name="subId" value={sub.id} />
                        <input type="hidden" name="name" value={sub.name} />
                        <input type="hidden" name="cost" value={sub.cost} />
                        <input type="hidden" name="cycle" value={sub.billing_cycle} />
                        <input type="hidden" name="renewalDate" value={sub.renewal_date} />
                        <button 
                          type="submit" 
                          className="flex items-center gap-1.5 py-1.5 px-3 bg-primary/5 hover:bg-primary text-primary hover:text-white border border-primary/10 hover:border-transparent text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Log Payment
                        </button>
                      </form>

                      <div className="text-right">
                        <span className="block font-heading font-extrabold text-on-surface text-lg">
                          ₹{Number(sub.cost).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                        </span>
                        <span className="text-[9px] text-on-surface-variant/50 uppercase font-semibold">
                          ₹{(sub.billing_cycle === "yearly" ? Number(sub.cost) / 12 : sub.billing_cycle === "quarterly" ? Number(sub.cost) / 3 : Number(sub.cost)).toFixed(0)} / mo
                        </span>
                      </div>

                      {/* Delete Trigger */}
                      <form action={removeSub} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <input type="hidden" name="subId" value={sub.id} />
                        <button
                          type="submit"
                          className="flex h-8 w-8 items-center justify-center rounded text-on-surface-variant/45 hover:text-primary transition-colors cursor-pointer"
                          title="Delete Subscription"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Creation Form */}
        <div>
          <form action={addSub} className="space-y-4 rounded glass-card p-6 bg-surface-container-lowest border border-primary/10 h-fit">
            <div>
              <h3 className="font-heading text-lg font-bold text-on-surface mb-4">Track Subscription</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Subscription Name</label>
              <input
                name="name"
                type="text"
                placeholder="e.g. Netflix, Spotify Premium"
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Cost (₹)</label>
                <input
                  name="cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Cycle</label>
                <select
                  name="billingCycle"
                  className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                  defaultValue="monthly"
                  required
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Next Renewal Date</label>
              <input
                name="renewalDate"
                type="date"
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Notes</label>
              <input
                name="notes"
                type="text"
                placeholder="Linked credit card, login location..."
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-widest py-3 rounded hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(183,0,79,0.15)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Subscription
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
