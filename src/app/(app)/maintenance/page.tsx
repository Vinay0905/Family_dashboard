"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  ArrowUpDown
} from "lucide-react";

export default function MaintenancePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<"next_due_date" | "name">("next_due_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc"); // Default earliest first

  // Modal Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [lastServiceDate, setLastServiceDate] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [vendor, setVendor] = useState("");
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

        // Fetch maintenance assets
        const { data: assetsData } = await supabase
          .from("maintenance_assets")
          .select("*")
          .eq("family_id", memberData.family_id);

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
  }, [supabase, router]);

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
          notes: notes.trim() || null
        })
        .select()
        .single();

      if (error) throw error;

      setAssets((prev) => [...prev, newAsset]);
      setName("");
      setLastServiceDate("");
      setNextDueDate("");
      setVendor("");
      setNotes("");
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create asset:", err);
      alert("Failed to create asset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      const { error } = await supabase.from("maintenance_assets").delete().eq("id", assetId);
      if (error) throw error;
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (err) {
      console.error("Failed to delete asset:", err);
      alert("Failed to delete asset.");
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

  // Rule 15: Red if overdue, Green if upcoming/future date, Grey if no due date
  const getAssetStatusInfo = (asset: any) => {
    if (!asset.next_due_date) {
      return {
        label: "No Due Date",
        color: "bg-slate-500/10 text-slate-400 border-slate-500/20",
        dotColor: "bg-slate-400",
        code: "grey"
      };
    }
    const today = new Date().toISOString().slice(0, 10);
    if (asset.next_due_date < today) {
      return {
        label: "Overdue",
        color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        dotColor: "bg-rose-500",
        code: "red"
      };
    }
    return {
      label: "Upcoming",
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      dotColor: "bg-emerald-500",
      code: "green"
    };
  };

  // Filter & Sort
  const filteredAssets = assets
    .filter((asset) => {
      const matchSearch =
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.vendor || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.notes || "").toLowerCase().includes(searchQuery.toLowerCase());

      const statusInfo = getAssetStatusInfo(asset);
      const matchStatus = statusFilter === "all" || statusInfo.code === statusFilter;

      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let multiplier = sortDirection === "asc" ? 1 : -1;
      if (sortField === "name") {
        return a.name.localeCompare(b.name) * multiplier;
      } else {
        if (!a.next_due_date) return 1;
        if (!b.next_due_date) return -1;
        return (new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()) * multiplier;
      }
    });

  // Calculate dynamic overdue items
  const overdueCount = assets.filter((asset) => {
    const today = new Date().toISOString().slice(0, 10);
    return asset.next_due_date && asset.next_due_date < today;
  }).length;

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Maintenance <span className="text-primary italic">Tracker</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Monitor AC service, water filter changes, vehicle tune-ups, and appliances.
          </p>
        </div>
      </section>

      {/* Alert Banner for Overdue Assets */}
      {overdueCount > 0 && (
        <section className="rounded bg-rose-500/5 border border-rose-500/20 p-5 flex items-start gap-3 shadow-sm max-w-4xl">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500 mt-0.5 animate-bounce-slow" />
          <div>
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-rose-500 block mb-1">
              Immediate Check Required
            </span>
            <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
              You have <span className="font-bold text-on-surface">{overdueCount} appliance{overdueCount > 1 ? "s" : ""}</span> that are overdue for servicing. Please schedule with service technicians.
            </p>
          </div>
        </section>
      )}

      {/* Filter and Search Controls */}
      <section className="glass-card rounded p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant/60" />
          <Input
            placeholder="Search assets or vendors..."
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
            <option value="red">Overdue (Red)</option>
            <option value="green">Upcoming (Green)</option>
            <option value="grey">No Due Date (Grey)</option>
          </select>
        </div>
      </section>

      {/* Tabular Assets Grid */}
      <div className="glass-card rounded shadow-sm overflow-hidden border border-primary/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low border-b border-primary/10 font-bold uppercase text-primary tracking-wider">
                <th className="p-3.5 pl-4">Asset Name</th>
                <th className="p-3.5">Last Service Date</th>
                <th 
                  onClick={() => toggleSort("next_due_date")}
                  className="p-3.5 cursor-pointer hover:bg-primary/5 transition-colors select-none"
                >
                  <span className="items-center gap-1 inline-flex">
                    Next Due Date <ArrowUpDown className="h-3 w-3 text-primary/60" />
                  </span>
                </th>
                <th className="p-3.5">Vendor / Contact</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Notes</th>
                <th className="p-3.5 pr-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-on-surface-variant/40 font-semibold italic bg-surface-container-lowest">
                    No assets registered or match filters.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const statusInfo = getAssetStatusInfo(asset);

                  return (
                    <tr 
                      key={asset.id} 
                      className="bg-surface-container-lowest hover:bg-primary/[0.02] transition-colors"
                    >
                      <td className="p-3.5 pl-4 font-heading font-extrabold text-on-surface text-sm">
                        {asset.name}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-on-surface-variant">
                        {asset.last_service_date ? (
                          new Date(asset.last_service_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })
                        ) : (
                          <span className="italic opacity-40 font-normal">N/A</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-on-surface">
                        {asset.next_due_date ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-primary" />
                            {new Date(asset.next_due_date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        ) : (
                          <span className="italic opacity-45 font-normal">Not scheduled</span>
                        )}
                      </td>
                      <td className="p-3.5 font-sans font-semibold text-on-surface">
                        {asset.vendor || <span className="italic opacity-40 font-normal">None</span>}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest ${statusInfo.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotColor}`} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans text-on-surface-variant max-w-xs truncate" title={asset.notes}>
                        {asset.notes || <span className="italic opacity-40 font-normal">None</span>}
                      </td>
                      <td className="p-3.5 pr-4 text-center">
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="p-1.5 text-on-surface-variant/40 hover:text-primary transition-all rounded hover:bg-primary/10 cursor-pointer"
                          title="Remove Asset"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Button to open creation modal */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary-container text-white px-8 h-12 gap-2 text-sm font-bold shadow-lg shadow-primary/20 rounded cursor-pointer animate-neon-text active:scale-95 transition-all"
        >
          <Plus className="h-5 w-5" /> Register Asset
        </Button>
      </div>

      {/* Register Asset Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-xs" 
            onClick={() => setShowCreateModal(false)} 
          />

          <form 
            onSubmit={handleCreateAsset} 
            className="relative z-10 w-full max-w-lg glass-card rounded p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-primary/10">
              <h3 className="font-heading text-lg font-bold text-primary flex items-center gap-2">
                <Wrench className="h-5 w-5" /> Register Asset
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
              <Label htmlFor="assetName" className="text-[10px] font-bold uppercase tracking-wider text-primary">Asset Name</Label>
              <Input
                id="assetName"
                type="text"
                placeholder="e.g. AC Filter Living Room, Tesla Model S, Kent Purifier"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="lastService" className="text-[10px] font-bold uppercase tracking-wider text-primary">Last Service Date</Label>
                <Input
                  id="lastService"
                  type="date"
                  value={lastServiceDate}
                  onChange={(e) => setLastServiceDate(e.target.value)}
                  className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="nextDue" className="text-[10px] font-bold uppercase tracking-wider text-primary">Next Due Date</Label>
                <Input
                  id="nextDue"
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="vendor" className="text-[10px] font-bold uppercase tracking-wider text-primary">Vendor Contact / Phone</Label>
              <Input
                id="vendor"
                type="text"
                placeholder="e.g. Urban Company (022-...), Kent Tech Support"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-[10px] font-bold uppercase tracking-wider text-primary">Notes (Optional)</Label>
              <Input
                id="notes"
                type="text"
                placeholder="e.g. Model number, specific filter size..."
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
              {isSubmitting ? "Registering..." : "Register Asset"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
