"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  User,
  Users,
  Search,
  ArrowUpDown,
  X,
  Play,
  RotateCcw,
  AlertCircle
} from "lucide-react";

export default function TasksPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [memberRole, setMemberRole] = useState<string>("member");

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sortField, setSortField] = useState<"due_date" | "priority" | "status">("due_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc"); // Default earliest first

  // Mobile Tab State (for switching columns on smaller screens)
  const [activeTab, setActiveTab] = useState<"open" | "in_progress" | "completed">("open");

  // Modal Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [assignedTo, setAssignedTo] = useState("");
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

        // Fetch family members
        const { data: membersData } = await supabase
          .from("family_members")
          .select("user_id, display_name, role");

        if (membersData) {
          setFamilyMembers(membersData);
        }

        // Fetch tasks
        const { data: tasksData } = await supabase
          .from("tasks")
          .select("*")
          .eq("family_id", memberData.family_id);

        if (tasksData) {
          setTasks(tasksData);
        }
      } catch (err) {
        console.error("Error loading tasks page data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, router]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !familyId || !currentUser) return;

    setIsSubmitting(true);
    try {
      const { data: newTask, error } = await supabase
        .from("tasks")
        .insert({
          family_id: familyId,
          created_by: currentUser.id,
          assigned_to: assignedTo || null,
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate || null,
          priority,
          status: "open",
          is_personal: false
        })
        .select()
        .single();

      if (error) throw error;

      setTasks((prev) => [...prev, newTask]);
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority("medium");
      setAssignedTo("");
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create task:", err);
      alert("Failed to create task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error("Failed to delete task:", err);
      alert("Failed to delete task.");
    }
  };

  const handleUpdateStatus = async (taskId: string, nextStatus: "open" | "in_progress" | "completed") => {
    try {
      const completedAtVal = nextStatus === "completed" ? new Date().toISOString() : null;
      const { error } = await supabase
        .from("tasks")
        .update({ status: nextStatus, completed_at: completedAtVal })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: nextStatus, completed_at: completedAtVal } : t
        )
      );
    } catch (err) {
      console.error("Failed to update task status:", err);
      alert("Failed to update task status.");
    }
  };

  const toggleSort = (field: "due_date" | "priority" | "status") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Status Helper
  const getTaskStatusInfo = (task: any) => {
    if (task.status === "completed") {
      return {
        label: "Completed",
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        dotColor: "bg-emerald-500"
      };
    }
    const today = new Date().toISOString().slice(0, 10);
    if (task.due_date && task.due_date < today) {
      return {
        label: "Overdue",
        color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        dotColor: "bg-rose-500"
      };
    }
    if (task.status === "in_progress") {
      return {
        label: "In Progress",
        color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        dotColor: "bg-amber-500"
      };
    }
    return {
      label: "Upcoming",
      color: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      dotColor: "bg-slate-400"
    };
  };

  // Avatar Initials Helper
  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Avatar Color Helper
  const getAvatarColor = (name: string) => {
    if (!name) return "bg-surface-container text-on-surface-variant border-outline-variant/30";
    const colors = [
      "bg-primary/10 text-primary border-primary/20",
      "bg-tertiary/10 text-tertiary border-tertiary/20",
      "bg-secondary/10 text-secondary border-secondary/20",
      "bg-amber-500/10 text-amber-700 border-amber-500/20",
      "bg-purple-500/10 text-purple-700 border-purple-500/20",
      "bg-sky-500/10 text-sky-700 border-sky-500/20",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Filter & Sort tasks
  const filteredTasks = tasks
    .filter((task) => {
      const matchSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      const statusInfo = getTaskStatusInfo(task);
      const matchStatus =
        statusFilter === "all" ||
        statusInfo.label.toLowerCase().replace(" ", "_") === statusFilter;

      const matchPriority = priorityFilter === "all" || task.priority === priorityFilter;

      const matchAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" && !task.assigned_to) ||
        task.assigned_to === assigneeFilter;

      return matchSearch && matchStatus && matchPriority && matchAssignee;
    })
    .sort((a, b) => {
      let multiplier = sortDirection === "asc" ? 1 : -1;
      if (sortField === "due_date") {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return (new Date(a.due_date).getTime() - new Date(b.due_date).getTime()) * multiplier;
      } else if (sortField === "priority") {
        const pWeight = { high: 3, medium: 2, low: 1 };
        const valA = pWeight[a.priority as "high" | "medium" | "low"] || 2;
        const valB = pWeight[b.priority as "high" | "medium" | "low"] || 2;
        return (valA - valB) * multiplier;
      } else {
        const statWeight = { Overdue: 4, "In Progress": 3, Upcoming: 2, Completed: 1 };
        const valA = statWeight[getTaskStatusInfo(a).label as keyof typeof statWeight] || 0;
        const valB = statWeight[getTaskStatusInfo(b).label as keyof typeof statWeight] || 0;
        return (valA - valB) * multiplier;
      }
    });

  // Distribute tasks to board columns
  const openTasks = filteredTasks.filter((t) => t.status === "open");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-on-surface-variant font-medium">Gathering household chores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* ─── HEADER & STATISTICS ───────────────────────────────── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-quicksand text-3xl font-extrabold text-primary tracking-tight">
            Family Chores Board
          </h2>
          <p className="text-sm text-on-surface-variant mt-1.5 font-medium">
            Synchronize tasks and daily responsibilities across your household.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary/10 text-primary px-3.5 py-1.5 rounded-xl border border-primary/20">
            <Users className="h-3.5 w-3.5" />
            Active Members: {familyMembers.length}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-tertiary/10 text-tertiary px-3.5 py-1.5 rounded-xl border border-tertiary/20">
            Tasks Completed: {tasks.filter((t) => t.status === "completed").length}/{tasks.length}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-secondary/10 text-secondary px-3.5 py-1.5 rounded-xl border border-secondary/20">
            <AlertCircle className="h-3.5 w-3.5" />
            Overdue: {tasks.filter((t) => {
              const today = new Date().toISOString().slice(0, 10);
              return t.status !== "completed" && t.due_date && t.due_date < today;
            }).length}
          </span>
        </div>
      </section>

      {/* ─── FILTERS & SORT CONTROLS ───────────────────────────── */}
      <section className="glass-card rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between bg-surface-container-lowest border border-outline-variant/30">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant/60" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-surface-container-low border-outline-variant/30 text-xs h-9 rounded-xl focus:ring-1 focus:ring-primary w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9"
          >
            <option value="all">All Statuses</option>
            <option value="overdue">Overdue</option>
            <option value="in_progress">In Progress</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9"
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Normal Chores (Unassigned)</option>
            {familyMembers.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name} ({m.role})
              </option>
            ))}
          </select>

          <button
            onClick={() => toggleSort("due_date")}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all h-9 cursor-pointer active:scale-95 ${
              sortField === "due_date"
                ? "border-primary bg-primary/10 text-primary"
                : "border-outline-variant/30 bg-surface-container-low text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <span>Due Date</span>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => toggleSort("priority")}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all h-9 cursor-pointer active:scale-95 ${
              sortField === "priority"
                ? "border-primary bg-primary/10 text-primary"
                : "border-outline-variant/30 bg-surface-container-low text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <span>Priority</span>
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {/* ─── MOBILE COLUMN TOGGLE TABS ─────────────────────────── */}
      <div className="flex md:hidden border border-outline-variant/20 mb-4 bg-surface-container-lowest rounded-2xl p-1 gap-1 shadow-xs">
        {(["open", "in_progress", "completed"] as const).map((status) => {
          const count = status === "open" ? openTasks.length : status === "in_progress" ? inProgressTasks.length : completedTasks.length;
          const label = status === "open" ? "Open" : status === "in_progress" ? "In Progress" : "Completed";
          const active = activeTab === status;
          return (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all active:scale-[0.98] ${
                active
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* ─── KANBAN BOARD COLUMNS ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* OPEN COLUMN */}
        <div className={`flex flex-col gap-4 bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/15 ${activeTab === "open" ? "flex" : "hidden md:flex"}`}>
          <div className="flex items-center justify-between px-1 mb-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <h3 className="font-quicksand text-base font-bold text-on-surface">Open</h3>
              <span className="bg-surface-container-high px-2 py-0.5 rounded-full text-[10px] font-bold text-on-surface-variant">
                {openTasks.length}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            {openTasks.length === 0 ? (
              <div className="bg-surface-container-lowest/50 p-8 rounded-2xl text-center text-on-surface-variant/40 italic text-xs border border-dashed border-outline-variant/20 font-medium">
                No open chores.
              </div>
            ) : (
              openTasks.map((task) => renderTaskCard(task))
            )}
          </div>
        </div>

        {/* IN PROGRESS COLUMN */}
        <div className={`flex flex-col gap-4 bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/15 ${activeTab === "in_progress" ? "flex" : "hidden md:flex"}`}>
          <div className="flex items-center justify-between px-1 mb-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary-container" />
              <h3 className="font-quicksand text-base font-bold text-on-surface">In Progress</h3>
              <span className="bg-surface-container-high px-2 py-0.5 rounded-full text-[10px] font-bold text-on-surface-variant">
                {inProgressTasks.length}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            {inProgressTasks.length === 0 ? (
              <div className="bg-surface-container-lowest/50 p-8 rounded-2xl text-center text-on-surface-variant/40 italic text-xs border border-dashed border-outline-variant/20 font-medium">
                No chores in progress.
              </div>
            ) : (
              inProgressTasks.map((task) => renderTaskCard(task))
            )}
          </div>
        </div>

        {/* COMPLETED COLUMN */}
        <div className={`flex flex-col gap-4 bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/15 ${activeTab === "completed" ? "flex" : "hidden md:flex"}`}>
          <div className="flex items-center justify-between px-1 mb-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container" />
              <h3 className="font-quicksand text-base font-bold text-on-surface">Completed</h3>
              <span className="bg-surface-container-high px-2 py-0.5 rounded-full text-[10px] font-bold text-on-surface-variant">
                {completedTasks.length}
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            {completedTasks.length === 0 ? (
              <div className="bg-surface-container-lowest/50 p-8 rounded-2xl text-center text-on-surface-variant/40 italic text-xs border border-dashed border-outline-variant/20 font-medium">
                No completed chores.
              </div>
            ) : (
              completedTasks.map((task) => renderTaskCard(task))
            )}
          </div>
        </div>

      </div>

      {/* ─── FLOATING ACTION BUTTON ────────────────────────────── */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-secondary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 group cursor-pointer border-none"
        title="Add Family Chore"
      >
        <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* ─── ADD TASK MODAL ────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
            onClick={() => setShowCreateModal(false)} 
          />

          <form 
            onSubmit={handleCreateTask} 
            className="relative z-10 w-full max-w-lg bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <h3 className="font-quicksand text-lg font-bold text-primary flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Add Family Chore
              </h3>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/60 hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer border-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <Label htmlFor="taskTitle" className="text-[10px] font-bold uppercase tracking-wider text-primary">Task Title</Label>
              <Input
                id="taskTitle"
                type="text"
                placeholder="e.g. Clean the garage, wash dishes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-surface-container-low border-outline-variant/30 rounded-xl focus:border-primary text-xs h-10"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="taskDesc" className="text-[10px] font-bold uppercase tracking-wider text-primary">Description (Optional)</Label>
              <textarea
                id="taskDesc"
                rows={3}
                placeholder="Details of the chore..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors resize-none font-sans"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="taskDate" className="text-[10px] font-bold uppercase tracking-wider text-primary">Due Date</Label>
                <Input
                  id="taskDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-surface-container-low border-outline-variant/30 rounded-xl focus:border-primary text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="taskPriority" className="text-[10px] font-bold uppercase tracking-wider text-primary">Priority</Label>
                <select
                  id="taskPriority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors font-semibold h-10"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="taskAssign" className="text-[10px] font-bold uppercase tracking-wider text-primary">Assignee (Normal Chores if empty)</Label>
              <select
                id="taskAssign"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors font-semibold h-10"
              >
                <option value="">No assignment (Everyone)</option>
                {familyMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-primary hover:bg-primary-container text-white py-3 rounded-xl active:scale-[0.98] transition-all shadow-md font-sans text-xs font-bold uppercase tracking-widest cursor-pointer border-none h-11"
            >
              {isSubmitting ? "Creating Chore..." : "Create Chore"}
            </Button>
          </form>
        </div>
      )}

    </div>
  );

  // Render a Single Task Card
  function renderTaskCard(task: any) {
    const today = new Date().toISOString().slice(0, 10);
    const isOverdue = task.due_date && task.due_date < today && task.status !== "completed";
    const assignee = familyMembers.find((m) => m.user_id === task.assigned_to);

    return (
      <div
        key={task.id}
        className={`bg-surface-container-lowest p-5 rounded-2xl border hover:border-primary/30 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer group flex flex-col justify-between relative ${
          task.status === "completed"
            ? "opacity-75 grayscale-[0.2]"
            : task.priority === "high"
            ? "border-l-4 border-l-secondary border-outline-variant/20"
            : task.priority === "medium"
            ? "border-l-4 border-l-secondary-container border-outline-variant/20"
            : "border-l-4 border-l-outline-variant border-outline-variant/20"
        }`}
      >
        {/* Card Header (Priority Tag, Done / Overdue Indicators) */}
        <div className="flex justify-between items-start mb-3 gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            task.status === "completed"
              ? "bg-surface-container text-on-surface-variant/70"
              : task.priority === "high"
              ? "bg-secondary/10 text-secondary"
              : task.priority === "medium"
              ? "bg-secondary-container/10 text-secondary"
              : "bg-surface-container text-on-surface-variant"
          }`}>
            {task.priority}
          </span>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {task.status === "completed" ? (
              <span className="bg-tertiary/10 text-tertiary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Done
              </span>
            ) : isOverdue ? (
              <span className="bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Overdue
              </span>
            ) : task.status === "in_progress" ? (
              <span className="bg-secondary-container/15 text-secondary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-pulse" />
                Working
              </span>
            ) : null}
          </div>
        </div>

        {/* Title and Description */}
        <div className="mb-4">
          <h4 className={`font-quicksand text-base font-bold text-on-surface leading-snug mb-1 group-hover:text-primary transition-colors ${
            task.status === "completed" ? "line-through text-on-surface-variant/60" : ""
          }`}>
            {task.title}
          </h4>
          {task.description && (
            <p className="text-on-surface-variant text-xs line-clamp-2 font-medium leading-relaxed font-sans">
              {task.description}
            </p>
          )}
        </div>

        {/* Visual Progress Bar for In Progress Tasks */}
        {task.status === "in_progress" && (
          <div className="w-full bg-surface-container-high h-1.5 rounded-full mb-4 overflow-hidden">
            <div className="bg-secondary-container h-full w-3/4 rounded-full" />
          </div>
        )}

        {/* Footer (Due Date & Assignee Avatar badge) */}
        <div className="flex justify-between items-center pt-3 border-t border-outline-variant/15 mt-auto">
          <div className="flex items-center gap-1.5 text-on-surface-variant/75 text-xs font-semibold font-sans">
            <Calendar className={`h-3.5 w-3.5 ${isOverdue ? "text-rose-500" : "text-primary"}`} />
            <span>
              {task.due_date ? (
                new Date(task.due_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short"
                })
              ) : (
                <span className="italic opacity-50 font-normal">None</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {assignee ? (
              <div 
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${getAvatarColor(assignee.display_name || "")}`}
                title={`${assignee.display_name} (${assignee.role})`}
              >
                {getInitials(assignee.display_name || "")}
              </div>
            ) : (
              <span className="text-[10px] text-on-surface-variant/50 italic font-semibold font-sans">
                Household
              </span>
            )}
          </div>
        </div>

        {/* Tactile Task Action Buttons (Start/Pause, Complete, Reopen, Delete) */}
        <div className="flex items-center justify-end gap-1.5 mt-3.5 pt-3.5 border-t border-outline-variant/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 select-none">
          {task.status !== "completed" && (
            <>
              {task.status === "open" ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateStatus(task.id, "in_progress");
                  }}
                  className="flex items-center gap-1 py-1 px-2.5 bg-secondary/10 hover:bg-secondary text-secondary hover:text-white border-none text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer active:scale-95"
                  title="Start Task"
                >
                  <Play className="h-2.5 w-2.5" /> Start
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateStatus(task.id, "open");
                  }}
                  className="flex items-center gap-1 py-1 px-2.5 bg-surface-container-high hover:bg-surface-dim text-on-surface border-none text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer active:scale-95"
                  title="Pause Task"
                >
                  <RotateCcw className="h-2.5 w-2.5" /> Pause
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateStatus(task.id, "completed");
                }}
                className="flex items-center gap-1 py-1 px-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white border-none text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer active:scale-95"
                title="Complete Task"
              >
                <CheckCircle2 className="h-2.5 w-2.5" /> Complete
              </button>
            </>
          )}

          {task.status === "completed" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUpdateStatus(task.id, "open");
              }}
              className="flex items-center gap-1 py-1 px-2.5 bg-surface-container-high hover:bg-surface-dim text-on-surface border-none text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer active:scale-95"
              title="Re-open Task"
            >
              <RotateCcw className="h-2.5 w-2.5" /> Reopen
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTask(task.id);
            }}
            className="p-1.5 text-on-surface-variant/40 hover:text-secondary hover:bg-secondary/10 transition-all rounded-lg cursor-pointer border-none"
            title="Delete Task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

      </div>
    );
  }
}
