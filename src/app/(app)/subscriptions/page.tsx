"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Film,
  Music,
  Zap,
  Cloud,
  GraduationCap,
  Shield,
  CreditCard,
  Activity,
  ShoppingBag,
  Tv,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Search,
  ArrowUpDown,
  Calendar,
  Sparkles,
  Lightbulb,
  ArrowRight,
  TrendingDown,
  Info
} from "lucide-react";

const PLAN_TYPES = ["Weekly", "Monthly", "Quarterly", "Yearly", "One-time"];
const PAYMENT_METHODS = ["Credit Card", "Debit Card", "UPI/Auto-pay", "Cash", "Net Banking"];
const CATEGORIES = ["Entertainment", "Utilities", "Cloud/Software", "Education", "Insurance", "Other"];

interface DonutSegment {
  category: string;
  cost: number;
  percent: number;
  color: string;
}

const getCategoryStyles = (name: string, category: string) => {
  const n = (name || "").toLowerCase();
  const cat = (category || "").toLowerCase();

  if (n.includes("netflix")) {
    return {
      bgColor: "bg-[#E50914]/10 dark:bg-[#ff333a]/15",
      textColor: "text-[#E50914] dark:text-[#ff333a]",
      icon: Film
    };
  }
  if (n.includes("spotify")) {
    return {
      bgColor: "bg-[#1DB954]/10 dark:bg-[#1DB954]/5",
      textColor: "text-[#1aa34a] dark:text-[#1DB954]",
      icon: Music
    };
  }
  if (n.includes("amazon") || n.includes("prime")) {
    return {
      bgColor: "bg-[#FF9900]/10 dark:bg-[#FF9900]/5",
      textColor: "text-[#c2410c] dark:text-[#FF9900]",
      icon: ShoppingBag
    };
  }
  if (n.includes("disney") || n.includes("hotstar")) {
    return {
      bgColor: "bg-[#0060ac]/10 dark:bg-[#38bdf8]/10",
      textColor: "text-[#0060ac] dark:text-[#38bdf8]",
      icon: Tv
    };
  }
  if (n.includes("gym") || n.includes("fitness") || n.includes("fit life")) {
    return {
      bgColor: "bg-secondary/15 dark:bg-secondary/20",
      textColor: "text-secondary-foreground dark:text-secondary",
      icon: Activity
    };
  }

  // Fallbacks by category
  if (cat.includes("entertainment")) {
    return {
      bgColor: "bg-rose-100/60 dark:bg-rose-950/20",
      textColor: "text-rose-700 dark:text-rose-450",
      icon: Film
    };
  }
  if (cat.includes("utility")) {
    return {
      bgColor: "bg-emerald-100/60 dark:bg-emerald-950/20",
      textColor: "text-emerald-700 dark:text-emerald-450",
      icon: Zap
    };
  }
  if (cat.includes("cloud") || cat.includes("software")) {
    return {
      bgColor: "bg-blue-100/60 dark:bg-blue-950/20",
      textColor: "text-blue-700 dark:text-blue-400",
      icon: Cloud
    };
  }
  if (cat.includes("education")) {
    return {
      bgColor: "bg-violet-100/60 dark:bg-violet-950/20",
      textColor: "text-violet-700 dark:text-violet-400",
      icon: GraduationCap
    };
  }
  if (cat.includes("insurance")) {
    return {
      bgColor: "bg-amber-100/60 dark:bg-amber-950/20",
      textColor: "text-amber-800 dark:text-amber-450",
      icon: Shield
    };
  }
  return {
    bgColor: "bg-slate-100/60 dark:bg-slate-900/60",
    textColor: "text-slate-700 dark:text-slate-400",
    icon: CreditCard
  };
};

const donutColors: Record<string, string> = {
  "Entertainment": "#a53b29", // secondary / terracotta
  "Utilities": "#2a6747",     // tertiary / sage green
  "Cloud/Software": "#005da7", // primary / blue
  "Education": "#8b5cf6",     // violet
  "Insurance": "#f59e0b",     // amber
  "Other": "#64748b"          // slate
};

export default function NewSubscriptionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<"renewal_date" | "cost">("renewal_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Modal Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Entertainment");
  const [planType, setPlanType] = useState("Monthly");
  const [cost, setCost] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Credit Card");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success"
  });

  const triggerToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const { familyId: cachedFamilyId, currentUser: cachedUser, isInitialized, setAppInfo } = useAppStore();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        let activeUser = cachedUser;
        let activeFamilyId = cachedFamilyId;

        if (!isInitialized) {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            router.push("/login");
            return;
          }
          activeUser = userData.user;
          setCurrentUser(userData.user);

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
          setFamilyId(memberData.family_id);

          const { data: membersData } = await supabase
            .from("family_members")
            .select("user_id, display_name, role")
            .eq("family_id", memberData.family_id);

          const { data: family } = await supabase
            .from("families")
            .select("name")
            .eq("id", memberData.family_id)
            .maybeSingle();

          setAppInfo({
            familyId: memberData.family_id,
            familyMembers: membersData ?? [],
            currentUser: userData.user,
            memberRole: memberData.role,
            familyName: family?.name ?? "Family"
          });
        } else {
          setCurrentUser(cachedUser);
          setFamilyId(cachedFamilyId);
        }

        if (!activeFamilyId) return;

        // Fetch subscriptions
        const { data: subsData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("family_id", activeFamilyId);

        if (subsData) {
          setSubscriptions(subsData);
        }
      } catch (err) {
        console.error("Error loading subscriptions:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, router, cachedFamilyId, cachedUser, isInitialized, setAppInfo]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cost || !renewalDate || !familyId || !currentUser) return;

    setIsSubmitting(true);
    try {
      // Map planType to billing_cycle enum ('monthly', 'quarterly', 'yearly') to satisfy db constraints
      let billingCycle: "monthly" | "quarterly" | "yearly" = "monthly";
      const planLower = planType.toLowerCase();
      if (planLower === "yearly") billingCycle = "yearly";
      else if (planLower === "quarterly") billingCycle = "quarterly";

      const subData = {
        name: name.trim(),
        cost: Number(cost),
        billing_cycle: billingCycle,
        plan_type: planType,
        renewal_date: renewalDate,
        payment_method: paymentMethod,
        category,
        notes: notes.trim() || null
      };

      if (editingSub) {
        // Update existing subscription
        const { data: updatedSub, error } = await supabase
          .from("subscriptions")
          .update(subData as any)
          .eq("id", editingSub.id)
          .select()
          .single();

        if (error) throw error;

        setSubscriptions((prev) =>
          prev.map((s) => (s.id === editingSub.id ? updatedSub : s))
        );
        triggerToast("Subscription updated successfully!", "success");
      } else {
        // Create new subscription
        const { data: newSub, error } = await supabase
          .from("subscriptions")
          .insert({
            family_id: familyId,
            created_by: currentUser.id,
            is_active: true,
            ...subData
          } as any)
          .select()
          .single();

        if (error) throw error;

        setSubscriptions((prev) => [...prev, newSub]);
        triggerToast("Subscription tracked successfully!", "success");
      }

      setShowCreateModal(false);
      setEditingSub(null);
    } catch (err) {
      console.error("Failed to save subscription:", err);
      triggerToast("Failed to save subscription.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setEditingSub(null);
    setName("");
    setCategory("Entertainment");
    setPlanType("Monthly");
    setCost("");
    setRenewalDate("");
    setPaymentMethod("Credit Card");
    setNotes("");
    setShowCreateModal(true);
  };

  const openEditModal = (sub: any) => {
    setEditingSub(sub);
    setName(sub.name);
    setCategory(sub.category || "Entertainment");
    setPlanType(sub.plan_type || "Monthly");
    setCost(String(sub.cost));
    setRenewalDate(sub.renewal_date);
    setPaymentMethod(sub.payment_method || "Credit Card");
    setNotes(sub.notes || "");
    setShowCreateModal(true);
  };

  const handleDeleteSub = async (subId: string) => {
    if (!confirm("Are you sure you want to delete this subscription?")) return;

    try {
      const { error } = await supabase.from("subscriptions").delete().eq("id", subId);
      if (error) throw error;
      setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
      triggerToast("Subscription deleted successfully!", "success");
    } catch (err) {
      console.error("Failed to delete subscription:", err);
      triggerToast("Failed to delete subscription.", "error");
    }
  };

  const toggleSubActive = async (subId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ is_active: !currentStatus })
        .eq("id", subId);

      if (error) throw error;

      setSubscriptions((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, is_active: !currentStatus } : s))
      );

      triggerToast(
        `Subscription ${!currentStatus ? "activated" : "paused"} successfully!`,
        "success"
      );
    } catch (err) {
      console.error("Failed to toggle subscription status:", err);
      triggerToast("Failed to update status.", "error");
    }
  };

  // Helper to advance renewal date and log as expense
  const handleLogPayment = async (sub: any) => {
    if (!currentUser || !familyId) return;

    try {
      // 1. Log payment in expenses table
      let expCat = "entertainment";
      const subCatLower = (sub.category || "").toLowerCase();
      if (subCatLower.includes("utility")) expCat = "utilities";
      else if (subCatLower.includes("education")) expCat = "education";
      else if (subCatLower.includes("cloud") || subCatLower.includes("software")) expCat = "miscellaneous";
      else if (subCatLower.includes("insurance")) expCat = "miscellaneous";

      const { error: expError } = await supabase.from("expenses").insert({
        family_id: familyId,
        created_by: currentUser.id,
        amount: Number(sub.cost),
        category: expCat as any,
        paid_by: currentUser.id,
        expense_date: new Date().toISOString().slice(0, 10),
        description: `Auto-logged payment: ${sub.name}`
      });

      if (expError) throw expError;

      // 2. Compute next renewal date
      const d = new Date(sub.renewal_date);
      const planLower = (sub.plan_type || "monthly").toLowerCase();
      if (planLower === "weekly") {
        d.setDate(d.getDate() + 7);
      } else if (planLower === "monthly") {
        d.setMonth(d.getMonth() + 1);
      } else if (planLower === "quarterly") {
        d.setMonth(d.getMonth() + 3);
      } else if (planLower === "yearly") {
        d.setFullYear(d.getFullYear() + 1);
      }
      const nextRenewal = d.toISOString().slice(0, 10);

      // 3. Update subscription record in DB
      const { error: subError } = await supabase
        .from("subscriptions")
        .update({ renewal_date: nextRenewal })
        .eq("id", sub.id);

      if (subError) throw subError;

      // Update state
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, renewal_date: nextRenewal } : s))
      );

      triggerToast(`Logged ₹${sub.cost} payment! Next renewal is ${nextRenewal}`, "success");
    } catch (err) {
      console.error("Failed to log subscription payment:", err);
      triggerToast("Failed to log payment.", "error");
    }
  };

  const toggleSort = (field: "renewal_date" | "cost") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Status mapping: Red (due/overdue), Yellow (within 7 days), Green (active/future)
  const getSubStatus = (renewalDateStr: string) => {
    const today = new Date().toISOString().slice(0, 10);
    if (renewalDateStr <= today) {
      return {
        label: "Due / Overdue",
        color: "bg-error/10 text-error border-error/20",
        dotColor: "bg-error",
        code: "red"
      };
    }
    const todayTime = new Date(today).getTime();
    const renewalTime = new Date(renewalDateStr).getTime();
    const diffDays = (renewalTime - todayTime) / (1000 * 60 * 60 * 24);

    if (diffDays <= 7) {
      return {
        label: "Renewing Soon",
        color: "bg-warning/10 text-warning border-warning/20",
        dotColor: "bg-warning",
        code: "yellow"
      };
    }
    return {
      label: "Active / Safe",
      color: "bg-success/10 text-success border-success/20",
      dotColor: "bg-success",
      code: "green"
    };
  };

  // Calculations: Total outflows equivalent monthly (only count active ones)
  const totalMonthlyOutflow = subscriptions.reduce((sum, s) => {
    if (!s.is_active) return sum;
    const cost = Number(s.cost) || 0;
    const plan = (s.plan_type || "monthly").toLowerCase();
    if (plan === "weekly") return sum + (cost * 4.33);
    if (plan === "monthly") return sum + cost;
    if (plan === "quarterly") return sum + (cost / 3);
    if (plan === "yearly") return sum + (cost / 12);
    return sum; // one-time doesn't add to monthly outflow
  }, 0);

  // Filter & Sort
  const filteredSubs = subscriptions
    .filter((sub) => {
      const matchSearch =
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.notes || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat = categoryFilter === "all" || sub.category === categoryFilter;
      const matchPlan = planFilter === "all" || sub.plan_type === planFilter;

      const statusInfo = getSubStatus(sub.renewal_date);
      const matchStatus = statusFilter === "all" || statusInfo.code === statusFilter;

      return matchSearch && matchCat && matchPlan && matchStatus;
    })
    .sort((a, b) => {
      let multiplier = sortDirection === "asc" ? 1 : -1;
      if (sortField === "cost") {
        return (Number(a.cost) - Number(b.cost)) * multiplier;
      } else {
        return (new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime()) * multiplier;
      }
    });

  // Dynamic Insight: Upcoming Renewals in Next 7 Days
  const getUpcomingRenewals = () => {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysLaterStr = sevenDaysLater.toISOString().slice(0, 10);

    return subscriptions
      .filter((sub) => {
        return sub.is_active && sub.renewal_date >= today && sub.renewal_date <= sevenDaysLaterStr;
      })
      .sort((a, b) => new Date(a.renewal_date).getTime() - new Date(b.renewal_date).getTime());
  };

  const upcomingRenewalsList = getUpcomingRenewals();

  // Dynamic Insight: Saving Opportunities
  const getSavingOpportunity = () => {
    const activeSubs = subscriptions.filter(s => s.is_active);
    const entertainmentCount = activeSubs.filter(s => (s.category || "").toLowerCase() === "entertainment").length;
    if (entertainmentCount >= 3) {
      return {
        title: "Potential Overlap",
        desc: `You have ${entertainmentCount} active entertainment streaming services. Switching to a family bundle or pausing unused accounts can save you up to ₹750/month.`,
        actionText: "Check bundles"
      };
    }
    const expensiveSub = activeSubs.find(s => Number(s.cost) >= 2000 && (s.plan_type || "").toLowerCase() === "monthly");
    if (expensiveSub) {
      return {
        title: "Billing Cycle Optimization",
        desc: `Switching ${expensiveSub.name} (₹${expensiveSub.cost}/mo) to a yearly plan could save you up to 20% (approx ₹4,800/yr).`,
        actionText: "Optimize plan"
      };
    }
    return {
      title: "Subscriptions Optimized",
      desc: "Great job! All active subscriptions look consolidated. Consider reviewing memberships periodically to prune unused accounts.",
      actionText: "View general tips"
    };
  };

  const savingOpportunity = getSavingOpportunity();

  // Categories cost breakdown for Donut Chart
  const categoryCosts: Record<string, number> = subscriptions.reduce((acc: Record<string, number>, sub: any) => {
    if (!sub.is_active) return acc;
    const costValue = Number(sub.cost) || 0;
    const plan = (sub.plan_type || "monthly").toLowerCase();
    let monthlyCost = 0;
    if (plan === "weekly") monthlyCost = costValue * 4.33;
    else if (plan === "monthly") monthlyCost = costValue;
    else if (plan === "quarterly") monthlyCost = costValue / 3;
    else if (plan === "yearly") monthlyCost = costValue / 12;

    const cat = sub.category || "Other";
    acc[cat] = (acc[cat] || 0) + monthlyCost;
    return acc;
  }, {} as Record<string, number>);

  const totalOutflowActive: number = Object.values(categoryCosts).reduce((a: number, b: number) => a + b, 0);

  const segments: DonutSegment[] = Object.entries(categoryCosts).map(([cat, costVal]) => {
    const percent = totalOutflowActive > 0 ? (costVal / totalOutflowActive) * 100 : 0;
    return {
      category: cat,
      cost: costVal,
      percent,
      color: donutColors[cat] || donutColors["Other"]
    };
  }).filter(s => s.percent > 0);

  let accumulatedPercent = 0;
  const strokeSegments = segments.map((seg) => {
    const strokeDasharray = `${(seg.percent * 251.2) / 100} 251.2`;
    const strokeDashoffset = `${-((accumulatedPercent * 251.2) / 100)}`;
    accumulatedPercent += seg.percent;
    return { ...seg, strokeDasharray, strokeDashoffset };
  });

  // Calculate Next 6 Months Projections
  const getNext6MonthsOutflow = () => {
    const months: { date: Date; label: string; cost: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        date: d,
        label: d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase(),
        cost: 0
      });
    }

    subscriptions.forEach((sub: any) => {
      if (!sub.is_active) return;
      const costValue = Number(sub.cost) || 0;
      const plan = (sub.plan_type || "monthly").toLowerCase();
      const renewal = new Date(sub.renewal_date);

      months.forEach((m) => {
        const mYear = m.date.getFullYear();
        const mMonth = m.date.getMonth();

        if (plan === "weekly") {
          m.cost += costValue * 4.33;
        } else if (plan === "monthly") {
          m.cost += costValue;
        } else if (plan === "quarterly") {
          const diffMonths = (mYear - renewal.getFullYear()) * 12 + (mMonth - renewal.getMonth());
          if (diffMonths >= 0 && diffMonths % 3 === 0) {
            m.cost += costValue;
          } else if (diffMonths < 0) {
            const absDiff = Math.abs(diffMonths);
            if (absDiff % 3 === 0) {
              m.cost += costValue;
            }
          }
        } else if (plan === "yearly") {
          if (mMonth === renewal.getMonth()) {
            m.cost += costValue;
          }
        } else if (plan === "one-time") {
          if (mYear === renewal.getFullYear() && mMonth === renewal.getMonth()) {
            m.cost += costValue;
          }
        }
      });
    });

    return months;
  };

  const projectionMonths = getNext6MonthsOutflow();
  const maxMonthCost = Math.max(...projectionMonths.map(m => m.cost), 100);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-on-surface-variant font-medium">Loading subscription details…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* ─── HEADER PANEL ────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h2 className="font-serif text-3xl font-extrabold text-on-surface tracking-tight">
            Family Subscriptions
          </h2>
          <p className="text-sm text-on-surface-variant font-medium mt-1">
            Keep track of your recurring family services and digital memberships.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-secondary text-on-secondary px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-secondary/90 transition-all active:scale-95 shadow-sm w-fit"
        >
          <Plus className="h-4 w-4" />
          Add Subscription
        </button>
      </section>

      {/* ─── INSIGHTS BENTO GRID ──────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Outflow Card */}
        <div className="bg-primary-container text-on-primary-container p-6 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden h-[180px]">
          <div className="relative z-10 space-y-1">
            <span className="block text-[10px] uppercase font-bold text-primary-fixed-dim/90 tracking-wider">
              Monthly Outflow
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-serif text-4xl font-extrabold">
                ₹{totalMonthlyOutflow.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
              <span className="text-sm font-semibold opacity-85">/mo</span>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-1.5 text-xs text-primary-fixed-dim font-bold">
            <TrendingDown className="h-4 w-4" />
            <span>Based on active services only</span>
          </div>
          {/* Decorative background logo */}
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <CreditCard className="h-32 w-32" />
          </div>
        </div>

        {/* Saving Opportunity Card */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between h-[180px]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-tertiary-container/10 flex items-center justify-center text-tertiary">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-serif text-xs font-bold text-on-surface">Saving Opportunity</h4>
                <p className="text-[10px] text-on-surface-variant/60 font-semibold">{savingOpportunity.title}</p>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant font-medium leading-relaxed line-clamp-3">
              {savingOpportunity.desc}
            </p>
          </div>
          <button className="text-tertiary font-bold text-xs flex items-center gap-1 hover:underline self-start mt-1">
            {savingOpportunity.actionText} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Upcoming Renewals Card */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between h-[180px]">
          <div className="space-y-2 flex-grow overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-secondary-container/10 flex items-center justify-center text-secondary">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-serif text-xs font-bold text-on-surface">Upcoming Renewals</h4>
                <p className="text-[10px] text-on-surface-variant/60 font-semibold">Next 7 Days</p>
              </div>
            </div>

            <div className="space-y-1.5 mt-2 overflow-y-auto max-h-[75px] pr-1 custom-scrollbar">
              {upcomingRenewalsList.length === 0 ? (
                <div className="flex items-center gap-1.5 py-1 text-xs text-on-surface-variant/50 italic font-medium">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span>No active plans renewing this week</span>
                </div>
              ) : (
                upcomingRenewalsList.map((sub) => (
                  <div key={sub.id} className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant font-medium truncate max-w-[130px]" title={sub.name}>
                      {sub.name}
                    </span>
                    <span className="font-bold text-on-surface shrink-0">
                      ₹{Number(sub.cost).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </section>

      {/* ─── ACTIVE SERVICES CONTROLS ────────────────────────── */}
      <section className="glass-card rounded-2xl p-4 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <h3 className="font-serif text-lg font-bold text-on-surface shrink-0 self-start lg:self-center">
          Active Services
        </h3>

        <div className="w-full flex flex-col sm:flex-row gap-2.5 items-center justify-end">
          {/* Search box */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant/50" />
            <Input
              placeholder="Search subscriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-container-low/40 border-outline-variant/40 text-xs h-9 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-outline-variant/40 bg-surface-container-low/40 px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="rounded-xl border border-outline-variant/40 bg-surface-container-low/40 px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9 cursor-pointer"
            >
              <option value="all">All Plan Types</option>
              {PLAN_TYPES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-outline-variant/40 bg-surface-container-low/40 px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="red">Due / Overdue</option>
              <option value="yellow">Renewing Soon</option>
              <option value="green">Active / Safe</option>
            </select>
          </div>

          {/* Sorting controls */}
          <div className="flex gap-1.5 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
            <button
              onClick={() => toggleSort("cost")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 h-9 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                sortField === "cost"
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface-container-low/60 hover:bg-surface-container border-outline-variant/20 text-on-surface-variant"
              }`}
            >
              <span>Cost</span>
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => toggleSort("renewal_date")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 h-9 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer ${
                sortField === "renewal_date"
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface-container-low/60 hover:bg-surface-container border-outline-variant/20 text-on-surface-variant"
              }`}
            >
              <span>Date</span>
              <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── SUBSCRIPTIONS CARDS GRID ────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {filteredSubs.length === 0 ? (
          <div className="col-span-full bg-surface-container-lowest border border-dashed border-outline-variant/40 rounded-2xl p-12 text-center text-on-surface-variant/40 font-semibold italic">
            No subscriptions match your sorting/filtering criteria.
          </div>
        ) : (
          filteredSubs.map((sub) => {
            const statusInfo = getSubStatus(sub.renewal_date);
            const style = getCategoryStyles(sub.name, sub.category);
            const Icon = style.icon;

            return (
              <div
                key={sub.id}
                className={`glass-card p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] ${
                  sub.is_active ? "" : "opacity-65 grayscale-[0.2]"
                } ${statusInfo.code === "red" ? "neon-glow-active border border-error/30" : ""}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 ${style.bgColor} ${style.textColor} rounded-xl flex items-center justify-center`}>
                        <Icon className="h-5 w-5 stroke-[2]" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-serif text-on-surface text-base pr-1 truncate font-bold" title={sub.name}>
                          {sub.name}
                        </h4>
                        <p className="text-[10px] text-on-surface-variant/75 font-semibold truncate max-w-[130px]">
                          {sub.notes || sub.category || "Entertainment"}
                        </p>
                      </div>
                    </div>

                    {/* Active/Inactive Switch Toggle */}
                    <button
                      onClick={() => toggleSubActive(sub.id, sub.is_active)}
                      className="flex items-center cursor-pointer outline-none relative"
                      title={sub.is_active ? "Pause Subscription" : "Re-activate Subscription"}
                    >
                      <div className={`w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 ${
                        sub.is_active ? "bg-tertiary" : "bg-outline-variant/50"
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                          sub.is_active ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </div>
                    </button>
                  </div>

                  <div className="space-y-2 py-2 border-t border-outline-variant/10 mt-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant font-medium">Cost</span>
                      <span className="font-bold text-on-surface font-mono">
                        ₹{Number(sub.cost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        <span className="text-[10px] font-sans font-semibold text-on-surface-variant/80 ml-0.5">
                          {sub.plan_type.toLowerCase() === "weekly" ? "/wk" : sub.plan_type.toLowerCase() === "monthly" ? "/mo" : sub.plan_type.toLowerCase() === "quarterly" ? "/qtr" : sub.plan_type.toLowerCase() === "yearly" ? "/yr" : " once"}
                        </span>
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant font-medium">Next Renewal</span>
                      <span className="font-bold text-on-surface font-mono flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary opacity-60" />
                        {new Date(sub.renewal_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant font-medium">Payment Mode</span>
                      <span className="font-semibold text-on-surface-variant">
                        {sub.payment_method || "Credit Card"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-on-surface-variant font-medium">Status</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${statusInfo.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotColor}`} />
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-outline-variant/15 flex gap-2">
                  {/* Paid / Log Payment Button */}
                  <button
                    onClick={() => handleLogPayment(sub)}
                    disabled={!sub.is_active}
                    className={`flex-1 py-1.5 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 border active:scale-95 ${
                      sub.is_active
                        ? "bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border-primary/20 hover:border-transparent cursor-pointer"
                        : "bg-surface-container text-on-surface-variant/40 border-outline-variant/10 cursor-not-allowed"
                    }`}
                    title="Log Renewal Payment"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Paid
                  </button>

                  {/* Manage / Edit Button */}
                  <button
                    onClick={() => openEditModal(sub)}
                    className="py-1.5 px-3 font-bold text-xs rounded-xl border border-outline-variant/30 text-on-surface-variant bg-surface-container-low/30 hover:bg-surface-container-low hover:text-on-surface transition-all active:scale-95 cursor-pointer"
                    title="Edit Subscription Details"
                  >
                    Manage
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteSub(sub.id)}
                    className="p-1.5 text-on-surface-variant/40 hover:text-error hover:bg-error-container/30 transition-all rounded-xl cursor-pointer"
                    title="Delete Subscription"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Dashed "Track New Service" Button Card */}
        <button
          onClick={openCreateModal}
          className="border-2 border-dashed border-outline-variant/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-on-surface-variant hover:bg-surface-container-low/40 transition-all duration-200 group cursor-pointer h-full min-h-[220px]"
        >
          <div className="w-12 h-12 rounded-full bg-surface-container group-hover:scale-110 transition-all duration-200 flex items-center justify-center text-on-surface-variant/80">
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </div>
          <span className="font-serif font-bold text-sm">Track New Service</span>
          <span className="text-xs text-on-surface-variant/60 font-semibold">Add a recurring expense card</span>
        </button>

      </section>

      {/* ─── CHARTS & PROJECTIONS SECTION ────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* Spending by Category (Donut Chart) */}
        <div className="glass-card p-6 rounded-2xl">
          <h4 className="font-serif text-lg font-bold text-on-surface mb-6">Spending by Category</h4>
          
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* SVG donut chart */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="10" />
                {strokeSegments.map((seg, idx) => (
                  <circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="10"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="transition-all duration-500"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                <span className="text-[8px] uppercase font-extrabold text-on-surface-variant/50 tracking-wider">Active Total</span>
                <span className="text-xs font-serif font-black text-on-surface truncate max-w-full">
                  ₹{Math.round(totalOutflowActive).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            
            <div className="flex-1 w-full space-y-2">
              {segments.length === 0 ? (
                <p className="text-xs text-on-surface-variant/50 italic font-medium">No active subscriptions to display.</p>
              ) : (
                segments.map((seg, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-on-surface-variant truncate max-w-[120px]">{seg.category}</span>
                    </div>
                    <div className="font-mono text-on-surface flex items-center gap-2">
                      <span className="font-bold">₹{Math.round(seg.cost).toLocaleString("en-IN")}/mo</span>
                      <span className="text-[10px] text-on-surface-variant/65 bg-surface-container px-1.5 py-0.5 rounded-md shrink-0">
                        {Math.round(seg.percent)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Annual Projections (Bar Chart) */}
        <div className="glass-card p-6 rounded-2xl">
          <h4 className="font-serif text-lg font-bold text-on-surface mb-2">Annual Projection</h4>
          <p className="text-xs text-on-surface-variant font-medium mb-6">Visual monthly outflows projection for the next 6 months.</p>

          <div className="flex flex-col h-[180px] justify-between">
            <div className="flex items-end gap-3 h-24 mb-3">
              {projectionMonths.map((m, idx) => {
                const heightPercent = `${Math.max((m.cost / maxMonthCost) * 100, 8)}%`;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-inverse-surface text-inverse-on-surface text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-md z-10 whitespace-nowrap">
                      ₹{Math.round(m.cost).toLocaleString("en-IN")}
                    </div>
                    {/* Bar */}
                    <div 
                      className="w-full bg-primary-container rounded-t-lg group-hover:bg-primary transition-all duration-300 relative cursor-pointer"
                      style={{ height: heightPercent }}
                    >
                      {idx === 0 && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                          Now
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-between text-[10px] text-on-surface-variant/60 font-bold uppercase px-1">
              {projectionMonths.map((m, idx) => (
                <span key={idx} className="flex-1 text-center">{m.label}</span>
              ))}
            </div>
            
            <p className="mt-4 text-xs text-on-surface-variant font-medium italic text-center">
              Projected annual spend:{" "}
              <span className="font-heading font-black text-sm text-on-surface not-italic">
                ₹{(totalOutflowActive * 12).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
            </p>
          </div>
        </div>

      </section>

      {/* ─── ADD/EDIT SUBSCRIPTION MODAL ────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs" 
            onClick={() => { setShowCreateModal(false); setEditingSub(null); }} 
          />

          <form 
            onSubmit={handleFormSubmit} 
            className="relative z-10 w-full max-w-lg glass-card rounded-2xl p-6 shadow-2xl border border-outline-variant/20 space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <h3 className="font-serif text-lg font-bold text-primary flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {editingSub ? "Edit Subscription" : "Track Subscription"}
              </h3>
              <button 
                type="button"
                onClick={() => { setShowCreateModal(false); setEditingSub(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/60 hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="subName" className="text-[10px] font-bold uppercase tracking-wider text-primary">Service Name</Label>
                <Input
                  id="subName"
                  type="text"
                  placeholder="e.g. Netflix, Spotify Premium"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-surface-container-lowest border-outline-variant/40 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 text-xs h-10 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subCategory" className="text-[10px] font-bold uppercase tracking-wider text-primary">Category</Label>
                <select
                  id="subCategory"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold outline-none h-10 cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="subCost" className="text-[10px] font-bold uppercase tracking-wider text-primary">Cost (INR)</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-on-surface-variant/65 font-bold">₹</span>
                  <Input
                    id="subCost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="pl-7.5 bg-surface-container-lowest border-outline-variant/40 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 text-xs font-bold h-10 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subPlan" className="text-[10px] font-bold uppercase tracking-wider text-primary">Plan Type</Label>
                <select
                  id="subPlan"
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold outline-none h-10 cursor-pointer"
                >
                  {PLAN_TYPES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="subRenewal" className="text-[10px] font-bold uppercase tracking-wider text-primary">Next Renewal Date</Label>
                <Input
                  id="subRenewal"
                  type="date"
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  className="bg-surface-container-lowest border-outline-variant/40 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 text-xs h-10 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subPayment" className="text-[10px] font-bold uppercase tracking-wider text-primary">Payment Method</Label>
                <select
                  id="subPayment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold outline-none h-10 cursor-pointer"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>{pm}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subNotes" className="text-[10px] font-bold uppercase tracking-wider text-primary">Notes (Optional)</Label>
              <Input
                id="subNotes"
                type="text"
                placeholder="Linked account details, card used..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-surface-container-lowest border-outline-variant/40 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 text-xs h-10 outline-none"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-primary hover:bg-primary-container text-white py-3 rounded-xl active:scale-95 transition-all shadow-md font-sans text-xs font-bold uppercase tracking-widest cursor-pointer h-11"
            >
              {isSubmitting
                ? "Saving..."
                : editingSub
                ? "Save Changes"
                : "Track Subscription"}
            </Button>
          </form>
        </div>
      )}

      {/* ─── TOAST NOTIFICATION ──────────────────────────────── */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 border ${
            toast.type === "success" 
              ? "bg-tertiary-container text-on-tertiary-container border-tertiary/20" 
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <p className="text-xs font-bold leading-none">{toast.message}</p>
          </div>
        </div>
      )}

    </div>
  );
}
