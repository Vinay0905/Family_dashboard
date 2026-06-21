import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyForUser } from "@/services/dashboard.service";
import {
  getExpensesForMonth,
  getExpenseTotal,
  createExpense,
  deleteExpense,
  getFamilyMembers,
} from "@/services/expense.service";
import {
  ShoppingCart,
  Lightbulb,
  GraduationCap,
  Car,
  Tv,
  HeartPulse,
  Plane,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Users,
  Wallet,
  ArrowRight,
  AlertCircle
} from "lucide-react";

// Map categories to visual config
const CATEGORY_MAP: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  grocery: { label: "Grocery", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500", icon: ShoppingCart },
  utilities: { label: "Utilities", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500", icon: Lightbulb },
  education: { label: "Education", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500", icon: GraduationCap },
  fuel: { label: "Fuel", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500", icon: Car },
  entertainment: { label: "Entertainment", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500", icon: Tv },
  medical: { label: "Medical", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500", icon: HeartPulse },
  travel: { label: "Travel", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500", icon: Plane },
  miscellaneous: { label: "Miscellaneous", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500", icon: DollarSign },
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const member = await getCurrentFamilyForUser(userData.user.id);
  if (!member) redirect("/onboarding");
  const familyMembers = await getFamilyMembers(member.family_id);

  const params = await searchParams;
  const now = new Date();
  const currentYear = Number(params.year) || now.getFullYear();
  const currentMonth = Number(params.month) || (now.getMonth() + 1);

  const expenses = await getExpensesForMonth(member.family_id, currentYear, currentMonth);
  const total = getExpenseTotal(expenses);

  // Month navigation helpers
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  // Category breakdown calculation
  const categoryTotals: Record<string, number> = {
    grocery: 0,
    utilities: 0,
    education: 0,
    fuel: 0,
    entertainment: 0,
    medical: 0,
    travel: 0,
    miscellaneous: 0,
  };

  expenses.forEach((exp) => {
    const cat = exp.category || "miscellaneous";
    if (cat in categoryTotals) {
      categoryTotals[cat] += Number(exp.amount);
    }
  });

  const sortedBreakdown = Object.entries(categoryTotals)
    .map(([cat, amount]) => ({
      cat,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
      ...CATEGORY_MAP[cat],
    }))
    .sort((a, b) => b.amount - a.amount);

  // Group splits ledger calculation
  const memberSpends: Record<string, number> = {};
  familyMembers.forEach((m) => {
    memberSpends[m.user_id] = 0;
  });

  expenses.forEach((exp) => {
    const paidBy = exp.paid_by;
    if (paidBy in memberSpends) {
      memberSpends[paidBy] += Number(exp.amount);
    }
  });

  const N = familyMembers.length;
  const averageShare = N > 0 ? total / N : 0;

  // Creditors and Debtors
  const creditors: { userId: string; name: string; amount: number }[] = [];
  const debtors: { userId: string; name: string; amount: number }[] = [];

  familyMembers.forEach((m) => {
    const spent = memberSpends[m.user_id] || 0;
    const balance = spent - averageShare;
    
    if (balance > 0.01) {
      creditors.push({ userId: m.user_id, name: m.display_name || "Unknown", amount: balance });
    } else if (balance < -0.01) {
      debtors.push({ userId: m.user_id, name: m.display_name || "Unknown", amount: Math.abs(balance) });
    }
  });

  // Clone creditors/debtors for mutable greedy calculation
  const mutableCreditors = creditors.map(c => ({ ...c }));
  const mutableDebtors = debtors.map(d => ({ ...d }));

  mutableCreditors.sort((a, b) => b.amount - a.amount);
  mutableDebtors.sort((a, b) => b.amount - a.amount);

  const settlements: { from: string; to: string; amount: number }[] = [];
  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < mutableCreditors.length && dIdx < mutableDebtors.length) {
    const creditor = mutableCreditors[cIdx];
    const debtor = mutableDebtors[dIdx];

    const amountToSettle = Math.min(creditor.amount, debtor.amount);
    settlements.push({
      from: debtor.name,
      to: creditor.name,
      amount: amountToSettle,
    });

    creditor.amount -= amountToSettle;
    debtor.amount -= amountToSettle;

    if (creditor.amount < 0.01) cIdx++;
    if (debtor.amount < 0.01) dIdx++;
  }

  // Server Actions
  async function addExpenseAction(formData: FormData) {
    "use server";
    const amount = Number(formData.get("amount"));
    const category = String(formData.get("category"));
    const description = String(formData.get("description") || "").trim();
    const dateStr = String(formData.get("expenseDate"));
    const paidBy = String(formData.get("paidBy"));

    if (!amount || amount <= 0) return redirect(`/expenses?year=${currentYear}&month=${currentMonth}&error=Amount+must+be+greater+than+0`);
    if (!category) return redirect(`/expenses?year=${currentYear}&month=${currentMonth}&error=Select+a+category`);
    if (!paidBy) return redirect(`/expenses?year=${currentYear}&month=${currentMonth}&error=Select+who+paid`);

    const supabase = await createClient();
    const { data: userSession } = await supabase.auth.getUser();
    if (!userSession.user) redirect("/login");

    const mem = await getCurrentFamilyForUser(userSession.user.id);
    if (!mem) return;

    await createExpense({
      family_id: mem.family_id,
      amount,
      category,
      description,
      expense_date: dateStr || new Date().toISOString().slice(0, 10),
      paid_by: paidBy,
      created_by: userSession.user.id,
    });

    revalidatePath("/expenses");
    redirect(`/expenses?year=${currentYear}&month=${currentMonth}`);
  }

  async function deleteExpenseAction(formData: FormData) {
    "use server";
    const expenseId = String(formData.get("expenseId"));
    if (!expenseId) return;

    await deleteExpense(expenseId);
    revalidatePath("/expenses");
    redirect(`/expenses?year=${currentYear}&month=${currentMonth}`);
  }

  const topCategoryItem = sortedBreakdown.find(item => item.amount > 0);

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Family <span className="text-primary italic">Expenses</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Log shared household purchases and split the balance ledger fairly.
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 rounded bg-surface-container border border-primary/10 p-1 shadow-sm h-fit">
          <Link
            href={`/expenses?year=${prevYear}&month=${prevMonth}`}
            className="p-1.5 hover:text-primary transition-colors text-on-surface-variant cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest px-3 min-w-[130px] text-center select-none text-on-surface">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </span>
          <Link
            href={`/expenses?year=${nextYear}&month=${nextMonth}`}
            className="p-1.5 hover:text-primary transition-colors text-on-surface-variant cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {params.error && (
        <div className="rounded border border-error bg-error/5 p-4 text-xs font-bold text-error flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{params.error}</span>
        </div>
      )}

      {/* Summary Bento Boxes */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-surface-container-lowest border border-outline/10 rounded shadow-[0_4px_15px_rgba(183,0,79,0.02)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/75 mb-2">Total Monthly Spend</p>
          <h3 className="font-heading text-primary text-2xl font-extrabold">₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h3>
          <p className="text-[10px] mt-2 text-on-surface-variant font-medium">Household spent this month</p>
        </div>

        <div className="p-6 bg-surface-container-lowest border border-outline/10 rounded shadow-[0_4px_15px_rgba(183,0,79,0.02)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/75 mb-2">Average Share</p>
          <h3 className="font-heading text-on-surface text-2xl font-extrabold">₹{averageShare.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</h3>
          <p className="text-[10px] mt-2 text-on-surface-variant font-medium">Per family member ({N} members)</p>
        </div>

        <div className="p-6 bg-surface-container-lowest border border-outline/10 rounded shadow-[0_4px_15px_rgba(183,0,79,0.02)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/75 mb-2">Owed Settlements</p>
          <h3 className="font-heading text-secondary text-2xl font-extrabold">₹{(settlements.reduce((acc, s) => acc + s.amount, 0)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</h3>
          <p className="text-[10px] mt-2 text-on-surface-variant font-medium">Pending split amounts</p>
        </div>

        <div className="p-6 bg-surface-container-lowest border border-outline/10 rounded shadow-[0_4px_15px_rgba(183,0,79,0.02)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/75 mb-2">Top Spend Category</p>
          <h3 className="font-heading text-tertiary text-2xl font-extrabold">{topCategoryItem?.label || "None"}</h3>
          <p className="text-[10px] mt-2 text-on-surface-variant font-medium">
            {topCategoryItem ? `₹${topCategoryItem.amount.toLocaleString("en-IN")} spent` : "No purchases logged"}
          </p>
        </div>
      </section>

      {/* Main Forms & Streams */}
      <section className="grid gap-8 lg:grid-cols-3">
        {/* Left Columns (Form & Logs) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Add Expense Form Card */}
          <div className="rounded glass-card p-6 bg-surface-container-lowest border border-primary/10 shadow-[0_4px_20px_rgba(183,0,79,0.02)]">
            <h3 className="font-heading text-lg font-extrabold text-on-surface mb-5 flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Log New Expense
            </h3>

            <form action={addExpenseAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Amount (INR)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-on-surface-variant font-extrabold">₹</span>
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full rounded border border-outline-variant bg-white pl-7 pr-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Category</label>
                  <select
                    name="category"
                    className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                    required
                  >
                    <option value="">Select Category</option>
                    {Object.entries(CATEGORY_MAP).map(([val, conf]) => (
                      <option key={val} value={val}>
                        {conf.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Who Paid?</label>
                  <select
                    name="paidBy"
                    className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                    required
                  >
                    <option value="">Select Family Member</option>
                    {familyMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.display_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Expense Date</label>
                  <input
                    name="expenseDate"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Description</label>
                <input
                  name="description"
                  type="text"
                  placeholder="e.g. Weekly organic vegetables, Electric bill"
                  className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-widest py-3 rounded hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(183,0,79,0.15)] flex items-center justify-center gap-2 cursor-pointer"
              >
                Log Expense
              </button>
            </form>
          </div>

          {/* Expense Log List */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-primary px-1">Expense Log Stream</h3>
            
            {expenses.length === 0 ? (
              <div className="rounded border border-dashed border-primary/10 p-10 text-center text-on-surface-variant/50">
                <Wallet className="mx-auto h-8 w-8 mb-2 opacity-30 text-primary" />
                <p className="text-sm font-medium">No expenses logged for this month.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => {
                  const categoryConf = CATEGORY_MAP[expense.category] || CATEGORY_MAP.miscellaneous;
                  const Icon = categoryConf.icon;
                  const payer = familyMembers.find((m) => m.user_id === expense.paid_by);
                  
                  return (
                    <article
                      key={expense.id}
                      className="group flex items-center justify-between rounded border border-outline/10 bg-white p-4 hover:shadow-[0_0_20px_rgba(183,0,79,0.03)] hover:border-primary transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/5 ${categoryConf.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-extrabold text-on-surface">
                              ₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded border bg-primary/5 border-primary/10 text-primary uppercase">
                              {categoryConf.label}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5 font-medium">
                            {expense.description || <span className="italic opacity-50">No description</span>}
                          </p>
                          <p className="text-[10px] text-on-surface-variant/70 mt-0.5">
                            Paid by <span className="font-semibold">{payer?.display_name || "Unknown"}</span> on {new Date(expense.expense_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>

                      {/* Delete Action */}
                      <form action={deleteExpenseAction} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <input type="hidden" name="expenseId" value={expense.id} />
                        <button
                          type="submit"
                          className="flex h-8 w-8 items-center justify-center rounded text-on-surface-variant/45 hover:text-primary transition-colors cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Columns (Breakdowns & Ledger) */}
        <div className="space-y-6">
          {/* Category breakdowns */}
          <div className="rounded glass-card p-6 bg-surface-container-lowest border border-primary/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-5">
              Category Breakdown
            </h3>

            {total === 0 ? (
              <p className="text-xs text-on-surface-variant/50 text-center py-4 italic">No data logged.</p>
            ) : (
              <div className="space-y-4.5">
                {sortedBreakdown.map((item) => {
                  if (item.amount === 0) return null;
                  const Icon = item.icon;

                  return (
                    <div key={item.cat} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${item.color}`} />
                          <span className="text-on-surface">{item.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-on-surface">
                            ₹{item.amount.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] text-on-surface-variant/60 ml-1.5">
                            ({item.percentage.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-1.5 w-full rounded bg-surface-container overflow-hidden">
                        <div
                          className={`h-full rounded bg-primary`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settle up splits ledgers */}
          <div className="rounded glass-card p-6 bg-surface-container-lowest border border-primary/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-5">
              Family Ledger Balance
            </h3>
            
            {total === 0 ? (
              <p className="text-xs text-on-surface-variant/50 text-center py-4 italic">No logs this month.</p>
            ) : (
              <div className="space-y-5">
                {/* Individual spend details */}
                <div className="space-y-2.5 border-b border-primary/10 pb-4">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary/60 block">
                    Individual Balances
                  </span>
                  
                  {familyMembers.map((m) => {
                    const spent = memberSpends[m.user_id] || 0;
                    const balance = spent - averageShare;
                    const isOwed = balance > 0;
                    
                    return (
                      <div key={m.user_id} className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-on-surface">{m.display_name}</span>
                        <div className="text-right flex items-center gap-2">
                          <span className="text-[10px] text-on-surface-variant/60">Spent ₹{spent.toFixed(0)}</span>
                          {Math.abs(balance) < 0.01 ? (
                            <span className="text-[10px] font-bold text-on-surface-variant/60">Settled</span>
                          ) : (
                            <span className={`font-extrabold ${isOwed ? "text-secondary" : "text-primary"}`}>
                              {isOwed ? "+" : "-"}₹{Math.abs(balance).toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Settle up checklist path */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary/60 block">
                    Recommended Settlements
                  </span>
                  {settlements.length === 0 ? (
                    <p className="text-xs text-on-surface-variant/60 py-1 italic">All member spendings are equal!</p>
                  ) : (
                    <div className="space-y-2">
                      {settlements.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs rounded bg-surface-container border border-primary/5 p-2.5">
                          <div className="font-semibold text-on-surface">
                            <span>{s.from}</span>
                            <span className="text-on-surface-variant/60 font-normal px-1.5">pays</span>
                            <span>{s.to}</span>
                          </div>
                          <span className="font-extrabold text-primary">
                            ₹{s.amount.toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
