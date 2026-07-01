/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
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
  CheckCircle2,
  Edit,
  Map,
  Clock,
  CloudSun,
  Copy,
  FileText,
  Pencil
} from "lucide-react";

interface PackingItem {
  name: string;
  packed: boolean;
  category: string;
}

interface HolidayPlan {
  id: string;
  family_id: string;
  created_by: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget_estimate: number | null;
  notes: string | null;
  packing_list: PackingItem[] | string[] | any;
  created_at?: string;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Morning Adventure", emoji: "🌅" };
  if (hour < 18) return { text: "Afternoon Sunshine", emoji: "☀️" };
  return { text: "Evening Starlight", emoji: "🌙" };
}

function getDestinationInfo(destination: string) {
  const dest = destination.toLowerCase();
  if (dest.includes("santorini") || dest.includes("greece")) {
    return {
      weather: "28°C Sunny",
      timezone: "UTC +3",
      image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80",
    };
  }
  if (dest.includes("hawaii") || dest.includes("honolulu") || dest.includes("maui")) {
    return {
      weather: "26°C Tropical",
      timezone: "UTC -10",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    };
  }
  if (dest.includes("paris") || dest.includes("france")) {
    return {
      weather: "19°C Mild",
      timezone: "UTC +1",
      image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
    };
  }
  if (dest.includes("goa") || dest.includes("india")) {
    return {
      weather: "31°C Humid",
      timezone: "UTC +5:30",
      image: "https://images.unsplash.com/photo-1506477331477-33d5d8b3dc85?auto=format&fit=crop&w=800&q=80",
    };
  }
  if (dest.includes("tokyo") || dest.includes("japan") || dest.includes("kyoto")) {
    return {
      weather: "22°C Clear",
      timezone: "UTC +9",
      image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80",
    };
  }
  if (dest.includes("london") || dest.includes("uk") || dest.includes("england")) {
    return {
      weather: "17°C Drizzle",
      timezone: "UTC +0",
      image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80",
    };
  }
  if (dest.includes("rome") || dest.includes("italy") || dest.includes("venice") || dest.includes("florence")) {
    return {
      weather: "25°C Warm",
      timezone: "UTC +1",
      image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80",
    };
  }
  // Default fallback
  return {
    weather: "24°C Perfect",
    timezone: "UTC +1",
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
  };
}

const normalizePackingList = (list: any): PackingItem[] => {
  return (Array.isArray(list) ? list : []).map((item: any) => {
    if (typeof item === "string") {
      let category = "Clothing";
      const name = item.toLowerCase();
      if (name.includes("passport") || name.includes("ticket") || name.includes("visa") || name.includes("doc") || name.includes("insur")) {
        category = "Essentials";
      } else if (name.includes("charger") || name.includes("camera") || name.includes("phone") || name.includes("adapter") || name.includes("bank") || name.includes("tech")) {
        category = "Gear & Tech";
      }
      return { name: item, packed: false, category };
    }
    return {
      name: item?.name || "",
      packed: !!item?.packed,
      category: item?.category || "Clothing"
    };
  });
};

export default function NewHolidayPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<HolidayPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<"start_date" | "budget">("start_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetEstimate, setBudgetEstimate] = useState("");
  const [notes, setNotes] = useState("");
  const [packingList, setPackingList] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Live updates states
  const [budgetValue, setBudgetValue] = useState<number>(0);
  const [notesValue, setNotesValue] = useState("");
  const [notesStatus, setNotesStatus] = useState("Saved");

  // Add packing item state
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Clothing");

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

        // Fetch holiday plans
        const { data: plansData } = await supabase
          .from("holiday_plans")
          .select("*")
          .eq("family_id", activeFamilyId);

        if (plansData) {
          setPlans(plansData);
          if (plansData.length > 0) {
            setActivePlanId(plansData[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading plans:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, router, cachedFamilyId, cachedUser, isInitialized, setAppInfo]);

  // Find active plan
  const activePlan = plans.find(p => p.id === activePlanId) || null;

  // Sync details inputs when active plan changes
  useEffect(() => {
    if (activePlan) {
      setBudgetValue(activePlan.budget_estimate || 0);
      setNotesValue(activePlan.notes || "");
      setNotesStatus("Saved");
    }
  }, [activePlan]);

  const handleEditClick = (plan: HolidayPlan) => {
    setDestination(plan.destination);
    setStartDate(plan.start_date);
    setEndDate(plan.end_date);
    setBudgetEstimate(plan.budget_estimate ? String(plan.budget_estimate) : "");
    setNotes(plan.notes || "");
    setPackingList("");
    setEditingId(plan.id);
    setIsModalOpen(true);
  };

  const clearForm = () => {
    setDestination("");
    setStartDate("");
    setEndDate("");
    setBudgetEstimate("");
    setNotes("");
    setPackingList("");
    setEditingId(null);
  };

  const handleCloseModal = () => {
    clearForm();
    setIsModalOpen(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !startDate || !endDate || !familyId || !currentUser) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        const { data: updatedPlan, error } = await supabase
          .from("holiday_plans")
          .update({
            destination: destination.trim(),
            start_date: startDate,
            end_date: endDate,
            budget_estimate: budgetEstimate ? Number(budgetEstimate) : null,
            notes: notes.trim() || null
          })
          .eq("id", editingId)
          .select()
          .single();

        if (error) throw error;

        setPlans((prev) => prev.map((p) => (p.id === editingId ? updatedPlan : p)));
        alert("Trip plan updated successfully!");
        handleCloseModal();
      } else {
        const packingArray = packingList
          ? packingList.split(",").map((s) => s.trim()).filter(Boolean).map(item => {
              let category = "Clothing";
              const name = item.toLowerCase();
              if (name.includes("passport") || name.includes("ticket") || name.includes("visa") || name.includes("doc") || name.includes("insur")) {
                category = "Essentials";
              } else if (name.includes("charger") || name.includes("camera") || name.includes("phone") || name.includes("adapter") || name.includes("bank") || name.includes("tech")) {
                category = "Gear & Tech";
              }
              return { name: item, packed: false, category };
            })
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
        setActivePlanId(newPlan.id);
        alert("New trip plan created successfully!");
        handleCloseModal();
      }
    } catch (err) {
      console.error("Failed to save plan:", err);
      alert("Failed to save plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this trip plan?")) return;

    try {
      const { error } = await supabase.from("holiday_plans").delete().eq("id", planId);
      if (error) throw error;
      
      const updatedPlans = plans.filter((p) => p.id !== planId);
      setPlans(updatedPlans);
      if (updatedPlans.length > 0) {
        setActivePlanId(updatedPlans[0].id);
      } else {
        setActivePlanId(null);
      }
    } catch (err) {
      console.error("Failed to delete plan:", err);
      alert("Failed to delete plan.");
    }
  };

  const handleLogExpense = async (plan: HolidayPlan) => {
    if (!currentUser || !familyId || !plan.budget_estimate) return;

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
      alert(`Trip budget of ₹${Number(plan.budget_estimate).toLocaleString("en-IN")} successfully logged as travel expense!`);
    } catch (err) {
      console.error("Failed to log holiday expense:", err);
      alert("Failed to log holiday expense.");
    }
  };

  // Live update: Budget Save (on blur or release slider)
  const handleBudgetSave = async () => {
    if (!activePlan) return;
    if (budgetValue === activePlan.budget_estimate) return;

    try {
      const { data: updatedPlan, error } = await supabase
        .from("holiday_plans")
        .update({ budget_estimate: budgetValue || null })
        .eq("id", activePlan.id)
        .select()
        .single();

      if (error) throw error;
      setPlans(prev => prev.map(p => p.id === activePlan.id ? updatedPlan : p));
    } catch (err) {
      console.error("Failed to update budget:", err);
    }
  };

  // Live update: Notes Save (on blur)
  const handleNotesSave = async () => {
    if (!activePlan) return;
    if (notesValue.trim() === (activePlan.notes || "").trim()) return;

    setNotesStatus("Saving...");
    try {
      const { data: updatedPlan, error } = await supabase
        .from("holiday_plans")
        .update({ notes: notesValue.trim() || null })
        .eq("id", activePlan.id)
        .select()
        .single();

      if (error) throw error;
      setPlans(prev => prev.map(p => p.id === activePlan.id ? updatedPlan : p));
      setNotesStatus("Autosaved just now");
    } catch (err) {
      console.error("Failed to save notes:", err);
      setNotesStatus("Failed to save");
    }
  };

  // Toggle checklist item packed status
  const handleTogglePackingItem = async (itemName: string) => {
    if (!activePlan) return;
    const normalized = normalizePackingList(activePlan.packing_list);
    const updatedList = normalized.map(item =>
      item.name === itemName ? { ...item, packed: !item.packed } : item
    );

    try {
      const { data: updatedPlan, error } = await supabase
        .from("holiday_plans")
        .update({ packing_list: updatedList as any })
        .eq("id", activePlan.id)
        .select()
        .single();

      if (error) throw error;
      setPlans(prev => prev.map(p => p.id === activePlan.id ? updatedPlan : p));
    } catch (err) {
      console.error("Failed to toggle checklist item:", err);
    }
  };

  // Add new packing list item
  const handleAddPackingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan || !newItemName.trim()) return;

    const normalized = normalizePackingList(activePlan.packing_list);
    const newItem: PackingItem = {
      name: newItemName.trim(),
      packed: false,
      category: newItemCategory
    };

    if (normalized.some(item => item.name.toLowerCase() === newItem.name.toLowerCase())) {
      alert("This item already exists.");
      return;
    }

    const updatedList = [...normalized, newItem];

    try {
      const { data: updatedPlan, error } = await supabase
        .from("holiday_plans")
        .update({ packing_list: updatedList as any })
        .eq("id", activePlan.id)
        .select()
        .single();

      if (error) throw error;
      setPlans(prev => prev.map(p => p.id === activePlan.id ? updatedPlan : p));
      setNewItemName("");
    } catch (err) {
      console.error("Failed to add packing item:", err);
    }
  };

  // Remove packing list item
  const handleRemovePackingItem = async (itemName: string) => {
    if (!activePlan) return;
    const normalized = normalizePackingList(activePlan.packing_list);
    const updatedList = normalized.filter(item => item.name !== itemName);

    try {
      const { data: updatedPlan, error } = await supabase
        .from("holiday_plans")
        .update({ packing_list: updatedList as any })
        .eq("id", activePlan.id)
        .select()
        .single();

      if (error) throw error;
      setPlans(prev => prev.map(p => p.id === activePlan.id ? updatedPlan : p));
    } catch (err) {
      console.error("Failed to remove packing item:", err);
    }
  };

  // Invite Copy Code Link
  const handleInviteCopy = () => {
    // Attempt to copy invite code from shell or local clipboard
    // NewAppShell sidebar already provides this, but we can copy the family ID or a helper message
    if (familyId) {
      navigator.clipboard.writeText(familyId);
      alert("Family Code copied! Share this code with members to invite them.");
    } else {
      alert("Family details loading...");
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

  // Rule 15: Status info
  const getPlanStatusInfo = (plan: HolidayPlan) => {
    const today = new Date().toISOString().slice(0, 10);
    if (today > plan.end_date) {
      return {
        label: "Completed",
        color: "bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-900/30",
        dotColor: "bg-emerald-500 dark:bg-emerald-400",
        code: "green"
      };
    }
    if (today >= plan.start_date && today <= plan.end_date) {
      return {
        label: "In Progress",
        color: "bg-amber-500/10 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 border-amber-500/20 dark:border-amber-900/30",
        dotColor: "bg-amber-500 dark:bg-amber-400",
        code: "yellow"
      };
    }
    return {
      label: "Upcoming",
      color: "bg-slate-500/10 dark:bg-slate-400/15 text-slate-600 dark:text-slate-300 border-slate-500/20 dark:border-slate-800/30",
      dotColor: "bg-slate-400 dark:bg-slate-500",
      code: "grey"
    };
  };

  // Filter & Sort plans
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
      const multiplier = sortDirection === "asc" ? 1 : -1;
      if (sortField === "budget") {
        return (Number(a.budget_estimate || 0) - Number(b.budget_estimate || 0)) * multiplier;
      } else {
        return (new Date(a.start_date).getTime() - new Date(b.start_date).getTime()) * multiplier;
      }
    });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-on-surface-variant font-medium">Gathering family travel plans…</p>
        </div>
      </div>
    );
  }

  // Greeting info
  const greeting = getGreeting();

  // Packing list items parsing
  const activePackingItems = activePlan ? normalizePackingList(activePlan.packing_list) : [];
  const packedCount = activePackingItems.filter(item => item.packed).length;
  const totalPackingCount = activePackingItems.length;
  const packingPercent = totalPackingCount > 0 ? Math.round((packedCount / totalPackingCount) * 100) : 0;

  // Curated categories
  const categoriesList = ["Essentials", "Clothing", "Gear & Tech"];

  // Proportions of budget (30% flights, 45% stay, 15% food, 10% other)
  const budgetBreakdown = {
    flights: budgetValue * 0.3,
    stay: budgetValue * 0.45,
    food: budgetValue * 0.15,
    other: budgetValue * 0.1,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* HEADER SECTION */}
      <section className="glass-card p-6 md:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant/80">
            <span>{greeting.emoji}</span>
            <span>{greeting.text}</span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight">
            Holiday <span className="text-primary italic">Planner</span>
          </h2>
          <p className="text-sm text-on-surface-variant font-medium">
            Plan destinations, track travel budgets, and assemble checklists for family getaways.
          </p>
        </div>

        <div className="relative z-10 flex gap-2">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/95 text-on-primary font-bold px-5 py-2.5 rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2 text-xs uppercase tracking-wider"
          >
            <Plus className="h-4 w-4" /> Plan New Trip
          </Button>
        </div>
      </section>

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: LIST OF PLANS (col-span-4) */}
        <section className="lg:col-span-4 glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-on-surface">Family Adventures</h3>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {plans.length} total
            </span>
          </div>

          {/* Search and Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant/60" />
              <Input
                placeholder="Search destinations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-surface-container-low border-outline-variant/60 text-xs h-9 rounded-xl focus:ring-1 focus:ring-primary/40 focus:border-primary"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary/50 transition-all h-9 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="green">Completed</option>
                <option value="yellow">In Progress</option>
                <option value="grey">Upcoming</option>
              </select>

              <button
                onClick={() => toggleSort("start_date")}
                className={`h-9 w-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${
                  sortField === "start_date"
                    ? "bg-primary text-on-primary border-primary shadow-sm"
                    : "border-outline-variant/60 bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant/80"
                }`}
                title="Sort by Dates"
              >
                <Calendar className="h-4 w-4" />
              </button>

              <button
                onClick={() => toggleSort("budget")}
                className={`h-9 w-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${
                  sortField === "budget"
                    ? "bg-primary text-on-primary border-primary shadow-sm"
                    : "border-outline-variant/60 bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant/80"
                }`}
                title="Sort by Budget"
              >
                <Wallet className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Vertical scroll list of plans */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredPlans.length === 0 ? (
              <div className="py-12 text-center text-on-surface-variant/40 font-medium italic text-xs">
                No travel plans match the filters.
              </div>
            ) : (
              filteredPlans.map((plan) => {
                const isActive = plan.id === activePlanId;
                const statusInfo = getPlanStatusInfo(plan);
                const itemsCount = normalizePackingList(plan.packing_list).length;
                const packed = normalizePackingList(plan.packing_list).filter(i => i.packed).length;
                const progress = itemsCount > 0 ? Math.round((packed / itemsCount) * 100) : 0;

                return (
                  <div
                    key={plan.id}
                    onClick={() => setActivePlanId(plan.id)}
                    className={`group p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 active:scale-[0.99] flex flex-col justify-between gap-2 shadow-xs ${
                      isActive
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-surface hover:bg-surface-container-low border-outline-variant/20"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className={`font-serif font-bold text-sm ${isActive ? "text-primary" : "text-on-surface"} truncate`}>
                          {plan.destination}
                        </h4>
                        <p className="text-[10.5px] text-on-surface-variant/80 font-semibold mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-on-surface-variant/60" />
                          {new Date(plan.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          {" - "}
                          {new Date(plan.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wide ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(plan);
                            }}
                            className="p-1 rounded-full hover:bg-primary/15 text-on-surface-variant/60 hover:text-primary active:scale-95 transition-all"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePlan(plan.id);
                            }}
                            className="p-1 rounded-full hover:bg-destructive/10 text-on-surface-variant/60 hover:text-destructive active:scale-95 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-outline-variant/15 text-[10.5px] text-on-surface-variant/70 font-medium">
                      <span className="font-semibold text-primary/95">
                        {plan.budget_estimate ? `₹${Number(plan.budget_estimate).toLocaleString("en-IN")}` : "No budget"}
                      </span>
                      <span>
                        {itemsCount > 0 ? `${progress}% packed` : "No checklist"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: DETAILED VIEW OF ACTIVE PLAN (col-span-8) */}
        <section className="lg:col-span-8 space-y-6">
          
          {!activePlan ? (
            <div className="glass-card rounded-2xl p-16 border border-outline-variant/30 text-center flex flex-col items-center justify-center gap-4">
              <Luggage className="h-16 w-16 text-on-surface-variant/30 stroke-[1.2]" />
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-lg text-on-surface">No Adventures Planned Yet</h4>
                <p className="text-sm text-on-surface-variant max-w-sm">
                  Get your family getaways organized! Start by clicking &quot;Plan New Trip&quot; to register your next holiday.
                </p>
              </div>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="mt-2 bg-primary hover:bg-primary/95 text-on-primary font-bold px-6 py-2.5 rounded-xl shadow-md"
              >
                Create a Trip Plan
              </Button>
            </div>
          ) : (
            <>
              {/* Plan Header Card */}
              <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1.5">
                    <Plane className="h-4 w-4 shrink-0" />
                    <span>Holiday Details & Itinerary</span>
                  </div>
                  <h3 className="font-serif text-2xl font-extrabold text-on-surface">
                    {activePlan.destination}
                  </h3>
                  <p className="text-xs text-on-surface-variant font-semibold mt-1">
                    {new Date(activePlan.start_date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                    {" – "}
                    {new Date(activePlan.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    {` • ${Math.round((new Date(activePlan.end_date).getTime() - new Date(activePlan.start_date).getTime()) / (1000 * 3600 * 24)) + 1} Days`}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleInviteCopy}
                    className="px-3.5 py-2 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface font-bold text-xs hover:border-outline transition-all flex items-center gap-1.5 active:scale-95"
                    title="Invite Family"
                  >
                    <Copy className="h-3.5 w-3.5" /> Invite Family
                  </button>
                  <button
                    onClick={() => handleEditClick(activePlan)}
                    className="px-3.5 py-2 rounded-xl bg-secondary text-on-secondary font-bold text-xs hover:bg-secondary/95 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit Trip
                  </button>
                </div>
              </div>

              {/* Bento Grid Detail Pane */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Hero image and weather card (col-span-8) */}
                <div className="md:col-span-8 glass-card rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden relative group">
                  <div 
                    className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url('${getDestinationInfo(activePlan.destination).image}')` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
                  </div>

                  <div className="relative z-10 h-64 p-5 flex flex-col justify-end text-white select-none">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="bg-secondary text-on-secondary px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mb-2 inline-block">
                          Active Destination
                        </span>
                        <h4 className="font-serif text-xl font-bold">{activePlan.destination}</h4>
                        <div className="flex items-center gap-3 mt-1 text-[11px] font-medium text-white/90">
                          <span className="flex items-center gap-1"><CloudSun className="h-3.5 w-3.5" /> {getDestinationInfo(activePlan.destination).weather}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {getDestinationInfo(activePlan.destination).timezone}</span>
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activePlan.destination)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-95"
                        title="View on Google Maps"
                      >
                        <Map className="h-4.5 w-4.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Progress Stats summary card (col-span-4) */}
                <div className="md:col-span-4 glass-card p-5 rounded-2xl flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="font-serif text-sm font-bold text-on-surface uppercase tracking-wider">
                      Trip Overview
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase">Status</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${getPlanStatusInfo(activePlan).color}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${getPlanStatusInfo(activePlan).dotColor}`} />
                            {getPlanStatusInfo(activePlan).label}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase">Budget estimate</p>
                        <p className="text-lg font-bold font-serif text-primary mt-0.5">
                          {activePlan.budget_estimate ? `₹${Number(activePlan.budget_estimate).toLocaleString("en-IN")}` : "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase">Packing checklist</p>
                        <p className="text-xs font-semibold text-on-surface mt-0.5">
                          {totalPackingCount > 0 ? `${packedCount} / ${totalPackingCount} items (${packingPercent}%)` : "No items listed"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {activePlan.budget_estimate && (
                    <button
                      onClick={() => handleLogExpense(activePlan)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/20 hover:border-transparent text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs mt-4"
                      title="Log Budget as Travel Expense"
                    >
                      <CheckCircle2 className="h-4.5 w-4.5" /> Log Budget Exp
                    </button>
                  )}
                </div>

                {/* Budget Estimator / Tracker Card (col-span-8) */}
                <div className="md:col-span-8 glass-card p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-serif text-base font-bold text-on-surface flex items-center gap-1.5">
                      <Wallet className="h-4.5 w-4.5 text-primary" /> Budget Tracker
                    </h4>
                    <span className="text-xs font-bold text-on-surface-variant/80">
                      Total: ₹{budgetValue.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Range Slider for Budget */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="1000000"
                        step="5000"
                        value={budgetValue}
                        onChange={(e) => setBudgetValue(Number(e.target.value))}
                        onMouseUp={handleBudgetSave}
                        onTouchEnd={handleBudgetSave}
                        className="w-full accent-primary h-2 bg-outline-variant/40 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="relative shrink-0 w-28">
                        <span className="absolute left-2.5 top-1.5 text-xs font-bold text-on-surface-variant">₹</span>
                        <Input
                          type="number"
                          value={budgetValue || ""}
                          onChange={(e) => setBudgetValue(Number(e.target.value))}
                          onBlur={handleBudgetSave}
                          className="pl-6 h-8 text-xs font-bold bg-surface-container-low border-outline-variant text-on-surface rounded-lg focus:ring-primary/30"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-on-surface-variant/60 font-semibold italic">
                      Drag slider or edit value to adjust budget. Let go or click outside to auto-save.
                    </p>
                  </div>

                  {/* Proportional breakdown cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex flex-col justify-between">
                      <span className="text-[9.5px] font-bold text-blue-800 dark:text-blue-300 uppercase">Flights (30%)</span>
                      <span className="text-xs font-bold text-on-surface mt-1">₹{Math.round(budgetBreakdown.flights).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-between">
                      <span className="text-[9.5px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Stay (45%)</span>
                      <span className="text-xs font-bold text-on-surface mt-1">₹{Math.round(budgetBreakdown.stay).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex flex-col justify-between">
                      <span className="text-[9.5px] font-bold text-amber-800 dark:text-amber-300 uppercase">Food (15%)</span>
                      <span className="text-xs font-bold text-on-surface mt-1">₹{Math.round(budgetBreakdown.food).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/30 flex flex-col justify-between">
                      <span className="text-[9.5px] font-bold text-slate-800 dark:text-slate-300 uppercase">Other (10%)</span>
                      <span className="text-xs font-bold text-on-surface mt-1">₹{Math.round(budgetBreakdown.other).toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Visual proportional breakdown progress bar */}
                  <div className="space-y-1 pt-1">
                    <div className="w-full h-3.5 bg-outline-variant/30 rounded-full overflow-hidden flex shadow-xs border border-outline-variant/10">
                      <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: "30%" }} title="Flights" />
                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: "45%" }} title="Stay" />
                      <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: "15%" }} title="Food" />
                      <div className="h-full bg-slate-400 transition-all duration-300" style={{ width: "10%" }} title="Other" />
                    </div>
                    <div className="flex justify-between text-[9px] text-on-surface-variant font-bold">
                      <span>Proportional allocations</span>
                      <span>Target: 100%</span>
                    </div>
                  </div>
                </div>

                {/* Packing List Card (col-span-4 - moves into grid for desktop, stacks on mobile) */}
                <div className="md:col-span-4 glass-card p-5 rounded-2xl flex flex-col space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-serif text-base font-bold text-on-surface flex items-center gap-1.5">
                      <Luggage className="h-4.5 w-4.5 text-secondary" /> Packing Checklist
                    </h4>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0">
                      {packingPercent}% Done
                    </span>
                  </div>

                  {/* List grouped by category */}
                  <div className="space-y-4 flex-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {activePackingItems.length === 0 ? (
                      <div className="py-8 text-center text-on-surface-variant/40 font-medium italic text-xs">
                        No checklist items. Add one below!
                      </div>
                    ) : (
                      categoriesList.map((catName) => {
                        const catItems = activePackingItems.filter(i => i.category === catName);
                        if (catItems.length === 0) return null;

                        return (
                          <div key={catName} className="space-y-1.5">
                            <h5 className="text-[10px] font-extrabold uppercase tracking-wide text-on-surface-variant/60 flex items-center gap-1">
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                catName === "Essentials" ? "bg-primary" : catName === "Clothing" ? "bg-secondary" : "bg-emerald-500"
                              }`} />
                              {catName}
                            </h5>
                            <ul className="space-y-1">
                              {catItems.map((item, idx) => (
                                <li 
                                  key={idx} 
                                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-surface-container-low transition-colors group"
                                >
                                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={item.packed}
                                      onChange={() => handleTogglePackingItem(item.name)}
                                      className="w-4 h-4 rounded border border-outline-variant text-primary focus:ring-0 cursor-pointer transition-all"
                                    />
                                    <span className={`text-xs truncate font-medium ${
                                      item.packed ? "line-through text-on-surface-variant/50 font-normal" : "text-on-surface font-semibold"
                                    }`}>
                                      {item.name}
                                    </span>
                                  </label>
                                  <button
                                    onClick={() => handleRemovePackingItem(item.name)}
                                    className="p-1 opacity-0 group-hover:opacity-100 text-on-surface-variant/40 hover:text-primary rounded hover:bg-primary/5 transition-all shrink-0 cursor-pointer"
                                    title="Remove item"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add packing item form */}
                  <form onSubmit={handleAddPackingItem} className="pt-3 border-t border-outline-variant/15 space-y-2">
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="Add checklist item..."
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="h-8 text-xs bg-surface-container-low border-outline-variant/60 rounded-lg flex-1 focus:ring-primary/30"
                      />
                      <select
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value)}
                        className="h-8 rounded-lg border border-outline-variant/60 bg-surface-container-low px-1.5 text-[10px] text-on-surface font-bold outline-none cursor-pointer shrink-0"
                      >
                        <option value="Clothing">Clothing</option>
                        <option value="Essentials">Essentials</option>
                        <option value="Gear & Tech">Gear & Tech</option>
                      </select>
                      <button
                        type="submit"
                        className="h-8 w-8 rounded-lg bg-secondary text-on-secondary hover:bg-secondary/95 flex items-center justify-center shrink-0 active:scale-90 transition-all font-bold"
                        title="Add item"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </form>

                  {/* Packing Progress Bar */}
                  {totalPackingCount > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-outline-variant/15">
                      <div className="flex justify-between text-[10px] text-on-surface-variant font-bold">
                        <span>Checklist Completion</span>
                        <span>{packingPercent}%</span>
                      </div>
                      <div className="w-full bg-outline-variant/20 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-500" 
                          style={{ width: `${packingPercent}%` }} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes & Shared Itinerary ideas (col-span-12) */}
                <div className="col-span-12 glass-card p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-serif text-base font-bold text-on-surface flex items-center gap-1.5">
                      <FileText className="h-4.5 w-4.5 text-primary" /> Trip Notes & Itinerary Ideas
                    </h4>
                    
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 ${
                        notesStatus === "Saving..." ? "bg-amber-100 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300" : "bg-emerald-100 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${notesStatus === "Saving..." ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                        {notesStatus}
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      value={notesValue}
                      onChange={(e) => {
                        setNotesValue(e.target.value);
                        setNotesStatus("Editing...");
                      }}
                      onBlur={handleNotesSave}
                      className="w-full min-h-[140px] p-4 rounded-xl border border-outline-variant/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all bg-surface-container-low text-xs font-semibold text-on-surface-variant placeholder:text-on-surface-variant/40 outline-none"
                      placeholder="Add specific details, flight codes, hotel name, reservations, itinerary ideas..."
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[9px] text-on-surface-variant/40 font-bold">
                      <span>Click outside textarea to save changes</span>
                    </div>
                  </div>

                  {/* Action delete footer */}
                  <div className="flex justify-between items-center pt-3 border-t border-outline-variant/15">
                    <span className="text-[10px] text-on-surface-variant/60 font-semibold">
                      Created by you for Henderson Family Record
                    </span>
                    <button
                      onClick={() => handleDeletePlan(activePlan.id)}
                      className="text-xs font-bold text-primary hover:text-destructive hover:bg-destructive/10 flex items-center gap-1 active:scale-95 transition-all p-1.5 rounded-xl cursor-pointer"
                      title="Remove Trip Plan"
                    >
                      <Trash2 className="h-4 w-4" /> Remove Plan
                    </button>
                  </div>
                </div>

              </div>
            </>
          )}

        </section>

      </div>

      {/* UNIFIED TRIP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in" 
            onClick={handleCloseModal} 
          />

          <form 
            onSubmit={handleFormSubmit} 
            className="relative z-10 w-full max-w-lg glass-card border border-outline-variant/30 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <h3 className="font-serif text-lg font-bold text-primary flex items-center gap-2">
                <Luggage className="h-5 w-5" />
                {editingId ? "Update Holiday Plan" : "Plan New Family Trip"}
              </h3>
              <button 
                type="button"
                onClick={handleCloseModal}
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
                placeholder="e.g. Goa, Paris, Santorini, Manali"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="bg-surface-container-low border-outline-variant focus:border-primary/50 text-xs rounded-xl focus:ring-primary/20"
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
                  className="bg-surface-container-low border-outline-variant focus:border-primary/50 text-xs rounded-xl focus:ring-primary/20 cursor-pointer"
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
                  className="bg-surface-container-low border-outline-variant focus:border-primary/50 text-xs rounded-xl focus:ring-primary/20 cursor-pointer"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="budget" className="text-[10px] font-bold uppercase tracking-wider text-primary">Budget Estimate (INR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-on-surface-variant font-bold">₹</span>
                <Input
                  id="budget"
                  type="number"
                  placeholder="0.00"
                  value={budgetEstimate}
                  onChange={(e) => setBudgetEstimate(e.target.value)}
                  className="pl-7 bg-surface-container-low border-outline-variant focus:border-primary/50 text-xs font-bold rounded-xl focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-[10px] font-bold uppercase tracking-wider text-primary">Itinerary / Notes (Optional)</Label>
              <Input
                id="notes"
                type="text"
                placeholder="Flight details, hotel reservation codes, dinner timings..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-surface-container-low border-outline-variant focus:border-primary/50 text-xs rounded-xl focus:ring-primary/20"
              />
            </div>

            {!editingId && (
              <div className="space-y-1">
                <Label htmlFor="packing" className="text-[10px] font-bold uppercase tracking-wider text-primary">Packing Checklist (Optional)</Label>
                <Input
                  id="packing"
                  type="text"
                  placeholder="Passport, Swimwear, Universal adapters, Sunscreen (comma separated)"
                  value={packingList}
                  onChange={(e) => setPackingList(e.target.value)}
                  className="bg-surface-container-low border-outline-variant focus:border-primary/50 text-xs rounded-xl focus:ring-primary/20"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={handleCloseModal}
                className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-sans text-xs font-bold uppercase tracking-wider rounded-xl py-3 border border-outline-variant"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-primary hover:bg-primary/95 text-on-primary py-3 rounded-xl active:scale-95 transition-all shadow-md font-sans text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                {isSubmitting ? "Saving..." : editingId ? "Save Changes" : "Create Trip Plan"}
              </Button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
