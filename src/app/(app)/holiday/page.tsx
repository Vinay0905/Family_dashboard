"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plane,
  Calendar,
  Plus,
  Trash2,
  Luggage,
  Wallet,
  X,
  Search,
  ArrowUpDown,
  DollarSign,
  CheckCircle2
} from "lucide-react";

export default function HolidayPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<"start_date" | "budget">("start_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc"); // Default earliest first

  // Modal Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetEstimate, setBudgetEstimate] = useState("");
  const [notes, setNotes] = useState("");
  const [packingList, setPackingList] = useState("");
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

        // Fetch holiday plans
        const { data: plansData } = await supabase
          .from("holiday_plans")
          .select("*")
          .eq("family_id", memberData.family_id);

        if (plansData) {
          setPlans(plansData);
        }
      } catch (err) {
        console.error("Error loading plans:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, router]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !startDate || !endDate || !familyId || !currentUser) return;

    setIsSubmitting(true);
    try {
      const packingArray = packingList
        ? packingList.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      const { data: newPlan, error } = await supabase
        .from("holiday_plans")
        .insert({
          family_id: familyId,
          created_by: currentUser.id,
          destination: destination.trim(),
          start_date: startDate,
          end_date: endDate,
          budget_estimate: budgetEstimate ? Number(budgetEstimate) : null,
          notes: notes.trim() || null,
          packing_list: packingArray
        })
        .select()
        .single();

      if (error) throw error;

      setPlans((prev) => [...prev, newPlan]);
      setDestination("");
      setStartDate("");
      setEndDate("");
      setBudgetEstimate("");
      setNotes("");
      setPackingList("");
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create plan:", err);
      alert("Failed to create plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this trip plan?")) return;

    try {
      const { error } = await supabase.from("holiday_plans").delete().eq("id", planId);
      if (error) throw error;
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch (err) {
      console.error("Failed to delete plan:", err);
      alert("Failed to delete plan.");
    }
  };

  const handleLogExpense = async (plan: any) => {
    if (!currentUser || !familyId) return;

    try {
      const { error } = await supabase.from("expenses").insert({
        family_id: familyId,
        created_by: currentUser.id,
        amount: Number(plan.budget_estimate),
        category: "travel",
        paid_by: currentUser.id,
        expense_date: new Date().toISOString().slice(0, 10),
        description: `Trip Budget: ${plan.destination}`
      });

      if (error) throw error;
      alert(`Trip budget of ₹${plan.budget_estimate} successfully logged as travel expense!`);
    } catch (err) {
      console.error("Failed to log holiday expense:", err);
      alert("Failed to log holiday expense.");
    }
  };

  const toggleSort = (field: "start_date" | "budget") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Rule 15: Green for completed (past end date), Yellow for in progress (today is within trip dates), Grey for upcoming (future)
  const getPlanStatusInfo = (plan: any) => {
    const today = new Date().toISOString().slice(0, 10);
    if (today > plan.end_date) {
      return {
        label: "Completed",
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        dotColor: "bg-emerald-500",
        code: "green"
      };
    }
    if (today >= plan.start_date && today <= plan.end_date) {
      return {
        label: "In Progress",
        color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        dotColor: "bg-amber-500",
        code: "yellow"
      };
    }
    return {
      label: "Upcoming",
      color: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      dotColor: "bg-slate-400",
      code: "grey"
    };
  };

  // Filter & Sort
  const filteredPlans = plans
    .filter((plan) => {
      const matchSearch =
        plan.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (plan.notes || "").toLowerCase().includes(searchQuery.toLowerCase());

      const statusInfo = getPlanStatusInfo(plan);
      const matchStatus = statusFilter === "all" || statusInfo.code === statusFilter;

      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let multiplier = sortDirection === "asc" ? 1 : -1;
      if (sortField === "budget") {
        return (Number(a.budget_estimate || 0) - Number(b.budget_estimate || 0)) * multiplier;
      } else {
        return (new Date(a.start_date).getTime() - new Date(b.start_date).getTime()) * multiplier;
      }
    });

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Holiday <span className="text-primary italic">Planner</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Plan destinations, track travel budgets, and assemble checklists for family getaways.
          </p>
        </div>
      </section>

      {/* Filter and Search Controls */}
      <section className="glass-card rounded p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant/60" />
          <Input
            placeholder="Search destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-surface-container-lowest border-outline-variant text-xs h-9 rounded"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9"
          >
            <option value="all">All Statuses</option>
            <option value="green">Completed (Green)</option>
            <option value="yellow">In Progress (Yellow)</option>
            <option value="grey">Upcoming (Grey)</option>
          </select>
        </div>
      </section>

      {/* Tabular Plans Grid */}
      <div className="glass-card rounded shadow-sm overflow-hidden border border-primary/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low border-b border-primary/10 font-bold uppercase text-primary tracking-wider">
                <th className="p-3.5 pl-4">Destination</th>
                <th 
                  onClick={() => toggleSort("start_date")}
                  className="p-3.5 cursor-pointer hover:bg-primary/5 transition-colors select-none"
                >
                  <span className="items-center gap-1 inline-flex">
                    Travel Dates <ArrowUpDown className="h-3 w-3 text-primary/60" />
                  </span>
                </th>
                <th 
                  onClick={() => toggleSort("budget")}
                  className="p-3.5 cursor-pointer hover:bg-primary/5 transition-colors select-none text-right"
                >
                  <span className="items-center gap-1 inline-flex">
                    Budget Estimate <ArrowUpDown className="h-3 w-3 text-primary/60" />
                  </span>
                </th>
                <th className="p-3.5">Packing Items</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Notes</th>
                <th className="p-3.5 pr-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-on-surface-variant/40 font-semibold italic bg-surface-container-lowest">
                    No travel plans registered or match filters.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => {
                  const statusInfo = getPlanStatusInfo(plan);
                  const packingItems = (Array.isArray(plan.packing_list) ? plan.packing_list : []) as string[];

                  return (
                    <tr 
                      key={plan.id} 
                      className="bg-surface-container-lowest hover:bg-primary/[0.02] transition-colors"
                    >
                      <td className="p-3.5 pl-4 font-heading font-extrabold text-on-surface text-sm">
                        {plan.destination}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-on-surface">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-primary" />
                          {new Date(plan.start_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short"
                          })}
                          {" - "}
                          {new Date(plan.end_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-on-surface">
                        {plan.budget_estimate ? (
                          `₹${Number(plan.budget_estimate).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                        ) : (
                          <span className="italic opacity-40 font-normal">N/A</span>
                        )}
                      </td>
                      <td className="p-3.5 font-sans">
                        {packingItems.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {packingItems.map((item, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded border border-secondary/20 bg-secondary/10 px-1.5 py-0.5 text-[8px] font-bold text-secondary uppercase"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="italic opacity-40">Empty</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest ${statusInfo.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotColor}`} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans text-on-surface-variant max-w-xs truncate" title={plan.notes}>
                        {plan.notes || <span className="italic opacity-40 font-normal">None</span>}
                      </td>
                      <td className="p-3.5 pr-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {plan.budget_estimate && (
                            <button
                              onClick={() => handleLogExpense(plan)}
                              className="flex items-center gap-1 py-1 px-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-transparent text-[9px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                              title="Log Budget as Expense"
                            >
                              <CheckCircle2 className="h-2.5 w-2.5" /> Log Exp
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePlan(plan.id)}
                            className="p-1.5 text-on-surface-variant/40 hover:text-primary transition-all rounded hover:bg-primary/10 cursor-pointer"
                            title="Remove Plan"
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

      {/* Button to open creation modal */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary-container text-white px-8 h-12 gap-2 text-sm font-bold shadow-lg shadow-primary/20 rounded cursor-pointer animate-neon-text active:scale-95 transition-all"
        >
          <Plus className="h-5 w-5" /> Plan New Trip
        </Button>
      </div>

      {/* Plan New Trip Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-xs" 
            onClick={() => setShowCreateModal(false)} 
          />

          <form 
            onSubmit={handleCreatePlan} 
            className="relative z-10 w-full max-w-lg glass-card rounded p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-primary/10">
              <h3 className="font-heading text-lg font-bold text-primary flex items-center gap-2">
                <Plane className="h-5 w-5" /> Plan New Trip
              </h3>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <Label htmlFor="destination" className="text-[10px] font-bold uppercase tracking-wider text-primary">Destination</Label>
              <Input
                id="destination"
                type="text"
                placeholder="e.g. Goa, Paris, Manali, Shimla"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="startDate" className="text-[10px] font-bold uppercase tracking-wider text-primary">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="endDate" className="text-[10px] font-bold uppercase tracking-wider text-primary">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="budget" className="text-[10px] font-bold uppercase tracking-wider text-primary">Budget Estimate (INR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-on-surface-variant font-bold">₹</span>
                <Input
                  id="budget"
                  type="number"
                  placeholder="0.00"
                  value={budgetEstimate}
                  onChange={(e) => setBudgetEstimate(e.target.value)}
                  className="pl-7 bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-[10px] font-bold uppercase tracking-wider text-primary">Itinerary / Notes (Optional)</Label>
              <Input
                id="notes"
                type="text"
                placeholder="e.g. Flight booking codes, hotel name..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="packing" className="text-[10px] font-bold uppercase tracking-wider text-primary">Packing Checklist (Optional)</Label>
              <Input
                id="packing"
                type="text"
                placeholder="Swimwear, Chargers, Passport, Warm clothes (comma separated)"
                value={packingList}
                onChange={(e) => setPackingList(e.target.value)}
                className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-primary hover:bg-primary-container text-white py-3 rounded active:scale-95 transition-all shadow-md font-sans text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              {isSubmitting ? "Saving Plan..." : "Save Plan"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
