import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TaskForm, parseTaskForm } from "@/components/tasks/TaskForm";
import { TaskList } from "@/components/tasks/TaskList";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyForUser } from "@/services/dashboard.service";
import { createTask, getTasks } from "@/services/task.service";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const member = await getCurrentFamilyForUser(data.user.id);
  if (!member) redirect("/onboarding");

  const tasks = await getTasks(member.family_id);

  async function addTask(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const member = await getCurrentFamilyForUser(data.user.id);
    if (!member) return;
    await createTask(member.family_id, data.user.id, parseTaskForm(formData));
    revalidatePath("/tasks");
  }

  async function updateStatus(formData: FormData) {
    "use server";
    const taskId = String(formData.get("taskId"));
    const status = String(formData.get("status"));
    
    const supabase = await createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ 
        status: status as "open" | "in_progress" | "completed",
        completed_at: status === "completed" ? new Date().toISOString() : null 
      })
      .eq("id", taskId);

    if (error) console.error("Failed to update task status:", error);
    revalidatePath("/tasks");
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Family <span className="text-primary italic">Chores</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Synchronize tasks and daily responsibilities across your household.
          </p>
        </div>
      </section>

      {/* Grid Container */}
      <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Kanban Board columns */}
        <div>
          <TaskList tasks={tasks} updateStatusAction={updateStatus} />
        </div>

        {/* Sidebar Form */}
        <div>
          <TaskForm action={addTask} />
        </div>
      </section>
    </div>
  );
}