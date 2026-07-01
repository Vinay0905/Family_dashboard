"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import {
  Bell,
  Clock,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Pencil
} from "lucide-react";

interface Reminder {
  id: string;
  title: string;
  remind_at: string;
  category: string;
  is_acknowledged: boolean;
}

const CAT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  bill: { bg: "bg-rose-500/10", text: "text-rose-700", label: "Bill" },
  birthday: { bg: "bg-emerald-500/10", text: "text-emerald-700", label: "Birthday" },
  anniversary: { bg: "bg-purple-500/10", text: "text-purple-700", label: "Anniversary" },
  renewal: { bg: "bg-blue-500/10", text: "text-blue-700", label: "Renewal" },
  maintenance: { bg: "bg-amber-500/10", text: "text-amber-700", label: "Maintenance" },
  travel: { bg: "bg-sky-500/10", text: "text-sky-700", label: "Travel" },
  other: { bg: "bg-slate-500/10", text: "text-slate-700", label: "Other" },
};

export default function NewRemindersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [category, setCategory] = useState<"bill" | "birthday" | "anniversary" | "renewal" | "maintenance" | "travel" | "other">("bill");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setRemindAt("");
    setCategory("bill");
    setEditingId(null);
    setIsEditing(false);
  };

  const handleOpenEdit = (rem: Reminder) => {
    setEditingId(rem.id);
    setIsEditing(true);
    setTitle(rem.title || "");
    if (rem.remind_at) {
      const date = new Date(rem.remind_at);
      const localISO = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setRemindAt(localISO);
    } else {
      setRemindAt("");
    }
    setCategory(rem.category as any || "bill");
  };

  const { familyId: cachedFamilyId, currentUser: cachedUser, isInitialized, setAppInfo } = useAppStore();

  const loadReminders = useCallback(async () => {
    try {
      let activeFamilyId = cachedFamilyId;

      if (!isInitialized) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          router.push("/login");
          return;
        }

        const { data: member } = await supabase
          .from("family_members")
          .select("family_id, role")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (!member) {
          router.push("/onboarding");
          return;
        }
        activeFamilyId = member.family_id;

        // Fetch family members list
        const { data: membersData } = await supabase
          .from("family_members")
          .select("user_id, display_name, role")
          .eq("family_id", member.family_id);

        const { data: family } = await supabase
          .from("families")
          .select("name")
          .eq("id", member.family_id)
          .maybeSingle();

        setAppInfo({
          familyId: member.family_id,
          familyMembers: membersData ?? [],
          currentUser: userData.user,
          memberRole: member.role,
          familyName: family?.name ?? "Family"
        });
      }

      if (!activeFamilyId) return;

      const { data } = await supabase
        .from("reminders")
        .select("id, title, remind_at, category, is_acknowledged")
        .eq("family_id", activeFamilyId)
        .order("remind_at", { ascending: true });

      setReminders(data ?? []);
    } catch (err) {
      console.error("Failed to load reminders:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router, cachedFamilyId, cachedUser, isInitialized, setAppInfo]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  async function handleAddReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !remindAt) return;
    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: member } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("user_id", userData?.user?.id ?? "")
        .maybeSingle();

      if (member && userData?.user) {
        if (isEditing && editingId) {
          const { error } = await supabase
            .from("reminders")
            .update({
              title,
              remind_at: new Date(remindAt).toISOString(),
              category,
            })
            .eq("id", editingId);

          if (error) throw error;
          alert("Reminder updated successfully!");
        } else {
          const { error } = await supabase.from("reminders").insert({
            family_id: member.family_id,
            title,
            remind_at: new Date(remindAt).toISOString(),
            category,
            is_acknowledged: false,
            created_by: userData.user.id,
          });

          if (error) throw error;
          alert("Reminder set successfully!");
        }

        resetForm();
        loadReminders();
      }
    } catch (err) {
      console.error("Failed to save reminder:", err);
      alert("Failed to save reminder.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAcknowledge(id: string, currentVal: boolean) {
    try {
      const { error } = await supabase
        .from("reminders")
        .update({ is_acknowledged: !currentVal })
        .eq("id", id);

      if (error) throw error;
      loadReminders();
    } catch (err) {
      console.error("Failed to update reminder status:", err);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from("reminders")
        .delete()
        .eq("id", id);

      if (error) throw error;
      loadReminders();
    } catch (err) {
      console.error("Failed to delete reminder:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-on-surface-variant font-medium font-sans">Syncing reminders...</p>
        </div>
      </div>
    );
  }

  const activeReminders = reminders.filter(r => !r.is_acknowledged);
  const clearedReminders = reminders.filter(r => r.is_acknowledged);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Hero section */}
      <section className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <h2 className="font-quicksand text-3xl font-extrabold text-on-surface tracking-tight">Reminders & Alerts</h2>
          <p className="text-sm text-on-surface-variant font-medium">Keep track of upcoming bills, birthdays, renewals, and anniversaries.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side - Add Reminder Form */}
        <div className="lg:col-span-1 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 h-fit">
          <h3 className="font-quicksand text-lg font-bold text-on-surface mb-4">{isEditing ? "Edit Reminder" : "Set Reminder"}</h3>
          <form onSubmit={handleAddReminder} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-1.5">Reminder Title</label>
              <input
                type="text"
                placeholder="e.g. Electricity Bill payment"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs font-medium rounded-xl border border-outline-variant/50 p-3 bg-surface-container-low focus:border-primary focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-1.5">Remind Date & Time</label>
              <input
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
                className="w-full text-xs font-medium rounded-xl border border-outline-variant/50 p-3 bg-surface-container-low focus:border-primary focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full text-xs font-semibold rounded-xl border border-outline-variant/50 p-3 bg-surface-container-low focus:border-primary focus:outline-none transition-colors"
              >
                {Object.entries(CAT_COLORS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3 border border-outline-variant bg-surface text-on-surface font-sans text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-grow flex items-center justify-center gap-2 p-3 rounded-xl bg-primary text-on-primary font-bold text-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {!isEditing && <Plus className="h-4 w-4" />}
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Set Active Reminder"}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side - Reminders Feed */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Reminders */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20">
            <h3 className="font-quicksand text-lg font-bold text-on-surface mb-4 flex items-center justify-between">
              Active Alerts
              <span className="text-xs bg-rose-500/10 text-rose-700 px-2.5 py-0.5 rounded-full font-bold">
                {activeReminders.length} pending
              </span>
            </h3>

            {activeReminders.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-on-surface-variant/40">
                <Bell className="h-10 w-10 mb-3 stroke-[1.5] text-on-surface-variant/30 animate-bounce" />
                <p className="text-sm font-semibold">No pending alerts</p>
                <p className="text-xs font-medium mt-1">Everything is in check.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeReminders.map(rem => {
                  const dateVal = new Date(rem.remind_at);
                  const isOverdue = dateVal < new Date();
                  const catSty = CAT_COLORS[rem.category] ?? CAT_COLORS.other;
                  return (
                    <div key={rem.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      isOverdue ? "border-rose-500/40 bg-rose-500/5" : "border-outline-variant/15 hover:border-primary/20"
                    }`}>
                      <div className={`p-2.5 rounded-xl ${isOverdue ? "bg-rose-500/10 text-rose-600" : "bg-primary/10 text-primary"}`}>
                        {isOverdue ? <AlertCircle className="h-5 w-5 animate-pulse" /> : <Bell className="h-5 w-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{rem.title}</p>
                        <p className="text-xs text-on-surface-variant/75 font-semibold mt-1 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {dateVal.toLocaleString("en-IN", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${catSty.bg} ${catSty.text}`}>
                          {catSty.label}
                        </span>
                        <button
                          onClick={() => handleAcknowledge(rem.id, rem.is_acknowledged)}
                          className="p-2 rounded-xl bg-surface-container hover:bg-emerald-500/10 hover:text-emerald-600 active:scale-90 transition-all border border-outline-variant/20"
                          title="Acknowledge & clear reminder"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(rem)}
                          className="p-2 rounded-xl bg-surface-container hover:bg-primary/10 hover:text-primary active:scale-90 transition-all border border-outline-variant/20"
                          title="Edit reminder"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rem.id)}
                          className="p-2 rounded-xl bg-surface-container hover:bg-rose-500/10 hover:text-rose-600 active:scale-90 transition-all border border-outline-variant/20"
                          title="Delete reminder"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cleared Reminders */}
          {clearedReminders.length > 0 && (
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 opacity-70">
              <h3 className="font-quicksand text-base font-bold text-on-surface-variant/80 mb-4">Cleared History</h3>
              <div className="space-y-2">
                {clearedReminders.map(rem => (
                  <div key={rem.id} className="flex items-center justify-between p-3 rounded-xl border border-outline-variant/10 bg-surface-container-low/40">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-on-surface-variant line-through truncate">{rem.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcknowledge(rem.id, rem.is_acknowledged)}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleOpenEdit(rem)}
                        className="text-on-surface-variant/40 hover:text-primary p-1"
                        title="Edit reminder"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(rem.id)}
                        className="text-on-surface-variant/40 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
