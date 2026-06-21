"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Search,
  ArrowUpDown,
  Filter,
  DollarSign
} from "lucide-react";

const PLAN_TYPES = ["Weekly", "Monthly", "Quarterly", "Yearly", "One-time"];
const PAYMENT_METHODS = ["Credit Card", "Debit Card", "UPI/Auto-pay", "Cash", "Net Banking"];
const CATEGORIES = ["Entertainment", "Utilities", "Cloud/Software", "Education", "Insurance", "Other"];

export default function SubscriptionsPage() {
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
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc"); // Default earliest first

  // Modal Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Entertainment");
  const [planType, setPlanType] = useState("Monthly");
  const [cost, setCost] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Credit Card");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

        // Get family ID
        const { data: memberData } = await supabase
          .from("family_members")
          .select("family_id")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (!memberData) {
          router.push("/onboarding");
          return;
        }
        setFamilyId(memberData.family_id);

        // Fetch subscriptions
        const { data: subsData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("family_id", memberData.family_id);

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
  }, [supabase, router]);

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cost || !renewalDate || !familyId || !currentUser) return;

    setIsSubmitting(true);
    try {
      // Map planType to billing_cycle enum ('monthly', 'quarterly', 'yearly') to satisfy db constraints
      let billingCycle: "monthly" | "quarterly" | "yearly" = "monthly";
      const planLower = planType.toLowerCase();
      if (planLower === "yearly") billingCycle = "yearly";
      else if (planLower === "quarterly") billingCycle = "quarterly";

      const { data: newSub, error } = await supabase
        .from("subscriptions")
        .insert({
          family_id: familyId,
          created_by: currentUser.id,
          name: name.trim(),
          cost: Number(cost),
          billing_cycle: billingCycle,
          plan_type: planType,
          renewal_date: renewalDate,
          payment_method: paymentMethod,
          category,
          is_active: true,
          notes: notes.trim() || null
        } as any)
        .select()
        .single();

      if (error) throw error;

      setSubscriptions((prev) => [...prev, newSub]);
      setName("");
      setCategory("Entertainment");
      setPlanType("Monthly");
      setCost("");
      setRenewalDate("");
      setPaymentMethod("Credit Card");
      setNotes("");
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create subscription:", err);
      alert("Failed to create subscription.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSub = async (subId: string) => {
    if (!confirm("Are you sure you want to delete this subscription?")) return;

    try {
      const { error } = await supabase.from("subscriptions").delete().eq("id", subId);
      if (error) throw error;
      setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
    } catch (err) {
      console.error("Failed to delete subscription:", err);
      alert("Failed to delete subscription.");
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

      alert(`Payment of ₹${sub.cost} logged successfully! Next renewal set to ${nextRenewal}`);
    } catch (err) {
      console.error("Failed to log subscription payment:", err);
      alert("Failed to log payment.");
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
        color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        dotColor: "bg-rose-500",
        code: "red"
      };
    }
    const todayTime = new Date(today).getTime();
    const renewalTime = new Date(renewalDateStr).getTime();
    const diffDays = (renewalTime - todayTime) / (1000 * 60 * 60 * 24);

    if (diffDays <= 7) {
      return {
        label: "Renewing Soon",
        color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        dotColor: "bg-amber-500",
        code: "yellow"
      };
    }
    return {
      label: "Active / Safe",
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      dotColor: "bg-emerald-500",
      code: "green"
    };
  };

  // Calculations: Total outflows equivalent monthly
  const totalMonthlyOutflow = subscriptions.reduce((sum, s) => {
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

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Family <span className="text-primary italic">Subscriptions</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Track streaming services, bills, and recurring memberships dynamically.
          </p>
        </div>

        {/* Total Cost Outflow Badge */}
        <div className="rounded bg-primary/10 border border-primary/20 px-5 py-3 text-primary font-semibold text-sm flex items-center gap-3 shadow-sm h-fit shrink-0">
          <CreditCard className="h-5 w-5 text-primary shrink-0" />
          <div>
            <span className="block text-[9px] uppercase font-bold text-primary/75 tracking-wider">Outflow Equivalent</span>
            <span className="text-base font-heading font-black">₹{totalMonthlyOutflow.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / month</span>
          </div>
        </div>
      </section>

      {/* Filters and Controls */}
      <section className="glass-card rounded p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant/60" />
          <Input
            placeholder="Search subscriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-surface-container-lowest border-outline-variant text-xs h-9 rounded"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9"
          >
            <option value="all">All Plan Types</option>
            {PLAN_TYPES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9"
          >
            <option value="all">All Statuses</option>
            <option value="red">Due / Overdue (Red)</option>
            <option value="yellow">Renewing Soon (Yellow)</option>
            <option value="green">Active / Safe (Green)</option>
          </select>
        </div>
      </section>

      {/* Tabular Subscriptions Grid */}
      <div className="glass-card rounded shadow-sm overflow-hidden border border-primary/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low border-b border-primary/10 font-bold uppercase text-primary tracking-wider">
                <th className="p-3.5 pl-4">Service Name</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Plan Type</th>
                <th 
                  onClick={() => toggleSort("cost")}
                  className="p-3.5 cursor-pointer hover:bg-primary/5 transition-colors select-none text-right"
                >
                  <span className="items-center gap-1 inline-flex">
                    Cost <ArrowUpDown className="h-3 w-3 text-primary/60" />
                  </span>
                </th>
                <th 
                  onClick={() => toggleSort("renewal_date")}
                  className="p-3.5 cursor-pointer hover:bg-primary/5 transition-colors select-none"
                >
                  <span className="items-center gap-1 inline-flex">
                    Renewal Date <ArrowUpDown className="h-3 w-3 text-primary/60" />
                  </span>
                </th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Notes</th>
                <th className="p-3.5 pr-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-on-surface-variant/40 font-semibold italic bg-surface-container-lowest">
                    No subscriptions match your sorting/filtering criteria.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => {
                  const statusInfo = getSubStatus(sub.renewal_date);

                  return (
                    <tr 
                      key={sub.id} 
                      className="bg-surface-container-lowest hover:bg-primary/[0.02] transition-colors"
                    >
                      <td className="p-3.5 pl-4 font-heading font-extrabold text-on-surface text-sm">
                        {sub.name}
                      </td>
                      <td className="p-3.5 font-sans font-medium text-on-surface-variant">
                        {sub.category || "Entertainment"}
                      </td>
                      <td className="p-3.5 font-sans font-bold text-primary">
                        {sub.plan_type || "Monthly"}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-on-surface">
                        ₹{Number(sub.cost).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-on-surface">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-primary" />
                          {new Date(sub.renewal_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans font-semibold text-on-surface-variant">
                        {sub.payment_method || "Credit Card"}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest ${statusInfo.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotColor}`} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans text-on-surface-variant max-w-xs truncate" title={sub.notes}>
                        {sub.notes || <span className="italic opacity-40 font-normal">None</span>}
                      </td>
                      <td className="p-3.5 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleLogPayment(sub)}
                            className="flex items-center gap-1 py-1 px-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-transparent text-[9px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                            title="Log Renewal Payment"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" /> Paid
                          </button>
                          <button
                            onClick={() => handleDeleteSub(sub.id)}
                            className="p-1.5 text-on-surface-variant/40 hover:text-primary transition-all rounded hover:bg-primary/10 cursor-pointer"
                            title="Delete Subscription"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
      </div>

      {/* Button to open Modal */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary-container text-white px-8 h-12 gap-2 text-sm font-bold shadow-lg shadow-primary/20 rounded cursor-pointer animate-neon-text active:scale-95 transition-all"
        >
          <Plus className="h-5 w-5" /> Track Subscription
        </Button>
      </div>

      {/* Add Subscription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-xs" 
            onClick={() => setShowCreateModal(false)} 
          />

          <form 
            onSubmit={handleCreateSub} 
            className="relative z-10 w-full max-w-lg glass-card rounded p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-primary/10">
              <h3 className="font-heading text-lg font-bold text-primary flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Track Subscription
              </h3>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="subName" className="text-[10px] font-bold uppercase tracking-wider text-primary">Service Name</Label>
                <Input
                  id="subName"
                  type="text"
                  placeholder="e.g. Netflix, Spotify Premium"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="subCategory" className="text-[10px] font-bold uppercase tracking-wider text-primary">Category</Label>
                <select
                  id="subCategory"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors font-semibold"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="subCost" className="text-[10px] font-bold uppercase tracking-wider text-primary">Cost (INR)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-on-surface-variant font-bold">₹</span>
                  <Input
                    id="subCost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="pl-7 bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="subPlan" className="text-[10px] font-bold uppercase tracking-wider text-primary">Plan Type</Label>
                <select
                  id="subPlan"
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value)}
                  className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors font-semibold"
                >
                  {PLAN_TYPES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="subRenewal" className="text-[10px] font-bold uppercase tracking-wider text-primary">Next Renewal Date</Label>
                <Input
                  id="subRenewal"
                  type="date"
                  value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="subPayment" className="text-[10px] font-bold uppercase tracking-wider text-primary">Payment Method</Label>
                <select
                  id="subPayment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors font-semibold"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>{pm}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="subNotes" className="text-[10px] font-bold uppercase tracking-wider text-primary">Notes (Optional)</Label>
              <Input
                id="subNotes"
                type="text"
                placeholder="Linked account details, card used..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-primary hover:bg-primary-container text-white py-3 rounded active:scale-95 transition-all shadow-md font-sans text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              {isSubmitting ? "Tracking Subscription..." : "Track Subscription"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
