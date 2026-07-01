"use client";

import { Calendar, Play, CheckCircle2, RotateCcw } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
};

type TaskListProps = {
  tasks: Task[];
  updateStatusAction: (formData: FormData) => Promise<void>;
};

export function TaskList({ tasks, updateStatusAction }: TaskListProps) {
  const openTasks = tasks.filter(t => t.status === "open");
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");
  const completedTasks = tasks.filter(t => t.status === "completed");

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-error/10 text-error border-error/25";
      case "medium":
        return "bg-primary/5 text-primary border-primary/20";
      default:
        return "bg-on-surface-variant/10 text-on-surface-variant border-on-surface-variant/20";
    }
  };

  const renderTaskCard = (task: Task) => (
    <div 
      key={task.id} 
      className="bg-surface-container-lowest border border-border/50 p-5 rounded hover:shadow-md hover:shadow-primary/5 hover:border-primary transition-all duration-300 group flex flex-col gap-3"
    >
      <div className="flex justify-between items-start">
        <span className={`text-[9px] font-bold tracking-wider px-2.5 py-0.5 rounded border uppercase ${getPriorityStyle(task.priority)}`}>
          {task.priority} Priority
        </span>
      </div>

      <div>
        <h4 className={`font-heading text-base font-bold leading-snug text-on-surface group-hover:text-primary transition-colors ${task.status === "completed" ? "line-through opacity-60" : ""}`}>
          {task.title}
        </h4>
        {task.description && (
          <p className="text-on-surface-variant text-xs mt-1.5 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-3 border-t border-border/30 mt-auto">
        <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-semibold">
          {task.due_date ? (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-primary" />
              <span>DUE: {new Date(task.due_date).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
            </div>
          ) : (
            <div className="opacity-40">No due date</div>
          )}
        </div>

        {/* Action Controls to switch status */}
        <div className="flex gap-2">
          {task.status === "open" && (
            <>
              <form action={updateStatusAction} className="flex-1">
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="status" value="in_progress" />
                <button 
                  type="submit" 
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2 bg-secondary/10 hover:bg-secondary text-secondary hover:text-secondary-foreground border border-secondary/20 hover:border-transparent text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                >
                  <Play className="h-2.5 w-2.5" /> Start
                </button>
              </form>
              <form action={updateStatusAction} className="flex-1">
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="status" value="completed" />
                <button 
                  type="submit" 
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 hover:border-transparent text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
                >
                  <CheckCircle2 className="h-2.5 w-2.5" /> Complete
                </button>
              </form>
            </>
          )}

          {task.status === "in_progress" && (
            <form action={updateStatusAction} className="w-full">
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="status" value="completed" />
              <button 
                type="submit" 
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-primary text-primary-foreground hover:opacity-90 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <CheckCircle2 className="h-2.5 w-2.5" /> Mark Completed
              </button>
            </form>
          )}

          {task.status === "completed" && (
            <form action={updateStatusAction} className="w-full">
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="status" value="open" />
              <button 
                type="submit" 
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-on-surface-variant/10 hover:bg-on-surface-variant text-on-surface-variant hover:text-background border border-border/25 hover:border-transparent text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
              >
                <RotateCcw className="h-2.5 w-2.5" /> Reopen Task
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {/* Open Column */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between px-2 py-1 border-b border-primary/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <h3 className="font-heading text-xs font-extrabold uppercase tracking-widest text-primary">Open Chores</h3>
          </div>
          <span className="font-sans text-[11px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
            {openTasks.length}
          </span>
        </div>
        <div className="space-y-4">
          {openTasks.length === 0 ? (
            <p className="text-xs text-on-surface-variant/50 italic px-2">No open tasks.</p>
          ) : (
            openTasks.map(renderTaskCard)
          )}
        </div>
      </div>

      {/* In Progress Column */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between px-2 py-1 border-b border-secondary/20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
            <h3 className="font-heading text-xs font-extrabold uppercase tracking-widest text-secondary">In Progress</h3>
          </div>
          <span className="font-sans text-[11px] font-bold bg-secondary/10 text-secondary px-2.5 py-0.5 rounded-full">
            {inProgressTasks.length}
          </span>
        </div>
        <div className="space-y-4">
          {inProgressTasks.length === 0 ? (
            <p className="text-xs text-on-surface-variant/50 italic px-2">No tasks in progress.</p>
          ) : (
            inProgressTasks.map(renderTaskCard)
          )}
        </div>
      </div>

      {/* Completed Column */}
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between px-2 py-1 border-b border-on-surface-variant/20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-on-surface-variant/40" />
            <h3 className="font-heading text-xs font-extrabold uppercase tracking-widest text-on-surface-variant">Completed</h3>
          </div>
          <span className="font-sans text-[11px] font-bold bg-on-surface-variant/10 text-on-surface-variant px-2.5 py-0.5 rounded-full">
            {completedTasks.length}
          </span>
        </div>
        <div className="space-y-4">
          {completedTasks.length === 0 ? (
            <p className="text-xs text-on-surface-variant/50 italic px-2">No completed tasks yet.</p>
          ) : (
            completedTasks.map(renderTaskCard)
          )}
        </div>
      </div>
    </div>
  );
}