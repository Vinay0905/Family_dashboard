"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wrench,
  Calendar,
  Phone,
  Plus,
  Trash2,
  AlertTriangle,
  X,
  Search,
  ArrowUpDown,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  SlidersHorizontal,
  List,
  Grid,
  ChevronRight,
  User,
  Activity,
  Wind,
  Car,
  Droplet,
  Info,
  CalendarDays,
  PenTool
} from "lucide-react";

// Asset Category Cover Images
const getAssetImage = (name: string) => {
  const n = name.toLowerCase();
  if (
    n.includes("ac") ||
    n.includes("hvac") ||
    n.includes("heating") ||
    n.includes("furnace") ||
    n.includes("air condition")
  ) {
    return "https://lh3.googleusercontent.com/aida-public/AB6AXuAvazSXFP05pkOA8LUdd0XfKPUD-Ywhol2gzrCaIDAcP-JdNalrDjH-BA11B7CLBCoGc2_HhksOvOreKPUsb-WJnvCAwSHYnb4IcgokI95APVY1WLZtGHHAVkwqcy7Zeeiv-4VRWeS9zz0ZRRzo_mXFObQRUyVvk1Cex0IAqynYDOT8VgXOgDmWkE7paLbyUYXgTdTBMfrp-X7rllWpthUPPQf_akWJ8zod-lfzkJK0tAvh_FR9eZBjgg";
  }
  if (
    n.includes("car") ||
    n.includes("vehicle") ||
    n.includes("odyssey") ||
    n.includes("honda") ||
    n.includes("tesla") ||
    n.includes("truck") ||
    n.includes("bike")
  ) {
    return "https://lh3.googleusercontent.com/aida-public/AB6AXuCLKpR-HIFd-xuztn__4oGedePbDL0qwIWa4BZ6QzEbgUOstpFZYctqAyssbrcS0-Z6WIGW2v-i3yVwmV2CV88qI53S24vHrkh6ORIjva87C6nFiXIr2OZzknT8MAsdw0xRKqvL_vQ7c_TYXy-BQ8wjClpP1uvLk8WnqUisggxCkCfkMo-rH9j3mYFhsWXlVjUuJQrqXxERrihz7BLI9p9ULp9tC8k339baFudf_ulexMNcDb_II-TGdg";
  }
  if (
    n.includes("dish") ||
    n.includes("dishwasher") ||
    n.includes("kitchen") ||
    n.includes("fridge") ||
    n.includes("refrigerator") ||
    n.includes("oven") ||
    n.includes("appliance") ||
    n.includes("dryer") ||
    n.includes("washer") ||
    n.includes("washing")
  ) {
    return "https://lh3.googleusercontent.com/aida-public/AB6AXuAtc_yp__Z65et8SfZO0Bz1hPD2hFtFUupDj6unb_05lFBCp2bDHGTOsRITzzJ-RIL4GdB0LfhCp92qMxIIIzYx2DJzOcg3ns4Ah2yqzq2wSZKYDkUgIHh2pO9KbWkdvH8FlTYVr-PS7Z6qmb7xqCnuLWqc8H5VnBdy0rIlDbbcgmaLzXEVeL15KQMsqKd5PCFXAY00YDrzFXbELvwLqKclbbHq_XHMgClkmlE1zs9hD5VW1qPK6T2Ndg";
  }
  if (n.includes("pool") || n.includes("swim") || n.includes("spa")) {
    return "https://lh3.googleusercontent.com/aida-public/AB6AXuBNEcoRLlQw-XirUdI1t3baulixBzdmp3BKfzh9x4QFs8rb57KYrz4c0Jha6SmjM4o0-pFGM5enWeGMBi6cFKY5AfVGHlE7hvpOYkXRBXQ2bw1seFa9qzySpA7lQUYaMrVk8pDW36ySAbTqEYMoUzKuUr-r-DMkSlk-4EF6o1e_2xMi2eTHZFuaA6OUmW1YGKuuzqL-9ClmAe8fmKdf1SECFKIyXDIpc8qHdxRvH9yc6D9az9qxHUBQqw";
  }
  return "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80";
};

// Asset Category Icons
const getAssetIcon = (name: string) => {
  const n = name.toLowerCase();
  if (
    n.includes("ac") ||
    n.includes("hvac") ||
    n.includes("heating") ||
    n.includes("furnace") ||
    n.includes("air condition")
  ) {
    return Wind;
  }
  if (
    n.includes("car") ||
    n.includes("vehicle") ||
    n.includes("odyssey") ||
    n.includes("honda") ||
    n.includes("tesla") ||
    n.includes("truck") ||
    n.includes("bike")
  ) {
    return Car;
  }
  if (
    n.includes("dish") ||
    n.includes("dishwasher") ||
    n.includes("oven") ||
    n.includes("stove") ||
    n.includes("fridge") ||
    n.includes("refrigerator") ||
    n.includes("microwave")
  ) {
    return Sparkles;
  }
  if (
    n.includes("water") ||
    n.includes("purifier") ||
    n.includes("filter") ||
    n.includes("plumbing") ||
    n.includes("leak") ||
    n.includes("sink") ||
    n.includes("faucet") ||
    n.includes("pool") ||
    n.includes("garden") ||
    n.includes("sprinkler") ||
    n.includes("irrigation")
  ) {
    return Droplet;
  }
  return Wrench;
};

export default function MaintenancePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);

  // View Settings: "grid" (default) or "list" (table)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<"next_due_date" | "name">("next_due_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Modal Form State (combined Add/Edit)
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentAssetId, setCurrentAssetId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [lastServiceDate, setLastServiceDate] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [vendor, setVendor] = useState("");
  const [notes, setNotes] = useState("");
  const [serviceCost, setServiceCost] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Nurturing tip task log state
  const [nurturingTipAdded, setNurturingTipAdded] = useState(false);

  // Interactive Activity Stream starting with mock prototype data
  const [activities, setActivities] = useState<any[]>([
    {
      id: "act-1",
      title: "Pool Chemical Balance",
      details: "Completed by David • Today, 10:30 AM",
      description: '"pH and Chlorine levels adjusted. All within safe range."',
      type: "completed",
    },
    {
      id: "act-2",
      title: "Kitchen Sink Faucet Repair",
      details: "Service by Vendor • Yesterday",
      description: "Cost: ₹10,000",
      type: "service",
    },
    {
      id: "act-3",
      title: "Roof Inspection Alert",
      details: "System Generated • 3 days ago",
      description: "Annual inspection window is open. Schedule soon to avoid fall rains.",
      type: "warning",
    },
    {
      id: "act-4",
      title: "Garden Irrigation Check",
      details: "Completed by Sarah • May 28",
      description: "All sprinkler zones verified.",
      type: "completed",
    },
  ]);

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

        // Fetch maintenance assets
        const { data: assetsData } = await supabase
          .from("maintenance_assets")
          .select("*")
          .eq("family_id", activeFamilyId);

        if (assetsData) {
          setAssets(assetsData);
        }
      } catch (err) {
        console.error("Error loading assets:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, router, cachedFamilyId, cachedUser, isInitialized, setAppInfo]);

  const resetForm = () => {
    setCurrentAssetId(null);
    setName("");
    setLastServiceDate("");
    setNextDueDate("");
    setVendor("");
    setNotes("");
    setServiceCost("");
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setModalMode("create");
    setShowModal(true);
  };

  const handleOpenEditModal = (asset: any) => {
    setCurrentAssetId(asset.id);
    setName(asset.name || "");
    setLastServiceDate(asset.last_service_date || "");
    setNextDueDate(asset.next_due_date || "");
    setVendor(asset.vendor || "");
    setNotes(asset.notes || "");
    setServiceCost("");
    setModalMode("edit");
    setShowModal(true);
  };

  const setDueDateOffset = (months: number) => {
    const baseDate = lastServiceDate ? new Date(lastServiceDate) : new Date();
    baseDate.setMonth(baseDate.getMonth() + months);
    setNextDueDate(baseDate.toISOString().slice(0, 10));
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !familyId || !currentUser) return;

    setIsSubmitting(true);
    try {
      const { data: newAsset, error } = await supabase
        .from("maintenance_assets")
        .insert({
          family_id: familyId,
          created_by: currentUser.id,
          name: name.trim(),
          last_service_date: lastServiceDate || null,
          next_due_date: nextDueDate || null,
          vendor: vendor.trim() || null,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-log cost to expenses if specified
      if (serviceCost && Number(serviceCost) > 0) {
        await supabase.from("expenses").insert({
          family_id: familyId,
          created_by: currentUser.id,
          amount: Number(serviceCost),
          category: "utilities",
          paid_by: currentUser.id,
          expense_date: lastServiceDate || new Date().toISOString().slice(0, 10),
          description: `Auto-logged cost for registration of: ${name.trim()}`
        });
      }

      setAssets((prev) => [...prev, newAsset]);

      // Add to dynamic activity feed
      const newActivity = {
        id: `act-${Date.now()}`,
        title: `New Asset Registered: ${newAsset.name}`,
        details: `Created by You • Just now`,
        description: newAsset.notes || "No notes added.",
        type: "service",
      };
      setActivities((prev) => [newActivity, ...prev]);

      resetForm();
      setShowModal(false);
    } catch (err) {
      console.error("Failed to create asset:", err);
      alert("Failed to create asset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAssetId || !name.trim() || !familyId) return;

    setIsSubmitting(true);
    try {
      const { data: updatedAsset, error } = await supabase
        .from("maintenance_assets")
        .update({
          name: name.trim(),
          last_service_date: lastServiceDate || null,
          next_due_date: nextDueDate || null,
          vendor: vendor.trim() || null,
          notes: notes.trim() || null,
        })
        .eq("id", currentAssetId)
        .select()
        .single();

      if (error) throw error;

      // Auto-log cost to expenses if specified
      if (serviceCost && Number(serviceCost) > 0) {
        await supabase.from("expenses").insert({
          family_id: familyId,
          created_by: currentUser!.id,
          amount: Number(serviceCost),
          category: "utilities",
          paid_by: currentUser!.id,
          expense_date: lastServiceDate || new Date().toISOString().slice(0, 10),
          description: `Auto-logged cost for service of: ${name.trim()}`
        });
      }

      setAssets((prev) =>
        prev.map((a) => (a.id === currentAssetId ? updatedAsset : a))
      );

      // Add to dynamic activity feed
      const newActivity = {
        id: `act-${Date.now()}`,
        title: `Maintenance Logged: ${updatedAsset.name}`,
        details: `Updated by You • Just now`,
        description: `Last service: ${
          lastServiceDate
            ? new Date(lastServiceDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })
            : "N/A"
        }, next due: ${
          nextDueDate
            ? new Date(nextDueDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })
            : "N/A"
        }.`,
        type: "completed",
      };
      setActivities((prev) => [newActivity, ...prev]);

      resetForm();
      setShowModal(false);
    } catch (err) {
      console.error("Failed to update asset:", err);
      alert("Failed to update asset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAsset = async (assetId: string, assetName: string) => {
    if (!confirm(`Are you sure you want to delete "${assetName}"?`)) return;

    try {
      const { error } = await supabase
        .from("maintenance_assets")
        .delete()
        .eq("id", assetId);
      if (error) throw error;

      setAssets((prev) => prev.filter((a) => a.id !== assetId));

      // Add to dynamic activity feed
      const newActivity = {
        id: `act-${Date.now()}`,
        title: `Asset Removed: ${assetName}`,
        details: `Removed by You • Just now`,
        description: "Removed asset from home tracker records.",
        type: "warning",
      };
      setActivities((prev) => [newActivity, ...prev]);
    } catch (err) {
      console.error("Failed to delete asset:", err);
      alert("Failed to delete asset.");
    }
  };

  const handleAddTipToTasks = async () => {
    if (!familyId || !currentUser || nurturingTipAdded) return;
    try {
      const { error } = await supabase.from("tasks").insert({
        family_id: familyId,
        created_by: currentUser.id,
        title: "Check window seals for drafts",
        status: "open",
        due_date: new Date(Date.now() + 7 * 86400000)
          .toISOString()
          .slice(0, 10), // due in 7 days
      });
      if (error) throw error;
      setNurturingTipAdded(true);

      // Add to dynamic activity feed
      const newActivity = {
        id: `act-${Date.now()}`,
        title: "Task Created from Nurturing Tip",
        details: "Added by You • Just now",
        description: 'Chore "Check window seals for drafts" scheduled for next week.',
        type: "service",
      };
      setActivities((prev) => [newActivity, ...prev]);
    } catch (err) {
      console.error("Error adding tip to tasks:", err);
      alert("Failed to add tip to tasks.");
    }
  };

  const toggleSort = (field: "next_due_date" | "name") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Status mapping
  const getAssetStatusInfo = (asset: any) => {
    if (!asset.next_due_date) {
      return {
        label: "No Due Date",
        color: "bg-slate-500/10 text-slate-500 border-slate-500/20 dark:text-slate-400",
        dotColor: "bg-slate-400",
        badgeColor: "bg-slate-500 text-white",
        code: "grey",
      };
    }
    const today = new Date().toISOString().slice(0, 10);
    if (asset.next_due_date < today) {
      return {
        label: "Overdue",
        color: "bg-error/10 text-error border-error/20",
        dotColor: "bg-error",
        badgeColor: "bg-error-container text-on-error-container",
        code: "red",
      };
    }

    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const thirtyDaysLaterStr = thirtyDaysLater.toISOString().slice(0, 10);

    if (asset.next_due_date <= thirtyDaysLaterStr) {
      return {
        label: "Due Soon",
        color: "bg-warning/10 text-warning border-warning/20",
        dotColor: "bg-warning",
        badgeColor: "bg-warning-container text-on-warning-container",
        code: "soon",
      };
    }

    return {
      label: "Healthy",
      color: "bg-success/10 text-success border-success/20",
      dotColor: "bg-success",
      badgeColor: "bg-success-container text-on-success-container",
      code: "green",
    };
  };

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  const thirtyDaysLaterStr = thirtyDaysLater.toISOString().slice(0, 10);

  // Dynamic Bento Counts
  const totalCount = assets.length;
  const overdueCount = assets.filter(
    (a) => a.next_due_date && a.next_due_date < today
  ).length;
  const dueSoonCount = assets.filter(
    (a) =>
      a.next_due_date &&
      a.next_due_date >= today &&
      a.next_due_date <= thirtyDaysLaterStr
  ).length;
  const healthyCount = assets.filter(
    (a) => !a.next_due_date || a.next_due_date > thirtyDaysLaterStr
  ).length;

  // Filter & Sort assets
  const filteredAssets = assets
    .filter((asset) => {
      const matchSearch =
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.vendor || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.notes || "").toLowerCase().includes(searchQuery.toLowerCase());

      const statusInfo = getAssetStatusInfo(asset);
      const matchStatus =
        statusFilter === "all" ||
        statusInfo.code === statusFilter ||
        (statusFilter === "green" && statusInfo.code === "soon"); // Green includes soon for broad filters

      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const multiplier = sortDirection === "asc" ? 1 : -1;
      if (sortField === "name") {
        return a.name.localeCompare(b.name) * multiplier;
      } else {
        if (!a.next_due_date) return 1;
        if (!b.next_due_date) return -1;
        return (
          (new Date(a.next_due_date).getTime() -
            new Date(b.next_due_date).getTime()) *
          multiplier
        );
      }
    });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-on-surface-variant font-medium">
            Gathering home maintenance status…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <section className="glass-card p-6 md:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        {/* Soft atmospheric gradient glow matching Warmth & Order */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant/80">
            <Wrench className="h-3.5 w-3.5 text-primary" />
            <span>Home Integrity & Care</span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight">
            Maintenance Tracker
          </h2>
          <p className="text-sm text-on-surface-variant font-medium">
            Nurturing your appliances, vehicles, and utility systems for years to come.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2">
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-error-container/10 text-error px-3.5 py-2 rounded-xl border border-error-container/20 animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5 text-error" />
              {overdueCount} Overdue Item{overdueCount > 1 ? "s" : ""}
            </span>
          )}
          <Button
            onClick={handleOpenCreateModal}
            className="bg-secondary hover:bg-secondary/90 text-on-secondary font-bold text-xs px-4 py-2 h-9 rounded-xl shadow-md transition-all active:scale-95 duration-100 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add New Asset
          </Button>
        </div>
      </section>

      {/* ─── OVERDUE URGENT ALERT BANNER ────────────────────── */}
      {overdueCount > 0 && (
        <section className="rounded-2xl bg-error-container/10 border border-error-container/20 p-5 flex items-start gap-4 shadow-xs">
          <div className="bg-error-container/20 p-2.5 rounded-full text-error shrink-0 animate-bounce">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <span className="font-serif text-sm font-bold uppercase tracking-wider text-error">
              Immediate Care Recommended
            </span>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              You have{" "}
              <span className="font-bold text-on-surface">
                {overdueCount} system{overdueCount > 1 ? "s" : ""}
              </span>{" "}
              that are overdue for routine servicing. Prompt maintenance prevents
              costly failures and keeps your family safe.
            </p>
          </div>
        </section>
      )}

      {/* ─── BENTO STATS GRID ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Overdue",
            value: overdueCount,
            desc: "service window passed",
            border: "border-l-4 border-error",
            valColor: "text-error",
          },
          {
            label: "Due Soon",
            value: dueSoonCount,
            desc: "needs attention in 30d",
            border: "border-l-4 border-warning",
            valColor: "text-warning",
          },
          {
            label: "Healthy",
            value: healthyCount,
            desc: "schedule in order",
            border: "border-l-4 border-success",
            valColor: "text-success",
          },
          {
            label: "Total Systems",
            value: totalCount,
            desc: "assets registered",
            border: "border-l-4 border-primary",
            valColor: "text-primary",
          },
        ].map((card, idx) => (
          <div
            key={idx}
            className={`glass-card p-5 rounded-2xl flex flex-col justify-between ${card.border} ${
              card.label === "Overdue" && card.value > 0 ? "neon-glow-active" : ""
            }`}
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/40">
                {card.label}
              </span>
              <h3 className={`font-serif text-3xl font-bold mt-1 ${card.valColor}`}>
                {card.value} {card.value === 1 ? "Asset" : "Assets"}
              </h3>
            </div>
            <span className="text-[11px] text-on-surface-variant/75 font-medium mt-3">
              {card.desc}
            </span>
          </div>
        ))}
      </div>

      {/* ─── MAIN CONTENT BENTO LAYOUT ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: FILTER CONTROLS & ASSETS LIST/GRID (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* SEARCH, FILTERS & VIEW MODE CONTROL PANEL */}
          <section className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-on-surface-variant/50" />
              <Input
                placeholder="Search systems, vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9.5 bg-surface-container-low border border-outline-variant/10 rounded-xl text-xs h-9 focus-visible:ring-primary/20"
              />
            </div>

            {/* Filters group */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Status Select */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="red">Overdue (Red)</option>
                <option value="soon">Due Soon (Orange)</option>
                <option value="green">Healthy (Green)</option>
                <option value="grey">No Due Date (Grey)</option>
              </select>

              {/* Layout Toggle */}
              <div className="flex border border-outline-variant/30 rounded-xl overflow-hidden bg-surface-container-low h-9 p-0.5 shrink-0">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    viewMode === "grid"
                      ? "bg-surface-container-lowest text-primary shadow-xs"
                      : "text-on-surface-variant/65 hover:text-on-surface"
                  }`}
                  title="Card Grid View"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    viewMode === "list"
                      ? "bg-surface-container-lowest text-primary shadow-xs"
                      : "text-on-surface-variant/65 hover:text-on-surface"
                  }`}
                  title="Table List View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          {/* ASSETS CONTAINER */}
          {filteredAssets.length === 0 ? (
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-12 text-center shadow-xs">
              <Wrench className="h-12 w-12 mx-auto stroke-[1.25] text-on-surface-variant/30 mb-3" />
              <p className="text-sm font-semibold text-on-surface-variant">No systems found</p>
              <p className="text-xs text-on-surface-variant/60 mt-1 max-w-sm mx-auto">
                No maintenance assets match your filters. Register a new asset to start monitoring.
              </p>
              <Button
                onClick={handleOpenCreateModal}
                className="mt-4 bg-primary hover:bg-primary/95 text-on-primary font-semibold text-xs px-4 py-2 rounded-xl"
              >
                Register First Asset
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            /* VIEW MODE: CARDS GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAssets.map((asset) => {
                const status = getAssetStatusInfo(asset);
                const Icon = getAssetIcon(asset.name);
                const coverImg = getAssetImage(asset.name);

                return (
                  <div
                    key={asset.id}
                    className={`glass-card rounded-2xl overflow-hidden flex flex-col hover:shadow-md transition-all duration-300 group ${
                      status.code === "red" ? "neon-glow-active border border-error/30" : ""
                    }`}
                  >
                    {/* Header Image Cover */}
                    <div className="relative h-40 bg-surface-container">
                      <img
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                        src={coverImg}
                        alt={asset.name}
                      />
                      {/* Floating Status Badge */}
                      <span
                        className={`absolute top-3 right-3 text-[10px] font-bold px-3 py-1 rounded-full border border-white/20 shadow-md tracking-wider uppercase ${status.badgeColor}`}
                      >
                        {status.label}
                      </span>
                    </div>
 
                    {/* Card Content Body */}
                    <div className="p-5 flex flex-col flex-grow">
                      {/* Name & Custom Category Icon */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-serif text-lg font-bold text-on-surface group-hover:text-primary transition-colors leading-tight">
                            {asset.name}
                          </h4>
                          {asset.vendor && (
                            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                              {asset.vendor}
                            </p>
                          )}
                        </div>
                        <div className="bg-primary-container/10 p-2.5 rounded-full text-primary shrink-0">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                      </div>

                      {/* Service Timestamps */}
                      <div className="space-y-2 text-xs font-semibold text-on-surface-variant/85 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-medium text-on-surface-variant/60">
                            <CheckCircle2 className="h-3.5 w-3.5 text-on-surface-variant/40" />
                            Last Service:
                          </span>
                          <span className="font-mono text-on-surface">
                            {asset.last_service_date
                              ? new Date(asset.last_service_date).toLocaleDateString(
                                  "en-IN",
                                  { day: "numeric", month: "short", year: "numeric" }
                                )
                              : "Never logged"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-medium text-on-surface-variant/60">
                            <Clock className="h-3.5 w-3.5 text-on-surface-variant/40" />
                            Next Service Due:
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              status.code === "red"
                                ? "text-error"
                                : status.code === "soon"
                                ? "text-warning"
                                : "text-success"
                            }`}
                          >
                            {asset.next_due_date
                              ? new Date(asset.next_due_date).toLocaleDateString(
                                  "en-IN",
                                  { day: "numeric", month: "short", year: "numeric" }
                                )
                              : "Not scheduled"}
                          </span>
                        </div>
                      </div>

                      {/* Static or Database Notes Snippet */}
                      {asset.notes && (
                        <p className="text-[11px] leading-relaxed text-on-surface-variant italic mb-4 bg-surface-container-low px-3 py-2 rounded-xl border border-outline-variant/10">
                          "{asset.notes}"
                        </p>
                      )}

                      {/* Card Button Panel */}
                      <div className="mt-auto pt-3 border-t border-outline-variant/15 flex items-center gap-2">
                        <Button
                          onClick={() => handleOpenEditModal(asset)}
                          className="flex-grow bg-primary/10 hover:bg-primary/20 text-primary border-none font-bold text-xs h-8.5 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
                        >
                          Record Maintenance
                        </Button>
                        <button
                          onClick={() => handleDeleteAsset(asset.id, asset.name)}
                          className="w-8.5 h-8.5 rounded-xl border border-outline-variant/30 flex items-center justify-center text-on-surface-variant/50 hover:text-error hover:bg-error/10 hover:border-error/20 transition-all cursor-pointer"
                          title="Delete Asset"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* DOTTED PLACEHOLDER: REGISTER NEW ASSET */}
              <div
                onClick={handleOpenCreateModal}
                className="border-2 border-dashed border-outline-variant/50 rounded-2xl flex flex-col items-center justify-center p-6 min-h-[360px] group cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              >
                <div
                  className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors duration-300 text-on-surface-variant/50 group-hover:text-primary"
                >
                  <Plus className="h-6 w-6 stroke-[2.25]" />
                </div>
                <span className="font-serif text-base font-bold text-on-surface-variant group-hover:text-primary transition-colors">
                  Register New System
                </span>
                <p className="text-[11px] font-medium text-on-surface-variant/50 text-center mt-1.5 px-6 leading-relaxed">
                  Track HVAC, home appliances, filtration systems, or vehicles to keep
                  chores organized.
                </p>
              </div>
            </div>
          ) : (
            /* VIEW MODE: COMPACT TABLE LIST */
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant/20 text-primary font-bold uppercase tracking-wider">
                      <th className="p-4 pl-5">System Name</th>
                      <th className="p-4">Last Service</th>
                      <th
                        onClick={() => toggleSort("next_due_date")}
                        className="p-4 cursor-pointer hover:bg-primary/5 transition-colors select-none"
                      >
                        <span className="flex items-center gap-1.5">
                          Next Due Date{" "}
                          <ArrowUpDown className="h-3.5 w-3.5 text-primary/60" />
                        </span>
                      </th>
                      <th className="p-4">Vendor / Phone</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Notes</th>
                      <th className="p-4 pr-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/15">
                    {filteredAssets.map((asset) => {
                      const status = getAssetStatusInfo(asset);
                      return (
                        <tr
                          key={asset.id}
                          className="border-b border-outline-variant/10 hover:bg-surface-container-low/40 transition-colors"
                        >
                          {/* Name */}
                          <td className="p-4 pl-5 font-serif font-bold text-on-surface text-sm">
                            {asset.name}
                          </td>
                          {/* Last Service */}
                          <td className="p-4 font-mono font-medium text-on-surface-variant">
                            {asset.last_service_date ? (
                              new Date(asset.last_service_date).toLocaleDateString(
                                "en-IN",
                                { day: "numeric", month: "short", year: "numeric" }
                              )
                            ) : (
                              <span className="italic opacity-40 font-normal">
                                Never logged
                              </span>
                            )}
                          </td>
                          {/* Next Due Date */}
                          <td className="p-4 font-mono font-bold text-on-surface">
                            {asset.next_due_date ? (
                              <span className="inline-flex items-center gap-1 text-primary">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(asset.next_due_date).toLocaleDateString(
                                  "en-IN",
                                  { day: "numeric", month: "short", year: "numeric" }
                                )}
                              </span>
                            ) : (
                              <span className="italic opacity-45 font-normal">
                                Not scheduled
                              </span>
                            )}
                          </td>
                          {/* Vendor */}
                          <td className="p-4 font-sans font-semibold text-on-surface">
                            {asset.vendor || (
                              <span className="italic opacity-40 font-normal">
                                None listed
                              </span>
                            )}
                          </td>
                          {/* Status Badge */}
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${status.color}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${status.dotColor}`}
                              />
                              {status.label}
                            </span>
                          </td>
                          {/* Notes */}
                          <td
                            className="p-4 font-sans text-on-surface-variant max-w-xs truncate"
                            title={asset.notes}
                          >
                            {asset.notes || (
                              <span className="italic opacity-40 font-normal">
                                None
                              </span>
                            )}
                          </td>
                          {/* Action Panel */}
                          <td className="p-4 pr-5 text-right space-x-1.5">
                            <button
                              onClick={() => handleOpenEditModal(asset)}
                              className="p-1.5 text-on-surface-variant/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all inline-flex items-center justify-center cursor-pointer"
                              title="Record Maintenance"
                            >
                              <PenTool className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteAsset(asset.id, asset.name)
                              }
                              className="p-1.5 text-on-surface-variant/40 hover:text-error hover:bg-error/10 rounded-xl transition-all inline-flex items-center justify-center cursor-pointer"
                              title="Delete Asset"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: RECENT ACTIVITIES & NURTURING TIPS (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* RECENT ACTIVITY TIMELINE */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-lg font-bold text-primary flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-primary" /> Recent Activities
              </h3>
            </div>

            {/* Vertical timeline */}
            <div className="space-y-6 relative before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant/20">
              {activities.map((act) => {
                let badgeColor = "bg-primary-fixed text-on-primary-fixed";
                let Icon = Wrench;

                if (act.type === "completed") {
                  badgeColor = "bg-tertiary-fixed text-on-tertiary-fixed";
                  Icon = Check;
                } else if (act.type === "warning") {
                  badgeColor = "bg-secondary-fixed text-on-secondary-fixed";
                  Icon = AlertTriangle;
                }

                return (
                  <div key={act.id} className="relative pl-8 group">
                    <div
                      className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-xs ${badgeColor}`}
                    >
                      <Icon className="h-3.5 w-3.5 font-bold" />
                    </div>
                    <div>
                      <p className="font-serif text-sm font-bold text-on-surface leading-tight">
                        {act.title}
                      </p>
                      <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                        {act.details}
                      </p>
                      {act.description && (
                        <p className="mt-1.5 text-xs text-on-surface-variant/80 bg-surface-container-low/50 border border-outline-variant/10 px-2.5 py-1.5 rounded-xl italic">
                          {act.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* NURTURING RECOMMENDATION TIP CARD */}
          <div className="bg-tertiary-container text-on-tertiary-container p-6 rounded-2xl relative overflow-hidden shadow-md">
            {/* Ambient Watermark Graphic */}
            <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 pointer-events-none">
              <Sparkles className="h-32 w-32" />
            </div>

            <div className="relative z-10 space-y-4">
              <div>
                <span className="inline-flex items-center gap-1 bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  💡 Nurturing Tip
                </span>
                <p className="text-xs leading-relaxed mt-2 opacity-90 font-medium">
                  Based on local season changes, we recommend checking window seals and door drafts this week to reduce electrical/heating bills.
                </p>
              </div>

              <Button
                disabled={nurturingTipAdded}
                onClick={handleAddTipToTasks}
                className={`w-full h-8.5 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all ${
                  nurturingTipAdded
                    ? "bg-tertiary text-on-tertiary border border-white/20 cursor-not-allowed"
                    : "bg-surface-container-lowest text-tertiary-container hover:bg-white cursor-pointer"
                }`}
              >
                {nurturingTipAdded ? (
                  <span className="flex items-center justify-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Added to Family Tasks
                  </span>
                ) : (
                  "Add to Tasks"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── DYNAMIC POPUP MODAL (CREATE / EDIT) ─────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
            onClick={() => setShowModal(false)}
          />

          {/* Form Modal Box */}
          <form
            onSubmit={modalMode === "create" ? handleCreateAsset : handleUpdateAsset}
            className="relative z-10 w-full max-w-lg bg-surface-container-lowest border border-outline-variant/35 rounded-2xl p-6 md:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Title */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <h3 className="font-serif text-lg font-bold text-primary flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                {modalMode === "create" ? "Register New System" : "Record System Maintenance"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/50 hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Input Name */}
            <div className="space-y-1.5">
              <Label htmlFor="assetName" className="text-xs font-bold uppercase tracking-wider text-primary">
                System / Asset Name
              </Label>
              <Input
                id="assetName"
                type="text"
                placeholder="e.g. AC Filter Living Room, Tesla Model S, Kent Purifier"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-surface-container-low border-outline-variant/40 rounded-xl focus:border-primary text-sm p-3 w-full outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            {/* Service & Due Dates Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Last Service Date */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="lastService" className="text-xs font-bold uppercase tracking-wider text-primary">
                    Last Service Date
                  </Label>
                  <button
                    type="button"
                    onClick={() =>
                      setLastServiceDate(new Date().toISOString().slice(0, 10))
                    }
                    className="text-[10px] text-primary font-bold hover:underline"
                  >
                    Today
                  </button>
                </div>
                <Input
                  id="lastService"
                  type="date"
                  value={lastServiceDate}
                  onChange={(e) => setLastServiceDate(e.target.value)}
                  className="bg-surface-container-low border-outline-variant/40 rounded-xl focus:border-primary text-sm p-3 w-full outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Next Due Date */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="nextDue" className="text-xs font-bold uppercase tracking-wider text-primary">
                    Next Due Date
                  </Label>
                  {/* Quick offset buttons */}
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDueDateOffset(3)}
                      className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-md hover:bg-primary/20"
                    >
                      +3m
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueDateOffset(6)}
                      className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-md hover:bg-primary/20"
                    >
                      +6m
                    </button>
                    <button
                      type="button"
                      onClick={() => setDueDateOffset(12)}
                      className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-md hover:bg-primary/20"
                    >
                      +1y
                    </button>
                  </div>
                </div>
                <Input
                  id="nextDue"
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="bg-surface-container-low border-outline-variant/40 rounded-xl focus:border-primary text-sm p-3 w-full outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Vendor */}
            <div className="space-y-1.5">
              <Label htmlFor="vendor" className="text-xs font-bold uppercase tracking-wider text-primary">
                Vendor Contact / Support Phone
              </Label>
              <Input
                id="vendor"
                type="text"
                placeholder="e.g. Climate Pro Services, Urban Company (022-...)"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="bg-surface-container-low border-outline-variant/40 rounded-xl focus:border-primary text-sm p-3 w-full outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-primary">
                Internal Notes
              </Label>
              <Input
                id="notes"
                type="text"
                placeholder="e.g. Model ID, specific filters needed..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-surface-container-low border-outline-variant/40 rounded-xl focus:border-primary text-sm p-3 w-full outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Service Cost */}
            <div className="space-y-1.5">
              <Label htmlFor="serviceCost" className="text-xs font-bold uppercase tracking-wider text-primary">
                Service Cost (Optional - Auto-logs to Expenses)
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-on-surface-variant/65 font-bold">₹</span>
                <Input
                  id="serviceCost"
                  type="number"
                  placeholder="0.00"
                  value={serviceCost}
                  onChange={(e) => setServiceCost(e.target.value)}
                  className="pl-7.5 bg-surface-container-low border-outline-variant/40 rounded-xl focus:border-primary text-sm p-3 w-full outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-3 bg-primary hover:bg-primary/95 text-on-primary py-3.5 rounded-xl active:scale-[0.98] transition-all shadow-md font-sans text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              {isSubmitting
                ? "Saving Details..."
                : modalMode === "create"
                ? "Register System"
                : "Save System Log"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
