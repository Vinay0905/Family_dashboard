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
          .select("user_id, display_name, role")
          .eq("family_id", memberData.family_id);

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

  // Rule 15 Status Helper
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Family <span className="text-primary italic">Chores</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Synchronize tasks and daily responsibilities across your household.
          </p>
        </div>
      </section>

      {/* Filter and Search Controls */}
      <section className="glass-card rounded p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant/60" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-surface-container-lowest border-outline-variant text-xs h-9 rounded"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9"
          >
            <option value="all">All Statuses</option>
            <option value="overdue">Overdue (Red)</option>
            <option value="in_progress">In Progress (Yellow)</option>
            <option value="upcoming">Upcoming (Grey)</option>
            <option value="completed">Completed (Green)</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9"
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Normal Tasks (Unassigned)</option>
            {familyMembers.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name} ({m.role})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Tabular Tasks Grid */}
      <div className="glass-card rounded shadow-sm overflow-hidden border border-primary/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low border-b border-primary/10 font-bold uppercase text-primary tracking-wider">
                <th className="p-3.5 pl-4">Task Details</th>
                <th className="p-3.5">Assigned To</th>
                <th 
                  onClick={() => toggleSort("priority")}
                  className="p-3.5 cursor-pointer hover:bg-primary/5 transition-colors select-none"
                >
                  <span className="items-center gap-1 inline-flex">
                    Priority <ArrowUpDown className="h-3 w-3 text-primary/60" />
                  </span>
                </th>
                <th 
                  onClick={() => toggleSort("due_date")}
                  className="p-3.5 cursor-pointer hover:bg-primary/5 transition-colors select-none"
                >
                  <span className="items-center gap-1 inline-flex">
                    Due Date <ArrowUpDown className="h-3 w-3 text-primary/60" />
                  </span>
                </th>
                <th 
                  onClick={() => toggleSort("status")}
                  className="p-3.5 cursor-pointer hover:bg-primary/5 transition-colors select-none"
                >
                  <span className="items-center gap-1 inline-flex">
                    Status <ArrowUpDown className="h-3 w-3 text-primary/60" />
                  </span>
                </th>
                <th className="p-3.5 pr-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-on-surface-variant/40 font-semibold italic bg-surface-container-lowest">
                    No tasks match your sorting/filtering criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const statusInfo = getTaskStatusInfo(task);
                  const assignee = familyMembers.find((m) => m.user_id === task.assigned_to);

                  return (
                    <tr 
                      key={task.id} 
                      className="bg-surface-container-lowest hover:bg-primary/[0.02] transition-colors"
                    >
                      <td className="p-3.5 pl-4 font-sans max-w-xs">
                        <div className="font-bold text-on-surface text-sm leading-snug">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-on-surface-variant text-xs mt-1 font-medium line-clamp-2">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-sans">
                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-on-surface">{assignee.display_name}</span>
                            <span className="text-[9px] uppercase font-bold text-on-surface-variant/60 bg-surface-container border border-outline-variant/30 px-1.5 py-0.5 rounded">
                              {assignee.role}
                            </span>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant/50 font-medium italic">Normal Chores</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${
                          task.priority === "high"
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            : task.priority === "medium"
                            ? "bg-primary/5 text-primary border-primary/20"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-on-surface">
                        {task.due_date ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-primary" />
                            {new Date(task.due_date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        ) : (
                          <span className="opacity-40 font-normal italic">None</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest ${statusInfo.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotColor}`} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-3.5 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {task.status !== "completed" && (
                            <>
                              {task.status === "open" ? (
                                <button
                                  onClick={() => handleUpdateStatus(task.id, "in_progress")}
                                  className="flex items-center gap-1 py-1 px-2.5 bg-secondary/15 hover:bg-secondary text-secondary hover:text-white border border-secondary/20 hover:border-transparent text-[9px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                                  title="Start Task"
                                >
                                  <Play className="h-2.5 w-2.5" /> Start
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateStatus(task.id, "open")}
                                  className="flex items-center gap-1 py-1 px-2.5 bg-slate-500/15 hover:bg-slate-600 text-slate-400 hover:text-white border border-slate-500/20 hover:border-transparent text-[9px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                                  title="Pause Task"
                                >
                                  <RotateCcw className="h-2.5 w-2.5" /> Pause
                                </button>
                              )}
                              <button
                                onClick={() => handleUpdateStatus(task.id, "completed")}
                                className="flex items-center gap-1 py-1 px-2.5 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-transparent text-[9px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                                title="Complete Task"
                              >
                                <CheckCircle2 className="h-2.5 w-2.5" /> Complete
                              </button>
                            </>
                          )}

                          {task.status === "completed" && (
                            <button
                              onClick={() => handleUpdateStatus(task.id, "open")}
                              className="flex items-center gap-1 py-1 px-2.5 bg-slate-500/10 hover:bg-slate-500 text-slate-400 hover:text-white border border-outline/10 hover:border-transparent text-[9px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                              title="Re-open Task"
                            >
                              <RotateCcw className="h-2.5 w-2.5" /> Reopen
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-on-surface-variant/40 hover:text-primary transition-all rounded hover:bg-primary/10 cursor-pointer"
                            title="Delete Task"
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

      {/* Log Chores trigger button */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary-container text-white px-8 h-12 gap-2 text-sm font-bold shadow-lg shadow-primary/20 rounded cursor-pointer animate-neon-text active:scale-95 transition-all"
        >
          <Plus className="h-5 w-5" /> Add Family Chore
        </Button>
      </div>

      {/* Add Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-xs" 
            onClick={() => setShowCreateModal(false)} 
          />

          <form 
            onSubmit={handleCreateTask} 
            className="relative z-10 w-full max-w-lg glass-card rounded p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-primary/10">
              <h3 className="font-heading text-lg font-bold text-primary flex items-center gap-2">
                <Clock className="h-5 w-5" /> Add Family Chore
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
              <Label htmlFor="taskTitle" className="text-[10px] font-bold uppercase tracking-wider text-primary">Task Title</Label>
              <Input
                id="taskTitle"
                type="text"
                placeholder="e.g. Clean the garage, wash dishes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
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
                className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors resize-none"
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
                  className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="taskPriority" className="text-[10px] font-bold uppercase tracking-wider text-primary">Priority</Label>
                <select
                  id="taskPriority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors font-semibold"
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
                className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors font-semibold"
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
              className="w-full mt-2 bg-primary hover:bg-primary-container text-white py-3 rounded active:scale-95 transition-all shadow-md font-sans text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              {isSubmitting ? "Creating Chore..." : "Create Chore"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}