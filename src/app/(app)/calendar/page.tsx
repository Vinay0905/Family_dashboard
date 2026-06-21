import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EventForm, parseEventForm } from "@/components/calendar/EventForm";
import { createClient } from "@/lib/supabase/server";
import { createEvent, getEvents } from "@/services/event.service";
import { getCurrentFamilyForUser } from "@/services/dashboard.service";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const member = await getCurrentFamilyForUser(data.user.id);
  if (!member) redirect("/onboarding");

  // Determine current month range
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const from = new Date(year, month, 1).toISOString();
  const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  const events = await getEvents(member.family_id, from, to);

  async function addEvent(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const member = await getCurrentFamilyForUser(data.user.id);
    if (!member) return;
    await createEvent(member.family_id, data.user.id, parseEventForm(formData));
    revalidatePath("/calendar");
  }

  // Calculate calendar days
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { day: number | null; dateStr: string | null; isToday: boolean }[] = [];

  // Pad previous month offset
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({ day: null, dateStr: null, isToday: false });
  }

  // Current month days
  const today = new Date();
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const isToday =
      today.getDate() === d &&
      today.getMonth() === month &&
      today.getFullYear() === year;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateStr, isToday });
  }

  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  
  // Category colors
  const getBadgeStyle = (category: string) => {
    switch (category) {
      case "family":
        return "bg-primary/10 text-primary border-primary/20";
      case "school":
        return "bg-tertiary/10 text-tertiary border-tertiary/20";
      case "travel":
        return "bg-secondary/15 text-secondary border-secondary/30";
      case "medical":
        return "bg-error/10 text-error border-error/20";
      default:
        return "bg-on-surface-variant/10 text-on-surface-variant border-on-surface-variant/20";
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Family <span className="text-primary italic">Calendar</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Schedule school events, trips, or doctor visits together.
          </p>
        </div>
      </section>

      {/* Grid Container */}
      <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Calendar Box */}
        <div className="bg-surface-container-lowest border border-primary/15 rounded shadow-[0_4px_20px_rgba(183,0,79,0.03)] overflow-hidden">
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between p-4 bg-surface-container-low/50 border-b border-primary/10">
            <h2 className="font-heading font-extrabold text-xl text-primary">{monthLabel}</h2>
            <span className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant/60">
              {events.length} Events This Month
            </span>
          </div>

          {/* Days of Week Headers */}
          <div className="grid grid-cols-7 border-b border-primary/10 bg-surface-container-low/30">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-3 text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 auto-rows-[100px] md:auto-rows-[130px]">
            {cells.map((cell, idx) => {
              if (cell.day === null) {
                return (
                  <div key={`empty-${idx}`} className="border-r border-b border-primary/5 bg-surface-container-low/20" />
                );
              }

              // Filter events for this cell day
              const dayEvents = events.filter((e) => {
                const ed = new Date(e.start_at);
                return (
                  ed.getDate() === cell.day &&
                  ed.getMonth() === month &&
                  ed.getFullYear() === year
                );
              });

              return (
                <div
                  key={`day-${cell.day}`}
                  className={`border-r border-b border-primary/5 p-2 flex flex-col gap-1 hover:bg-primary/5 transition-colors group relative cursor-pointer overflow-y-auto ${
                    cell.isToday ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold ${cell.isToday ? "text-primary" : "text-on-surface-variant group-hover:text-primary"}`}>
                      {cell.day}
                    </span>
                    {cell.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>

                  {/* List of day events */}
                  <div className="space-y-1">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className={`px-1.5 py-0.5 rounded border text-[9px] font-bold truncate leading-tight ${getBadgeStyle(evt.category)}`}
                        title={`${evt.title} (${new Date(evt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                      >
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Form */}
        <div>
          <EventForm action={addEvent} />
        </div>
      </section>
    </div>
  );
}