"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertCircle,
  TrendingUp,
  X,
  Edit2,
  Check,
  Search,
  ArrowUpDown
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from "recharts";

const CATEGORY_MAP: Record<
  string,
  { label: string; color: string; bg: string; icon: any; fill: string }
> = {
  grocery: { label: "Grocery", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500", icon: ShoppingCart, fill: "#10b981" },
  utilities: { label: "Utilities", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500", icon: Lightbulb, fill: "#f59e0b" },
  education: { label: "Education", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500", icon: GraduationCap, fill: "#6366f1" },
  fuel: { label: "Fuel", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500", icon: Car, fill: "#f97316" },
  entertainment: { label: "Entertainment", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500", icon: Tv, fill: "#ec4899" },
  medical: { label: "Medical", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500", icon: HeartPulse, fill: "#f43f5e" },
  travel: { label: "Travel", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500", icon: Plane, fill: "#0ea5e9" },
  miscellaneous: { label: "Miscellaneous", color: "text-slate-655 dark:text-slate-400", bg: "bg-slate-500", icon: DollarSign, fill: "#64748b" },
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ExpensesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [memberRole, setMemberRole] = useState<string>("member");

  // Budget states
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState("");

  // Month navigation
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(Number(searchParams.get("year")) || now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(Number(searchParams.get("month")) || (now.getMonth() + 1));

  // Table filters & sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paidByFilter, setPaidByFilter] = useState("all");
  const [sortField, setSortField] = useState<"expense_date" | "amount">("expense_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc"); // Default earliest first

  // Modal Form state
  const [showLogModal, setShowLogModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          router.push("/login");
          return;
        }
        setCurrentUser(userData.user);

        // Get family membership
        const { data: memberData } = await supabase
          .from("family_members")
          .select("family_id, role")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (!memberData) {
          router.push("/onboarding");
          return;
        }
        setFamilyId(memberData.family_id);
        setMemberRole(memberData.role);

        // Fetch family details (budget)
        const { data: familyData } = await supabase
          .from("families")
          .select("*" as any)
          .eq("id", memberData.family_id)
          .single() as any;

        if (familyData) {
          setMonthlyBudget(Number(familyData.monthly_budget) || 0);
          setTempBudget(String(familyData.monthly_budget || 0));
        }

        // Fetch family members
        const { data: membersData } = await supabase
          .from("family_members")
          .select("user_id, display_name, role")
          .eq("family_id", memberData.family_id);

        if (membersData) {
          setFamilyMembers(membersData);
        }

        // Fetch expenses for selected month
        const fromDate = new Date(currentYear, currentMonth - 1, 1).toISOString().slice(0, 10);
        const toDate = new Date(currentYear, currentMonth, 0).toISOString().slice(0, 10);

        const { data: expensesData } = await supabase
          .from("expenses")
          .select("*")
          .eq("family_id", memberData.family_id)
          .gte("expense_date", fromDate)
          .lte("expense_date", toDate);

        if (expensesData) {
          setExpenses(expensesData);
        }
      } catch (err) {
        console.error("Error loading expenses data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, router, currentYear, currentMonth]);

  const handleUpdateBudget = async () => {
    if (!familyId || isNaN(Number(tempBudget))) return;
    try {
      const budgetVal = Number(tempBudget);
      const { error } = await supabase
        .from("families")
        .update({ monthly_budget: budgetVal } as any)
        .eq("id", familyId);

      if (error) throw error;
      setMonthlyBudget(budgetVal);
      setIsEditingBudget(false);
    } catch (err) {
      console.error("Failed to update budget:", err);
      alert("Failed to update budget.");
    }
  };

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !paidBy || !familyId || !currentUser) return;

    setIsSubmitting(true);
    try {
      const { data: newExpense, error } = await supabase
        .from("expenses")
        .insert({
          family_id: familyId,
          amount: Number(amount),
          category: category as any,
          paid_by: paidBy,
          expense_date: expenseDate,
          description: description.trim() || null,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (error) throw error;

      setExpenses((prev) => [...prev, newExpense]);
      setAmount("");
      setCategory("");
      setPaidBy("");
      setDescription("");
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setShowLogModal(false);
    } catch (err) {
      console.error("Failed to save expense:", err);
      alert("Failed to log expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense log?")) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;
      setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));
    } catch (err) {
      console.error("Failed to delete expense:", err);
      alert("Failed to delete expense.");
    }
  };

  const navigateMonth = (direction: number) => {
    let nextMonth = currentMonth + direction;
    let nextYear = currentYear;

    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
  };

  // Calculations
  const totalSpend = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const N = familyMembers.length;
  const averageShare = N > 0 ? totalSpend / N : 0;

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

  const chartData = Object.entries(categoryTotals)
    .map(([cat, val]) => ({
      name: CATEGORY_MAP[cat]?.label || cat,
      value: val,
      fill: CATEGORY_MAP[cat]?.fill || "#64748b",
    }))
    .filter((d) => d.value > 0);

  // Spend trend per day (Group by Date)
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const dailySpendArray = Array.from({ length: daysInMonth }, (_, idx) => ({
    day: idx + 1,
    spend: 0,
  }));

  expenses.forEach((exp) => {
    const dateObj = new Date(exp.expense_date);
    const day = dateObj.getDate();
    if (day >= 1 && day <= daysInMonth) {
      dailySpendArray[day - 1].spend += Number(exp.amount);
    }
  });

  // Group split calculations
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

  const mutableCreditors = creditors.map((c) => ({ ...c }));
  const mutableDebtors = debtors.map((d) => ({ ...d }));
  mutableCreditors.sort((a, b) => b.amount - a.amount);
  mutableDebtors.sort((a, b) => b.amount - a.amount);

  const settlements: { from: string; to: string; amount: number }[] = [];
  let cIdx = 0, dIdx = 0;

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

  // Sorting & Filtering of table expenses
  const filteredExpenses = expenses
    .filter((exp) => {
      const matchSearch = (exp.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === "all" || exp.category === categoryFilter;
      const matchPaid = paidByFilter === "all" || exp.paid_by === paidByFilter;
      return matchSearch && matchCat && matchPaid;
    })
    .sort((a, b) => {
      let multiplier = sortDirection === "asc" ? 1 : -1;
      if (sortField === "amount") {
        return (Number(a.amount) - Number(b.amount)) * multiplier;
      } else {
        return (new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime()) * multiplier;
      }
    });

  const toggleSort = (field: "expense_date" | "amount") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const remainingBudget = monthlyBudget - totalSpend;
  const budgetUtilization = monthlyBudget > 0 ? (totalSpend / monthlyBudget) * 100 : 0;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Navigation */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Family <span className="text-primary italic">Expenses</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Log shared household purchases and split the balances fairly.
          </p>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center gap-2 rounded bg-surface-container border border-primary/10 p-1 shadow-sm h-fit">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1.5 hover:text-primary transition-colors text-on-surface-variant cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold uppercase tracking-widest px-3 min-w-[130px] text-center select-none text-on-surface">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </span>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1.5 hover:text-primary transition-colors text-on-surface-variant cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Budget Summary & Progress bar */}
      <div className="glass-card rounded p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-lg text-on-surface">Monthly Budget Plan</h3>
              <p className="text-xs text-on-surface-variant font-medium">Assigned budget for family expenses</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Show Budget with Edit Trigger for Admin */}
            {isEditingBudget ? (
              <div className="flex items-center gap-1.5">
                <Input
                  value={tempBudget}
                  onChange={(e) => setTempBudget(e.target.value)}
                  className="w-28 bg-surface-container-lowest text-sm h-8 rounded border-outline-variant font-bold focus:border-primary"
                  type="number"
                  placeholder="Budget"
                />
                <button
                  onClick={handleUpdateBudget}
                  className="h-8 w-8 rounded bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsEditingBudget(false)}
                  className="h-8 w-8 rounded bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-heading text-2xl font-black text-on-surface">
                  ₹{monthlyBudget.toLocaleString("en-IN")}
                </span>
                {memberRole === "admin" && (
                  <button
                    onClick={() => setIsEditingBudget(true)}
                    className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    title="Change Budget"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Budget bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
            <span>Utilization: ₹{totalSpend.toLocaleString("en-IN")} Spent</span>
            <span className={remainingBudget < 0 ? "text-primary" : "text-secondary"}>
              {remainingBudget < 0 
                ? `Overspent by ₹${Math.abs(remainingBudget).toLocaleString("en-IN")}`
                : `₹${remainingBudget.toLocaleString("en-IN")} Remaining`
              }
            </span>
          </div>
          <div className="h-3 w-full rounded bg-surface-container overflow-hidden border border-outline-variant/30">
            <div
              className={`h-full rounded transition-all duration-300 ${
                budgetUtilization > 100 ? "bg-primary" : "bg-secondary"
              }`}
              style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Visual Charts section */}
      {mounted && totalSpend > 0 && (
        <section className="grid gap-6 md:grid-cols-2">
          {/* Pie Chart: Spend categories */}
          <div className="glass-card rounded p-6 shadow-sm flex flex-col justify-between h-[300px]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" /> Expense categories
            </h4>
            <div className="flex-1 min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="55%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legend overlay inside card */}
              <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-center gap-1.5 max-h-full overflow-y-auto text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-wide">
                {chartData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.fill }} />
                    <span className="truncate max-w-[120px]">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar Chart: Daily spend trend */}
          <div className="glass-card rounded p-6 shadow-sm h-[300px]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">Daily Spend Trend</h4>
            <div className="w-full h-full pb-8">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={dailySpendArray}>
                  <XAxis dataKey="day" tick={{ fontSize: 9 }} stroke="#8f6f74" />
                  <YAxis tick={{ fontSize: 9 }} stroke="#8f6f74" />
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
                  <Bar dataKey="spend" fill="#b7004f" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* Split balances & settlements layout */}
      <section className="grid gap-6 md:grid-cols-3">
        <div className="glass-card rounded p-5 shadow-sm md:col-span-2 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-primary/10 pb-2">Family Ledger split balance</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {familyMembers.map((m) => {
              const spent = memberSpends[m.user_id] || 0;
              const balance = spent - averageShare;
              const isOwed = balance > 0;
              
              return (
                <div key={m.user_id} className="flex justify-between items-center rounded border border-outline-variant/60 bg-surface-container-low/20 p-3">
                  <div>
                    <span className="text-sm font-bold text-on-surface">{m.display_name}</span>
                    <span className="block text-[10px] text-on-surface-variant font-medium mt-0.5">Spent ₹{spent.toFixed(0)}</span>
                  </div>
                  {Math.abs(balance) < 0.01 ? (
                    <span className="text-xs font-bold text-on-surface-variant/60">Settled</span>
                  ) : (
                    <span className={`text-sm font-extrabold ${isOwed ? "text-secondary" : "text-primary"}`}>
                      {isOwed ? "+" : "-"}₹{Math.abs(balance).toFixed(0)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-primary/10 pb-2">Recommended Settlement path</h4>
          {settlements.length === 0 ? (
            <p className="text-xs text-on-surface-variant/50 text-center py-6 italic font-medium">All balances are completely settled!</p>
          ) : (
            <div className="space-y-2">
              {settlements.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs rounded bg-surface-container border border-primary/5 p-2.5">
                  <div className="font-bold text-on-surface">
                    <span>{s.from}</span>
                    <span className="text-on-surface-variant/60 font-normal px-1">pays</span>
                    <span>{s.to}</span>
                  </div>
                  <span className="font-extrabold text-primary">₹{s.amount.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Filter and Search controls */}
      <section className="glass-card rounded p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant/60" />
          <Input
            placeholder="Search description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-surface-container-lowest border-outline-variant text-xs h-9 rounded"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all flex-1 sm:flex-none h-9"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_MAP).map(([val, conf]) => (
              <option key={val} value={val}>{conf.label}</option>
            ))}
          </select>

          <select
            value={paidByFilter}
            onChange={(e) => setPaidByFilter(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all flex-1 sm:flex-none h-9"
          >
            <option value="all">All Payers</option>
            {familyMembers.map((m) => (
              <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Tabular Expense Log */}
      <div className="glass-card rounded shadow-sm overflow-hidden border border-primary/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low border-b border-primary/10 font-bold uppercase text-primary tracking-wider">
                <th 
                  onClick={() => toggleSort("expense_date")}
                  className="p-3.5 pl-4 cursor-pointer hover:bg-primary/5 transition-colors select-none items-center gap-1 inline-flex w-full"
                >
                  Date <ArrowUpDown className="h-3 w-3 text-primary/60" />
                </th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Paid By</th>
                <th 
                  onClick={() => toggleSort("amount")}
                  className="p-3.5 cursor-pointer hover:bg-primary/5 transition-colors select-none text-right"
                >
                  <span className="items-center gap-1 inline-flex">
                    Amount <ArrowUpDown className="h-3 w-3 text-primary/60" />
                  </span>
                </th>
                <th className="p-3.5 pr-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-on-surface-variant/40 font-semibold italic bg-surface-container-lowest">
                    No expense items match your sorting/filtering query.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const categoryConf = CATEGORY_MAP[expense.category] || CATEGORY_MAP.miscellaneous;
                  const payer = familyMembers.find((m) => m.user_id === expense.paid_by);
                  
                  return (
                    <tr 
                      key={expense.id} 
                      className="bg-surface-container-lowest hover:bg-primary/[0.02] transition-colors"
                    >
                      <td className="p-3.5 pl-4 font-mono font-bold text-on-surface">
                        {new Date(expense.expense_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-3.5 font-sans font-medium text-on-surface-variant">
                        {expense.description || <span className="italic opacity-40 font-normal">None</span>}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${categoryConf.color} bg-primary/5 border-primary/10`}>
                          {categoryConf.label}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans font-bold text-on-surface">
                        {payer?.display_name || "Unknown"}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-on-surface">
                        ₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 pr-4 text-center">
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-1 text-on-surface-variant/40 hover:text-primary transition-all rounded hover:bg-primary/10 cursor-pointer"
                          title="Delete Expense Log"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Button at the bottom to open Log Modal */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={() => setShowLogModal(true)}
          className="bg-primary hover:bg-primary-container text-white px-8 h-12 gap-2 text-sm font-bold shadow-lg shadow-primary/20 rounded cursor-pointer animate-neon-text active:scale-95 transition-all"
        >
          <Plus className="h-5 w-5" /> Log New Expense
        </Button>
      </div>

      {/* Semi-Translucent Dialog Form (Modal) */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-xs" 
            onClick={() => setShowLogModal(false)} 
          />

          {/* Modal Container */}
          <form 
            onSubmit={handleLogExpense} 
            className="relative z-10 w-full max-w-lg glass-card rounded p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-primary/10">
              <h3 className="font-heading text-lg font-bold text-primary flex items-center gap-2">
                <Wallet className="h-5 w-5" /> Log New Expense
              </h3>
              <button 
                type="button"
                onClick={() => setShowLogModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="logAmount" className="text-[10px] font-bold uppercase tracking-wider text-primary">Amount (INR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-on-surface-variant font-bold">₹</span>
                  <Input
                    id="logAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-7 bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="logCat" className="text-[10px] font-bold uppercase tracking-wider text-primary">Category</Label>
                <select
                  id="logCat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors font-semibold"
                  required
                >
                  <option value="">Select Category</option>
                  {Object.entries(CATEGORY_MAP).map(([val, conf]) => (
                    <option key={val} value={val}>{conf.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="logPaidBy" className="text-[10px] font-bold uppercase tracking-wider text-primary">Who Paid?</Label>
                <select
                  id="logPaidBy"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors font-semibold"
                  required
                >
                  <option value="">Select Payer</option>
                  {familyMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="logDate" className="text-[10px] font-bold uppercase tracking-wider text-primary">Expense Date</Label>
                <Input
                  id="logDate"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs font-semibold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="logDesc" className="text-[10px] font-bold uppercase tracking-wider text-primary">Description</Label>
              <Input
                id="logDesc"
                type="text"
                placeholder="e.g. Electric bill payment, milk and eggs"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLogModal(false)}
                className="h-9 text-xs font-bold border-outline-variant"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary-container text-white h-9 text-xs font-bold rounded cursor-pointer"
              >
                {isSubmitting ? "Saving..." : "Save Log"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
