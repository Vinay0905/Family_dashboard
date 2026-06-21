"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Clock, 
  MapPin, 
  Sparkles 
} from "lucide-react";

export default function CalendarPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"monthly" | "weekly" | "daily" | "yearly">("monthly");

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [category, setCategory] = useState("family");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          router.push("/login");
          return;
        }

        // Fetch family member profile
        const { data: memberData, error: memberError } = await supabase
          .from("family_members")
          .select("family_id")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (memberError || !memberData) {
          router.push("/onboarding");
          return;
        }

        setFamilyId(memberData.family_id);

        // Fetch events
        const { data: eventsData } = await supabase
          .from("events")
          .select("*")
          .eq("family_id", memberData.family_id)
          .order("start_at", { ascending: true });

        if (eventsData) {
          setEvents(eventsData);
        }
      } catch (err) {
        console.error("Error loading calendar events:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, router]);

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !startAt || !familyId) return;

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: newEvent, error } = await supabase
        .from("events")
        .insert({
          family_id: familyId,
          created_by: userData.user.id,
          title: title.trim(),
          start_at: new Date(startAt).toISOString(),
          category: category as any,
          location: location.trim() || null,
          description: description.trim() || null,
          is_personal: false,
        })
        .select()
        .single();

      if (error) throw error;

      setEvents((prev) => [...prev, newEvent].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()));
      
      // Reset form
      setTitle("");
      setStartAt("");
      setCategory("family");
      setLocation("");
      setDescription("");
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to add event:", err);
      alert("Failed to add event.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert("Failed to delete event.");
    }
  }

  const navigateMonth = (direction: number) => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1);
    setCurrentDate(nextDate);
  };

  const selectDate = (day: number) => {
    const newSelected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newSelected);
    // Pre-fill form startAt date (converting current selected date to YYYY-MM-DDTHH:MM local format)
    const yearStr = newSelected.getFullYear();
    const monthStr = String(newSelected.getMonth() + 1).padStart(2, "0");
    const dayStr = String(newSelected.getDate()).padStart(2, "0");
    setStartAt(`${yearStr}-${monthStr}-${dayStr}T10:00`);
  };

  // Render Helpers
  const getBadgeStyle = (cat: string) => {
    switch (cat) {
      case "family":
        return "bg-primary/10 text-primary border-primary/20";
      case "school":
        return "bg-tertiary/10 text-tertiary border-tertiary/20";
      case "work":
        return "bg-secondary/10 text-secondary border-secondary/20";
      case "travel":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "medical":
        return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case "birthday":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Monthly Calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    cells.push(d);
  }

  const monthLabel = currentDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // Filter events for the currently selected date
  const selectedDateEvents = events.filter((e) => {
    const ed = new Date(e.start_at);
    return (
      ed.getDate() === selectedDate.getDate() &&
      ed.getMonth() === selectedDate.getMonth() &&
      ed.getFullYear() === selectedDate.getFullYear()
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Family <span className="text-primary italic">Calendar</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Schedule school events, trips, or doctor visits together.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-surface-container rounded p-1 border border-outline-variant">
          {(["monthly", "weekly", "daily", "yearly"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded px-3 py-1.5 text-xs font-bold capitalize transition-all cursor-pointer ${
                viewMode === mode
                  ? "bg-primary text-white shadow-sm"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </section>

      {/* Main Grid: Mini Calendar on the Left, Timeline Agenda on the Right */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        
        {/* Left Side: Navigation Month & Mini-Calendar Grid */}
        <div className="space-y-4">
          <div className="glass-card rounded p-4 shadow-sm">
            {/* Header controls */}
            <div className="flex items-center justify-between pb-3 border-b border-primary/10 mb-4">
              <button 
                onClick={() => navigateMonth(-1)}
                className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center text-on-surface hover:text-primary transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="font-heading font-bold text-base text-primary">{monthLabel}</h3>
              <button 
                onClick={() => navigateMonth(1)}
                className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center text-on-surface hover:text-primary transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Grid days title */}
            <div className="grid grid-cols-7 text-center mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i} className="text-[10px] font-bold text-on-surface-variant/60 uppercase">{d}</span>
              ))}
            </div>

            {/* Grid Cells */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-9" />;
                }

                const isSelected = 
                  selectedDate.getDate() === day &&
                  selectedDate.getMonth() === month &&
                  selectedDate.getFullYear() === year;

                const dateEvents = events.filter((e) => {
                  const ed = new Date(e.start_at);
                  return (
                    ed.getDate() === day &&
                    ed.getMonth() === month &&
                    ed.getFullYear() === year
                  );
                });

                return (
                  <button
                    key={`day-${day}`}
                    onClick={() => selectDate(day)}
                    className={`h-9 flex flex-col items-center justify-center rounded text-xs font-bold transition-all relative cursor-pointer ${
                      isSelected
                        ? "bg-primary text-white shadow-md shadow-primary/20 scale-105"
                        : "text-on-surface hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    <span>{day}</span>
                    {dateEvents.length > 0 && (
                      <span className={`w-1 h-1 rounded-full absolute bottom-1 ${isSelected ? "bg-white" : "bg-primary"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="glass-card rounded p-4 shadow-sm flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant">Add item on selected date</span>
            <Button
              onClick={() => {
                // Ensure date string is pre-populated
                const yearStr = selectedDate.getFullYear();
                const monthStr = String(selectedDate.getMonth() + 1).padStart(2, "0");
                const dayStr = String(selectedDate.getDate()).padStart(2, "0");
                setStartAt(`${yearStr}-${monthStr}-${dayStr}T10:00`);
                setShowAddForm(!showAddForm);
              }}
              className="bg-primary hover:bg-primary-container text-white gap-1 text-xs font-bold h-9 rounded cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" /> Add Event
            </Button>
          </div>

          {/* Add Event Form Slide Drop */}
          {showAddForm && (
            <form onSubmit={handleAddEvent} className="glass-card rounded p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
              <h4 className="font-heading font-extrabold text-sm text-primary pb-2 border-b border-primary/10">New Event</h4>
              
              <div className="space-y-1">
                <Label htmlFor="eventTitle" className="text-[10px] font-bold uppercase tracking-wider text-primary">Event Title</Label>
                <Input
                  id="eventTitle"
                  type="text"
                  placeholder="e.g. Dentist checkup"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="eventDate" className="text-[10px] font-bold uppercase tracking-wider text-primary">Date & Time</Label>
                <Input
                  id="eventDate"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="eventCat" className="text-[10px] font-bold uppercase tracking-wider text-primary">Category</Label>
                <select
                  id="eventCat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors font-medium"
                >
                  <option value="family">Family</option>
                  <option value="school">School</option>
                  <option value="work">Work</option>
                  <option value="travel">Travel</option>
                  <option value="birthday">Birthday</option>
                  <option value="medical">Medical</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="eventLoc" className="text-[10px] font-bold uppercase tracking-wider text-primary">Location (Optional)</Label>
                <Input
                  id="eventLoc"
                  type="text"
                  placeholder="e.g. Apollo Hospital"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs font-medium"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="h-8 text-xs font-bold border-outline-variant"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary-container text-white h-8 text-xs font-bold rounded cursor-pointer"
                >
                  {isSubmitting ? "Adding..." : "Save Event"}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Right Side: Timeline Agenda spanning top-to-bottom for the Selected Date */}
        <div className="glass-card rounded p-6 shadow-sm flex flex-col justify-between min-h-[400px]">
          <div>
            <div className="flex justify-between items-center border-b border-primary/10 pb-3 mb-6">
              <h3 className="font-heading text-xl font-bold text-on-surface">
                Agenda for <span className="text-primary italic">{selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
              </h3>
              <span className="inline-flex rounded bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {selectedDateEvents.length} {selectedDateEvents.length === 1 ? "Event" : "Events"}
              </span>
            </div>

            {/* List of Events timeline style */}
            {selectedDateEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-on-surface-variant/40">
                <CalendarDays className="h-10 w-10 mb-3 stroke-[1.5]" />
                <p className="text-sm font-bold">No family events scheduled for this date.</p>
                <p className="text-xs font-medium mt-1">Click "Add Event" to schedule something.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateEvents.map((evt) => {
                  const eventTime = new Date(evt.start_at).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div 
                      key={evt.id} 
                      className="group flex gap-4 items-start p-4 rounded border border-outline-variant/60 bg-surface-container-low/20 hover:bg-surface-container-low/40 hover:border-primary transition-all duration-300 relative"
                    >
                      {/* Left: Time badge */}
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary shrink-0 pt-0.5">
                        <Clock className="h-4 w-4" />
                        <span>{eventTime}</span>
                      </div>

                      {/* Middle: Content details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-sans text-sm font-bold text-on-surface truncate">{evt.title}</h4>
                          <span className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getBadgeStyle(evt.category)}`}>
                            {evt.category}
                          </span>
                        </div>
                        
                        {evt.location && (
                          <div className="flex items-center gap-1 mt-1 text-[11px] text-on-surface-variant font-medium">
                            <MapPin className="h-3 w-3 shrink-0 text-secondary" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                        )}
                        {evt.description && (
                          <p className="text-xs text-on-surface-variant font-medium mt-1.5 leading-relaxed">{evt.description}</p>
                        )}
                      </div>

                      {/* Right: Delete button (hover) */}
                      <button
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-primary/10 hover:text-primary text-on-surface-variant/40 shrink-0 cursor-pointer"
                        title="Delete Event"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}