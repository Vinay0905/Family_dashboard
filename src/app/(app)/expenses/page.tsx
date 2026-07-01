"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
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
  Wallet,
  TrendingUp,
  X,
  Edit2,
  Check,
  Search,
  ArrowUpDown,
  Pencil
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
  { label: string; color: string; badgeClass: string; icon: any; fill: string }
> = {
  grocery: {
    label: "Grocery",
    color: "text-tertiary",
    badgeClass: "bg-tertiary-fixed text-on-tertiary-fixed border-tertiary-fixed-dim/30",
    icon: ShoppingCart,
    fill: "var(--success)"
  },
  utilities: {
    label: "Utilities",
    color: "text-secondary",
    badgeClass: "bg-secondary-fixed text-on-secondary-fixed border-secondary-fixed-dim/30",
    icon: Lightbulb,
    fill: "var(--secondary)"
  },
  education: {
    label: "Education",
    color: "text-indigo-650 dark:text-indigo-400",
    badgeClass: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/30",
    icon: GraduationCap,
    fill: "var(--education)"
  },
  fuel: {
    label: "Fuel",
    color: "text-amber-700 dark:text-warning",
    badgeClass: "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-warning border border-amber-200/50 dark:border-amber-800/30",
    icon: Car,
    fill: "var(--fuel)"
  },
  entertainment: {
    label: "Entertainment",
    color: "text-pink-600 dark:text-pink-400",
    badgeClass: "bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 border border-pink-200/50 dark:border-pink-800/30",
    icon: Tv,
    fill: "var(--entertainment)"
  },
  medical: {
    label: "Medical",
    color: "text-error",
    badgeClass: "bg-error-container text-on-error-container border border-error/15",
    icon: HeartPulse,
    fill: "var(--error)"
  },
  travel: {
    label: "Travel",
    color: "text-primary",
    badgeClass: "bg-primary-fixed text-on-primary-fixed border-primary-fixed-dim/30",
    icon: Plane,
    fill: "var(--primary)"
  },
  miscellaneous: {
    label: "Miscellaneous",
    color: "text-on-surface-variant",
    badgeClass: "bg-surface-container text-on-surface-variant border-outline-variant/30",
    icon: DollarSign,
    fill: "var(--on-surface-variant)"
  },
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ExpensesPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <ExpensesPageContent />
    </Suspense>
  );
}

function ExpensesPageContent() {
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
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Modal Form state
  const [showLogModal, setShowLogModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const isEditing = !!editingId;
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const openCreateModal = () => {
    setEditingId(null);
    setAmount("");
    setCategory("");
    setPaidBy("");
    setDescription("");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setShowLogModal(true);
  };

  const openEditModal = (expense: any) => {
    setEditingId(expense.id);
    setAmount(String(expense.amount));
    setCategory(expense.category || "");
    setPaidBy(expense.paid_by || "");
    setExpenseDate(expense.expense_date);
    setDescription(expense.description || "");
    setShowLogModal(true);
  };

  const handleCloseModal = () => {
    setEditingId(null);
    setAmount("");
    setCategory("");
    setPaidBy("");
    setDescription("");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setShowLogModal(false);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const { familyId: cachedFamilyId, familyMembers: cachedMembers, currentUser: cachedUser, memberRole: cachedRole, isInitialized, setAppInfo } = useAppStore();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        let activeUser = cachedUser;
        let activeFamilyId = cachedFamilyId;
        let activeRole = cachedRole;
        let activeMembers = cachedMembers;

        if (!isInitialized) {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            router.push("/login");
            return;
          }
          activeUser = userData.user;
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
          activeFamilyId = memberData.family_id;
          activeRole = memberData.role;
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
            activeMembers = membersData;
            setFamilyMembers(membersData);
          }

          setAppInfo({
            familyId: activeFamilyId,
            familyMembers: activeMembers,
            currentUser: activeUser,
            memberRole: activeRole,
            familyName: familyData?.name ?? "Family"
          });
        } else {
          setCurrentUser(cachedUser);
          setFamilyId(cachedFamilyId);
          setMemberRole(cachedRole);
          setFamilyMembers(cachedMembers);

          const { data: familyData } = await supabase
            .from("families")
            .select("monthly_budget" as any)
            .eq("id", cachedFamilyId!)
            .maybeSingle() as any;

          if (familyData) {
            setMonthlyBudget(Number(familyData.monthly_budget) || 0);
            setTempBudget(String(familyData.monthly_budget || 0));
          }
        }

        if (!activeFamilyId) return;

        // Fetch expenses for selected month
        const fromDate = new Date(currentYear, currentMonth - 1, 1).toISOString().slice(0, 10);
        const toDate = new Date(currentYear, currentMonth, 0).toISOString().slice(0, 10);

        const { data: expensesData } = await supabase
          .from("expenses")
          .select("*")
          .eq("family_id", activeFamilyId)
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

    if (mounted) {
      loadData();
    }
  }, [supabase, router, currentMonth, currentYear, mounted, cachedFamilyId, cachedMembers, cachedUser, cachedRole, isInitialized, setAppInfo, refreshTrigger]);

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
      const payload = {
        amount: Number(amount),
        category: category as any,
        paid_by: paidBy,
        expense_date: expenseDate,
        description: description.trim() || null,
      };

      if (isEditing) {
        const { data: updatedExpense, error } = await supabase
          .from("expenses")
          .update(payload as any)
          .eq("id", editingId)
          .select()
          .single();

        if (error) throw error;

        setExpenses((prev) =>
          prev.map((exp) => (exp.id === editingId ? updatedExpense : exp))
        );
        alert("Expense updated successfully!");
        handleCloseModal();
        setRefreshTrigger((prev) => prev + 1);
      } else {
        const { data: newExpense, error } = await supabase
          .from("expenses")
          .insert({
            family_id: familyId,
            created_by: currentUser.id,
            ...payload
          } as any)
          .select()
          .single();

        if (error) throw error;

        setExpenses((prev) => [...prev, newExpense]);
        alert("Expense logged successfully!");
        handleCloseModal();
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Failed to save expense:", err);
      alert(isEditing ? "Failed to update expense." : "Failed to log expense.");
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
      fill: CATEGORY_MAP[cat]?.fill || "#717783",
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
      const multiplier = sortDirection === "asc" ? 1 : -1;
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ─── HEADER & MONTH SELECTOR ───────────────────────── */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4 select-none">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-on-background md:text-4xl">
            Expenses <span className="text-primary italic">Tracker</span>
          </h1>
          <p className="text-sm text-on-surface-variant/80 font-sans mt-1">
            Log shared household purchases and split the balances fairly.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Month Navigator */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-surface-container-low border border-outline-variant/30 p-1 shadow-sm h-11 shrink-0">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-primary active:scale-90 transition-all cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold uppercase tracking-widest px-4 min-w-[130px] text-center select-none text-on-surface font-sans">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-primary active:scale-90 transition-all cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Add Expense Desktop Button */}
          <button
            onClick={openCreateModal}
            className="hidden md:flex bg-secondary text-on-secondary px-6 h-11 rounded-2xl items-center justify-center gap-2 font-bold shadow-md hover:shadow-lg hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" /> Log New Expense
          </button>
        </div>
      </section>

      {/* ─── BUDGET PLANS AND SUMMARY STATS ───────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card: Month to Date Total */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col justify-between h-44 relative overflow-hidden group">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="absolute right-12 top-4 w-12 h-12 bg-primary/5 rounded-full border border-primary/10"></div>
          
          <div className="relative z-10">
            <p className="text-xs font-bold text-on-surface-variant/75 uppercase tracking-wider">Month-to-Date Spending</p>
            <h3 className="font-serif text-4xl md:text-5xl font-bold text-primary mt-2">
              ₹{totalSpend.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="relative z-10 flex items-center gap-2 text-tertiary">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {familyMembers.length > 0
                ? `Split share: ~₹${averageShare.toLocaleString("en-IN", { maximumFractionDigits: 0 })} per person`
                : "No family members listed"}
            </span>
          </div>
        </div>

        {/* Card: Budget Planning */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-6 flex flex-col justify-between h-44">
          <div className="flex justify-between items-start w-full">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Wallet className="h-4.5 w-4.5" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/80">Budget Plan</h4>
            </div>

            <div>
              {isEditingBudget ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={tempBudget}
                    onChange={(e) => setTempBudget(e.target.value)}
                    className="w-24 px-2 py-1 bg-surface-container-low text-xs border border-outline-variant/40 rounded-lg font-bold focus:outline-none focus:border-primary text-right"
                    type="number"
                    placeholder="0"
                    autoFocus
                  />
                  <button
                    onClick={handleUpdateBudget}
                    className="p-1 rounded bg-tertiary text-on-tertiary hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    title="Save Budget"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingBudget(false)}
                    className="p-1 rounded bg-surface-container-high text-on-surface-variant hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    title="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-lg font-bold text-on-surface">
                    ₹{monthlyBudget.toLocaleString("en-IN")}
                  </span>
                  {memberRole === "admin" && (
                    <button
                      onClick={() => {
                        setTempBudget(String(monthlyBudget));
                        setIsEditingBudget(true);
                      }}
                      className="p-1 text-on-surface-variant/50 hover:text-primary active:scale-95 transition-colors cursor-pointer"
                      title="Edit Budget Plan"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="w-full mt-auto">
            <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant/80 mb-1.5">
              <span>{budgetUtilization.toFixed(0)}% Used</span>
              <span className={remainingBudget < 0 ? "text-error font-extrabold" : "text-tertiary font-bold"}>
                {remainingBudget < 0
                  ? `Overspent ₹${Math.abs(remainingBudget).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                  : `₹${remainingBudget.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Left`
                }
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-surface-container overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetUtilization > 100 ? "bg-error" : budgetUtilization > 85 ? "bg-secondary" : "bg-primary"
                }`}
                style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── INTERACTIVE DATA VISUALIZATION ───────────────── */}
      {mounted && totalSpend > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Pie Chart Breakdown */}
          <div className="glass-card rounded-2xl p-6 flex flex-col justify-between h-[320px]">
            <h4 className="font-serif font-bold text-sm text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <TrendingUp className="h-4 w-4 text-primary" /> Category Distribution
            </h4>
            <div className="flex-grow min-h-0 relative flex items-center justify-between gap-4 mt-2">
              <div className="flex-grow h-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend overlay inside card */}
              <div className="flex flex-col justify-center gap-2.5 max-h-full overflow-y-auto w-32 shrink-0 select-none border-l border-outline-variant/15 pl-4">
                {chartData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider leading-none">
                    <span className="w-2.5 h-2.5 rounded shrink-0" style={{ backgroundColor: d.fill }} />
                    <span className="truncate" title={`${d.name}: ₹${d.value.toLocaleString("en-IN")}`}>{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card: Bar Chart Trend */}
          <div className="glass-card rounded-2xl p-6 flex flex-col justify-between h-[320px]">
            <h4 className="font-serif font-bold text-sm text-primary uppercase tracking-wider">
              Daily Spending Trend
            </h4>
            <div className="w-full h-full pb-4 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySpendArray}>
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#717783", fontWeight: "600" }} stroke="#c1c7d3" />
                  <YAxis tick={{ fontSize: 9, fill: "#717783", fontWeight: "600" }} stroke="#c1c7d3" tickFormatter={(value: number | string) => `₹${value}`} />
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
                  <Bar dataKey="spend" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* ─── BALANCES SPLIT AND SETTLEMENT WIDGETS ───────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ledger Balance Split */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-4">
          <h4 className="font-serif font-bold text-sm text-primary uppercase tracking-wider">
            Ledger Balance Split
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {familyMembers.map((m) => {
              const spent = memberSpends[m.user_id] || 0;
              const balance = spent - averageShare;
              const isOwed = balance > 0;
              const avatarLetter = (m.display_name || "?")[0].toUpperCase();

              return (
                <div key={m.user_id} className="flex justify-between items-center rounded-2xl border border-outline-variant/30 bg-surface-container-low/40 p-4 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-container/20 text-primary font-bold flex items-center justify-center text-xs">
                      {avatarLetter}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-on-surface">{m.display_name}</span>
                      <span className="block text-[10px] text-on-surface-variant font-medium mt-0.5">
                        Paid: ₹{spent.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                  {Math.abs(balance) < 0.01 ? (
                    <span className="text-xs font-bold text-on-surface-variant/60 bg-surface-container-high px-2.5 py-1 rounded-full select-none">
                      Settled
                    </span>
                  ) : (
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${isOwed ? "bg-tertiary/10 text-tertiary" : "bg-error/10 text-error"}`}>
                      {isOwed ? "+" : "-"}₹{Math.abs(balance).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommended Settlements */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-6 space-y-4">
          <h4 className="font-serif font-bold text-sm text-primary uppercase tracking-wider">
            Settlement Pathways
          </h4>
          {settlements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center h-4/5">
              <Check className="h-8 w-8 text-tertiary mb-2 bg-tertiary/10 p-1.5 rounded-full" />
              <p className="text-xs text-on-surface-variant/70 italic font-medium">All balances are completely settled!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1 custom-scrollbar">
              {settlements.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs rounded-xl bg-surface-container-low border border-outline-variant/20 p-3 hover:shadow-xs transition-all">
                  <div className="font-bold text-on-surface flex flex-wrap items-center gap-1">
                    <span className="text-on-surface font-semibold">{s.from}</span>
                    <span className="text-on-surface-variant/50 font-normal text-[9px] uppercase tracking-wider px-0.5">pays</span>
                    <span className="text-on-surface font-semibold">{s.to}</span>
                  </div>
                  <span className="font-extrabold text-secondary">₹{s.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── FILTERS & TRANSACTION TABLE ─────────────────── */}
      <section className="space-y-4">
        {/* Filters Panel */}
        <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between select-none">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-on-surface-variant/50" />
            <input
              placeholder="Search descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all flex-1 md:flex-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_MAP).map(([val, conf]) => (
                <option key={val} value={val}>{conf.label}</option>
              ))}
            </select>

            <select
              value={paidByFilter}
              onChange={(e) => setPaidByFilter(e.target.value)}
              className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface font-bold outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all flex-1 md:flex-none cursor-pointer"
            >
              <option value="all">All Payers</option>
              {familyMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Expenses List & Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low/60 border-b border-outline-variant/30 font-bold uppercase text-primary tracking-wider text-[10px] select-none">
                  <th
                    onClick={() => toggleSort("expense_date")}
                    className="p-4 pl-6 cursor-pointer hover:bg-primary/5 transition-colors select-none w-44"
                  >
                    <span className="flex items-center gap-1">
                      Date <ArrowUpDown className="h-3 w-3 text-primary/60" />
                    </span>
                  </th>
                  <th className="p-4">Description</th>
                  <th className="p-4 w-36">Category</th>
                  <th className="p-4 w-36">Paid By</th>
                  <th
                    onClick={() => toggleSort("amount")}
                    className="p-4 cursor-pointer hover:bg-primary/5 transition-colors select-none text-right w-40"
                  >
                    <span className="flex items-center justify-end gap-1">
                      Amount <ArrowUpDown className="h-3 w-3 text-primary/60" />
                    </span>
                  </th>
                  <th className="p-4 pr-6 text-center w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-on-surface-variant/40 font-semibold italic">
                      No expense items match your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => {
                    const categoryConf = CATEGORY_MAP[expense.category] || CATEGORY_MAP.miscellaneous;
                    const payer = familyMembers.find((m) => m.user_id === expense.paid_by);
                    const avatarLetter = (payer?.display_name || "?")[0].toUpperCase();

                    return (
                      <tr
                        key={expense.id}
                        className="hover:bg-primary/[0.01] transition-colors"
                      >
                        <td className="p-4 pl-6 font-mono font-bold text-on-surface-variant">
                          {new Date(expense.expense_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4 font-sans font-medium text-on-surface">
                          {expense.description || <span className="italic opacity-30 font-normal">None</span>}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${categoryConf.badgeClass}`}>
                            {categoryConf.label}
                          </span>
                        </td>
                        <td className="p-4 font-sans font-semibold text-on-surface">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-secondary-fixed text-[10px] flex items-center justify-center font-bold text-on-secondary-fixed border border-secondary-fixed-dim/20">
                              {avatarLetter}
                            </div>
                            <span>{payer?.display_name || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-on-surface text-sm">
                          ₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 pr-6 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditModal(expense)}
                              className="p-1.5 text-on-surface-variant/40 hover:text-primary hover:bg-primary-container/20 rounded-xl transition-all cursor-pointer"
                              title="Edit Transaction"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-1.5 text-on-surface-variant/40 hover:text-error hover:bg-error-container/20 rounded-xl transition-all cursor-pointer"
                              title="Delete Transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards List View */}
          <div className="md:hidden divide-y divide-outline-variant/20">
            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant/40 font-semibold italic">
                No expense items match your criteria.
              </div>
            ) : (
              filteredExpenses.map((expense) => {
                const categoryConf = CATEGORY_MAP[expense.category] || CATEGORY_MAP.miscellaneous;
                const payer = familyMembers.find((m) => m.user_id === expense.paid_by);
                const avatarLetter = (payer?.display_name || "?")[0].toUpperCase();

                return (
                  <div key={expense.id} className="p-4 flex flex-col gap-3 hover:bg-primary/[0.01] transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-semibold text-on-surface text-sm">
                          {expense.description || <span className="italic opacity-30 font-normal">None</span>}
                        </h5>
                        <span className="text-[10px] text-on-surface-variant font-mono block mt-1">
                          {new Date(expense.expense_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-on-surface text-sm block">
                          ₹{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${categoryConf.badgeClass}`}>
                          {categoryConf.label}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-on-surface-variant font-medium">
                          <div className="w-5 h-5 rounded-full bg-secondary-fixed text-[9px] flex items-center justify-center font-bold text-on-secondary-fixed border border-secondary-fixed-dim/20">
                            {avatarLetter}
                          </div>
                          <span>{payer?.display_name || "Unknown"}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(expense)}
                          className="p-1.5 text-on-surface-variant/40 hover:text-primary hover:bg-primary-container/20 rounded-xl transition-all cursor-pointer"
                          title="Edit Transaction"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-1.5 text-on-surface-variant/40 hover:text-error hover:bg-error-container/20 rounded-xl transition-all cursor-pointer"
                          title="Delete Transaction"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ─── MOBILE FLOATING ACTION BUTTON ────────────────── */}
      <button
        onClick={openCreateModal}
        className="md:hidden fixed right-6 bottom-20 w-14 h-14 bg-secondary text-on-secondary rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all z-30"
        title="Log New Expense"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* ─── ADD EXPENSE MODAL ─────────────────────────────── */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={handleCloseModal}
          />

          {/* Modal Container */}
          <form
            onSubmit={handleLogExpense}
            className="relative z-10 w-full max-w-md bg-surface border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 p-5">
              <h3 className="font-serif text-lg font-bold flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                {isEditing ? "Edit Shared Purchase" : "Log Shared Purchase"}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/75 hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-5 space-y-4">
              {/* Description */}
              <div className="space-y-1">
                <label htmlFor="logDesc" className="text-xs font-semibold text-on-surface-variant">Description</label>
                <input
                  id="logDesc"
                  type="text"
                  placeholder="e.g. Weekly Grocery Run"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none text-on-surface transition-colors"
                />
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="logAmount" className="text-xs font-semibold text-on-surface-variant">Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-on-surface-variant/65 font-bold">₹</span>
                    <input
                      id="logAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none font-bold text-on-surface transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="logDate" className="text-xs font-semibold text-on-surface-variant">Date</label>
                  <input
                    id="logDate"
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none text-on-surface transition-colors font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label htmlFor="logCat" className="text-xs font-semibold text-on-surface-variant">Category</label>
                <select
                  id="logCat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none text-on-surface font-semibold transition-colors cursor-pointer"
                  required
                >
                  <option value="">Select Category</option>
                  {Object.entries(CATEGORY_MAP).map(([val, conf]) => (
                    <option key={val} value={val}>{conf.label}</option>
                  ))}
                </select>
              </div>

              {/* Paid By */}
              <div className="space-y-1">
                <label htmlFor="logPaidBy" className="text-xs font-semibold text-on-surface-variant">Who Paid?</label>
                <select
                  id="logPaidBy"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm outline-none text-on-surface font-semibold transition-colors cursor-pointer"
                  required
                >
                  <option value="">Select Payer</option>
                  {familyMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-surface-container text-on-surface-variant font-bold py-2.5 rounded-xl hover:bg-surface-container-high transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary text-on-primary font-bold py-2.5 rounded-xl hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-55 cursor-pointer"
                >
                  {isSubmitting 
                    ? (isEditing ? "Saving Changes..." : "Saving Transaction...") 
                    : (isEditing ? "Save Changes" : "Save Transaction")}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
