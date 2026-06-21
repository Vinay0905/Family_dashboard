import { createTaskSchema } from "@/lib/validations/tasks.schema";

export function TaskForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="space-y-5 rounded glass-card p-6 bg-surface-container-lowest border border-primary/10 h-fit">
      <div>
        <h3 className="font-heading text-lg font-bold text-on-surface mb-4 font-extrabold">Create New Task</h3>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Task Title</label>
        <input 
          name="title" 
          type="text"
          className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors" 
          placeholder="e.g. Clean the garage" 
          required 
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Description (Optional)</label>
        <textarea 
          name="description" 
          rows={3}
          className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors resize-none" 
          placeholder="Brief details about the task..." 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Due Date</label>
          <input 
            name="due_date" 
            type="date" 
            className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors" 
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Priority</label>
          <select 
            name="priority" 
            className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors" 
            defaultValue="medium"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <button 
        type="submit" 
        className="w-full mt-2 bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-widest py-3 rounded hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(183,0,79,0.15)] flex items-center justify-center gap-2 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[16px]">add_task</span>
        Create Task
      </button>
    </form>
  );
}

export function parseTaskForm(formData: FormData) {
  const dueDate = String(formData.get("due_date") || "");
  const desc = String(formData.get("description") || "").trim();
  
  return createTaskSchema.parse({
    title: String(formData.get("title")),
    description: desc || undefined,
    due_date: dueDate || undefined,
    priority: String(formData.get("priority")),
    is_personal: false,
  });
}