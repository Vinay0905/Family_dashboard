"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  MapPin,
  CalendarDays,
  X,
  Search,
  Lock,
} from "lucide-react";

type ViewMode = "day" | "month" | "yearly";

interface CalEvent {
  id: string;
  title: string;
  start_at: string;
  category: string;
  location?: string | null;
  description?: string | null;
  is_personal?: boolean;
}

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CAT_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  family:   { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary", border: "border-primary/20" },
  school:   { bg: "bg-purple-600/10", text: "text-purple-700", dot: "bg-purple-600", border: "border-purple-200" },
  work:     { bg: "bg-blue-600/10", text: "text-blue-700", dot: "bg-blue-600", border: "border-blue-200" },
  travel:   { bg: "bg-amber-600/10", text: "text-amber-700", dot: "bg-amber-600", border: "border-amber-200" },
  medical:  { bg: "bg-rose-600/10", text: "text-rose-700", dot: "bg-rose-600", border: "border-rose-200" },
  birthday: { bg: "bg-emerald-600/10", text: "text-emerald-700", dot: "bg-emerald-600", border: "border-emerald-200" },
  other:    { bg: "bg-slate-600/10", text: "text-slate-700", dot: "bg-slate-500", border: "border-slate-200" },
};

const CAT_OPTIONS = ["family", "school", "work", "travel", "birthday", "medical", "other"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(d: Date) {
  return isSameDay(d, new Date());
}

export default function CalendarPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Event creation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formStartAt, setFormStartAt] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}T10:00`;
  });
  const [formCategory, setFormCategory] = useState("family");
  const [formLocation, setFormLocation] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formIsPersonal, setFormIsPersonal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  // ── Load data ─────────────────────────────────────────────────
  const { familyId: cachedFamilyId, currentUser: cachedUser, isInitialized, setAppInfo } = useAppStore();

  // ── Load data ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      let activeFamilyId = cachedFamilyId;

      if (!isInitialized) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) { router.push("/login"); return; }

        const { data: memberData, error: memberError } = await supabase
          .from("family_members")
          .select("family_id, role")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (memberError || !memberData) { router.push("/onboarding"); return; }

        activeFamilyId = memberData.family_id;
        setFamilyId(memberData.family_id);

        // Fetch family members list
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
        setFamilyId(cachedFamilyId);
      }

      if (!activeFamilyId) return;

      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("family_id", activeFamilyId)
        .order("start_at", { ascending: true });

      setEvents(eventsData ?? []);
    } catch (err) {
      console.error("Error loading calendar:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router, cachedFamilyId, cachedUser, isInitialized, setAppInfo]);

  useEffect(() => { loadData(); }, [loadData]);

  // Keep form date in sync when selected date changes
  useEffect(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    setFormStartAt(`${y}-${m}-${d}T10:00`);
  }, [selectedDate]);

  // ── Search & Filter Helpers ─────────────────────────────────
  const filteredEvents = events.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      (e.description?.toLowerCase().includes(q) ?? false) ||
      (e.location?.toLowerCase().includes(q) ?? false) ||
      e.category.toLowerCase().includes(q)
    );
  });

  const eventsOnDate = (date: Date) =>
    filteredEvents.filter((e) => isSameDay(new Date(e.start_at), date));

  const eventsInMonth = (year: number, month: number) =>
    filteredEvents.filter((e) => {
      const d = new Date(e.start_at);
      return d.getFullYear() === year && d.getMonth() === month;
    });

  // ── Add event ────────────────────────────────────────────────
  async function handleAddEvent(ev: React.FormEvent) {
    ev.preventDefault();
    if (!formTitle || !formStartAt || !familyId) return;

    setIsSubmitting(true);
    setFormMsg(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: newEvent, error } = await supabase
        .from("events")
        .insert({
          family_id: familyId,
          created_by: userData.user.id,
          title: formTitle.trim(),
          start_at: new Date(formStartAt).toISOString(),
          category: formCategory as any,
          location: formLocation.trim() || null,
          description: formDesc.trim() || null,
          is_personal: formIsPersonal,
        })
        .select()
        .single();

      if (error) throw error;

      setEvents((prev) =>
        [...prev, newEvent as CalEvent].sort(
          (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
        )
      );

      // Reset form
      setFormTitle("");
      setFormLocation("");
      setFormDesc("");
      setFormIsPersonal(false);
      setFormMsg("Event saved!");
      setTimeout(() => {
        setFormMsg(null);
        setIsModalOpen(false);
      }, 1200);
    } catch (err) {
      console.error("Failed to add event:", err);
      setFormMsg("Failed to save — try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Delete event ─────────────────────────────────────────────
  async function handleDeleteEvent(eventId: string) {
    if (!confirm("Delete this event?")) return;
    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  }

  // ── Navigation ───────────────────────────────────────────────
  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else if (viewMode === "day") d.setDate(d.getDate() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setCurrentDate(d);
    if (viewMode === "day") setSelectedDate(d);
  };

  const goToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // ── MONTH VIEW ───────────────────────────────────────────────
  function MonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Date[] = [];
    
    // Overlapping days from previous month
    const prevMonthLastDate = new Date(year, month, 0);
    const prevDays = prevMonthLastDate.getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      cells.push(new Date(year, month - 1, prevDays - i));
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, month, d));
    }

    // Overlapping days from next month (pad grid to multiple of 7)
    let nextMonthDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push(new Date(year, month + 1, nextMonthDay++));
    }

    const monthEvts = eventsInMonth(year, month);

    return (
      <div className="flex flex-col h-full bg-surface-container-lowest">
        {/* Month header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant/20 shrink-0">
          <div>
            <h2 className="font-quicksand font-bold text-lg md:text-xl text-primary leading-tight">
              {MONTHS[month]} {year}
            </h2>
            <p className="text-[11px] text-on-surface-variant font-semibold">
              {monthEvts.length} event{monthEvts.length !== 1 ? "s" : ""} this month
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToday}
              className="px-3.5 h-8 rounded-full border border-outline-variant/30 text-xs font-bold text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all active:scale-95 cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => navigate(1)}
              className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all active:scale-95 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-outline-variant/20 shrink-0 bg-surface-container-low/20">
          {DAYS_SHORT.map((d) => (
            <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 border-r last:border-r-0 border-outline-variant/10">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar cells grid */}
        <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-outline-variant/10 border-b border-outline-variant/10 bg-surface-container-lowest">
          {cells.map((date, idx) => {
            const isCurrentMonth = date.getMonth() === month;
            const dayEvts = isCurrentMonth ? eventsOnDate(date) : [];
            const isSelected = isSameDay(date, selectedDate);
            const todayDay = isToday(date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <div
                key={`day-${date.toDateString()}-${idx}`}
                onClick={() => isCurrentMonth && setSelectedDate(date)}
                className={`p-2 flex flex-col cursor-pointer transition-all duration-150 min-h-[95px] md:min-h-[115px] relative overflow-hidden group select-none
                  ${!isCurrentMonth ? "bg-surface-container-low/30 opacity-40 cursor-default" : ""}
                  ${isCurrentMonth && isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : isCurrentMonth ? "hover:bg-surface-container-low/30" : ""}
                  ${isCurrentMonth && isWeekend && !isSelected ? "bg-surface-container-low/10" : ""}
                `}
              >
                {/* Day number label */}
                <span
                  className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 shrink-0 transition-all
                    ${todayDay ? "bg-primary text-on-primary shadow-xs" : isSelected && isCurrentMonth ? "text-primary font-extrabold" : "text-on-surface/80"}
                  `}
                >
                  {date.getDate()}
                </span>

                {/* Event pills list */}
                {isCurrentMonth && (
                  <div className="flex flex-col gap-1 overflow-hidden">
                    {dayEvts.slice(0, 3).map((evt) => {
                      const cat = CAT_COLORS[evt.category] ?? CAT_COLORS.other;
                      return (
                        <button
                          key={evt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(date);
                          }}
                          className={`w-full text-left text-[9px] font-semibold px-2 py-0.5 rounded-full truncate border transition-all active:scale-[0.98] ${cat.bg} ${cat.text} ${cat.border}`}
                          title={evt.title}
                        >
                          {evt.title}
                        </button>
                      );
                    })}
                    {dayEvts.length > 3 && (
                      <span className="text-[9px] font-bold text-on-surface-variant/50 px-2 mt-0.5">
                        +{dayEvts.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── DAY VIEW ─────────────────────────────────────────────────
  function DayView() {
    const dayEvts = eventsOnDate(currentDate);
    const evtsByHour: Record<number, CalEvent[]> = {};
    dayEvts.forEach((e) => {
      const h = new Date(e.start_at).getHours();
      if (!evtsByHour[h]) evtsByHour[h] = [];
      evtsByHour[h].push(e);
    });

    return (
      <div className="flex flex-col h-full bg-surface-container-lowest">
        <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant/20 shrink-0">
          <div>
            <h2 className="font-quicksand font-bold text-lg md:text-xl text-primary leading-tight">
              {currentDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </h2>
            <p className="text-[11px] text-on-surface-variant font-semibold">
              {dayEvts.length} event{dayEvts.length !== 1 ? "s" : ""} scheduled
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToday}
              className="px-3.5 h-8 rounded-full border border-outline-variant/30 text-xs font-bold text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all active:scale-95 cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => navigate(1)}
              className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all active:scale-95 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-outline-variant/10 max-h-[500px] custom-scrollbar">
          {Array.from({ length: 24 }, (_, h) => {
            const hEvts = evtsByHour[h] ?? [];
            const lbl = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
            return (
              <div key={h} className="flex min-h-[56px] group hover:bg-surface-container-low/10 transition-colors">
                <div className="w-16 shrink-0 px-3 pt-2.5 text-[10px] font-bold text-on-surface-variant/40 border-r border-outline-variant/15 text-right select-none">
                  {lbl}
                </div>
                <div className="flex-1 p-2 flex flex-col gap-1 justify-center">
                  {hEvts.length === 0 ? (
                    <div className="text-[9px] text-on-surface-variant/20 italic pl-2 opacity-0 group-hover:opacity-100 transition-opacity">No events</div>
                  ) : (
                    hEvts.map((evt) => {
                      const cat = CAT_COLORS[evt.category] ?? CAT_COLORS.other;
                      return (
                        <div
                          key={evt.id}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs ${cat.bg} ${cat.text} ${cat.border}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${cat.dot}`} />
                            <span>
                              {new Date(evt.start_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} — {evt.title}
                            </span>
                            {evt.location && (
                              <span className="text-[10px] opacity-70 flex items-center gap-0.5 ml-2 font-medium">
                                <MapPin className="h-3 w-3" /> {evt.location}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteEvent(evt.id)}
                            className="p-1 rounded-full text-on-surface-variant/40 hover:text-rose-600 hover:bg-rose-50/50 active:scale-95 transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── YEARLY VIEW ──────────────────────────────────────────────
  function YearlyView() {
    const year = currentDate.getFullYear();
    return (
      <div className="flex flex-col h-full bg-surface-container-lowest">
        <div className="flex justify-between items-center px-6 py-4 border-b border-outline-variant/20 shrink-0">
          <h2 className="font-quicksand font-bold text-xl text-primary">{year}</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToday}
              className="px-3.5 h-8 rounded-full border border-outline-variant/30 text-xs font-bold text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all active:scale-95 cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => navigate(1)}
              className="w-8 h-8 rounded-full border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-all active:scale-95 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 overflow-y-auto max-h-[500px] custom-scrollbar">
          {MONTHS.map((monthName, mi) => {
            const monthEvts = eventsInMonth(year, mi);
            const firstDay = new Date(year, mi, 1).getDay();
            const daysInMonth = new Date(year, mi + 1, 0).getDate();
            const isCurrMonth = new Date().getFullYear() === year && new Date().getMonth() === mi;

            const miniCells: (number | null)[] = [];
            for (let i = 0; i < firstDay; i++) miniCells.push(null);
            for (let d = 1; d <= daysInMonth; d++) miniCells.push(d);

            return (
              <div
                key={monthName}
                onClick={() => {
                  setCurrentDate(new Date(year, mi, 1));
                  setViewMode("month");
                }}
                className={`rounded-2xl border p-4 cursor-pointer hover:border-primary hover:bg-primary/5 hover:shadow-sm transition-all duration-200 bg-surface-container-lowest
                  ${isCurrMonth ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-outline-variant/30"}
                `}
              >
                <div className="flex justify-between items-center mb-3">
                  <p className={`text-xs font-bold uppercase tracking-wider ${isCurrMonth ? "text-primary" : "text-on-surface"}`}>{monthName}</p>
                  {monthEvts.length > 0 && (
                    <span className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                      {monthEvts.length}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-7 gap-y-1 gap-x-0.5">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <span key={i} className="text-[8px] text-center font-bold text-on-surface-variant/30">{d}</span>
                  ))}
                  {miniCells.map((dn, idx) => {
                    if (dn === null) return <span key={`ep-${idx}`} />;
                    const dd = new Date(year, mi, dn);
                    const hasEvt = eventsOnDate(dd).length > 0;
                    const tod = isToday(dd);
                    return (
                      <span
                        key={`day-${dn}`}
                        className={`text-[8px] text-center w-4.5 h-4.5 mx-auto flex items-center justify-center rounded-full font-bold
                          ${tod ? "bg-primary text-on-primary shadow-xs" : hasEvt ? "bg-primary/15 text-primary font-bold" : "text-on-surface/40"}
                        `}
                      >
                        {dn}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── RIGHT PANEL ──────────────────────────────────────────────
  function RightPanel() {
    const dayEvts = eventsOnDate(selectedDate);
    const selLabel = selectedDate.toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "long",
    });

    return (
      <div className="flex flex-col h-full gap-4">
        {/* Selected date header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div>
            <h3 className="font-quicksand font-bold text-sm text-on-surface">{selLabel}</h3>
            <p className="text-[10px] text-on-surface-variant/70 font-semibold mt-0.5">Selected Date</p>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${dayEvts.length > 0 ? "bg-primary/10 text-primary border-primary/20" : "bg-surface-container text-on-surface-variant border-outline-variant/10"}`}>
            {dayEvts.length} event{dayEvts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Selected Day's Event List */}
        <div className="flex-grow overflow-y-auto space-y-3 pr-1 max-h-[350px] lg:max-h-[440px] custom-scrollbar">
          {dayEvts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-on-surface-variant/40">
              <CalendarDays className="h-8 w-8 mb-2 stroke-[1.5] text-on-surface-variant/30" />
              <p className="text-xs font-semibold">No events on this day</p>
              <p className="text-[10px] font-medium mt-0.5">Click Add Event to save one</p>
            </div>
          ) : (
            dayEvts.map((evt) => {
              const cat = CAT_COLORS[evt.category] ?? CAT_COLORS.other;
              return (
                <div
                  key={evt.id}
                  className="group flex gap-2 items-start p-3 rounded-2xl border border-outline-variant/15 bg-surface-container-low/20 hover:border-primary/30 hover:bg-surface-container-low/40 transition-all duration-200"
                >
                  {/* Category stripe indicator */}
                  <div className={`w-1 self-stretch rounded-full shrink-0 ${cat.dot}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-on-surface truncate">{evt.title}</p>
                      {evt.is_personal && (
                        <span title="Private event" className="inline-flex shrink-0">
                          <Lock className="h-2.5 w-2.5 text-on-surface-variant/50" />
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-on-surface-variant font-semibold flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-on-surface-variant/60" />
                      {new Date(evt.start_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    
                    {evt.location && (
                      <p className="text-[10px] text-on-surface-variant font-medium flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-secondary/70" />
                        <span className="truncate">{evt.location}</span>
                      </p>
                    )}

                    {evt.description && (
                      <p className="text-[10px] text-on-surface-variant/70 mt-1 pl-1.5 border-l border-outline-variant/30 leading-relaxed italic truncate" title={evt.description}>
                        {evt.description}
                      </p>
                    )}
                    
                    <span className={`inline-block mt-2 text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${cat.bg} ${cat.text} ${cat.border}`}>
                      {evt.category}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteEvent(evt.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-rose-50/50 hover:text-rose-500 text-on-surface-variant/40 transition-all shrink-0 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Quick action button to trigger creation dialog modal */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full py-2.5 bg-primary text-on-primary hover:bg-primary/95 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 shadow-sm mt-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Event
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-on-surface-variant font-medium">Loading calendar events…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ────────────────────────────────────── */}
      <section className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <h1 className="font-quicksand text-3xl font-extrabold text-on-surface tracking-tight">
            Family <span className="text-primary italic">Calendar</span>
          </h1>
          <p className="text-xs md:text-sm text-on-surface-variant font-medium">
            Schedule and track all your family events in one place.
          </p>
        </div>

        {/* View Mode Toggle / Search / New Event Header Section */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:w-48 md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 h-4 w-4" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/10 text-xs rounded-full pl-9 pr-4 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-on-surface transition-all"
              placeholder="Search events..."
              type="text"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* View Toggles */}
          <div className="flex bg-surface-container-low p-1 rounded-full border border-outline-variant/10 select-none">
            {(["day", "month", "yearly"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-full px-4 py-1.5 text-[10px] font-bold capitalize transition-all duration-200 active:scale-95 cursor-pointer ${
                  viewMode === mode
                    ? "bg-primary text-on-primary shadow-xs"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {mode === "yearly" ? "Year" : mode === "month" ? "Month" : "Day"}
              </button>
            ))}
          </div>

          {/* New Event CTA button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 bg-secondary text-on-secondary px-4 py-1.5 rounded-full text-[10px] font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Event</span>
          </button>
        </div>
      </section>

      {/* ── Main Area: 3/4 Calendar | 1/4 Panel ────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left: Active View Calendar Container */}
        <div className="flex-grow w-full bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden flex flex-col">
          {viewMode === "month"  && <MonthView />}
          {viewMode === "day"    && <DayView />}
          {viewMode === "yearly" && <YearlyView />}
        </div>

        {/* Right: Quick selected date info side-panel */}
        <div className="w-full lg:w-80 shrink-0 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm p-5 self-stretch">
          <RightPanel />
        </div>
      </div>

      {/* ── Event Creation Dialog Modal ──────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Box */}
          <div className="relative bg-surface-container-lowest w-full max-w-md rounded-2xl border border-outline-variant/30 shadow-xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-primary-container/10">
              <h3 className="font-quicksand font-bold text-base text-primary">Create New Event</h3>
              <button
                className="text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container p-1 rounded-full transition-all"
                onClick={() => setIsModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddEvent} className="p-5 space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label htmlFor="eTitle" className="block text-[10px] font-bold uppercase tracking-wider text-primary">
                  Event Title *
                </label>
                <input
                  id="eTitle"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Family Pizza Night"
                  required
                  className="w-full border border-outline-variant/30 rounded-xl px-3 py-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none bg-surface-container-low text-on-surface transition-all"
                />
              </div>

              {/* Start Date & Time */}
              <div className="space-y-1">
                <label htmlFor="eDate" className="block text-[10px] font-bold uppercase tracking-wider text-primary">
                  Start Date & Time *
                </label>
                <input
                  id="eDate"
                  type="datetime-local"
                  value={formStartAt}
                  onChange={(e) => setFormStartAt(e.target.value)}
                  required
                  className="w-full border border-outline-variant/30 rounded-xl px-3 py-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none bg-surface-container-low text-on-surface transition-all"
                />
              </div>

              {/* Category selector */}
              <div className="space-y-1">
                <label htmlFor="eCat" className="block text-[10px] font-bold uppercase tracking-wider text-primary">
                  Category
                </label>
                <select
                  id="eCat"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full border border-outline-variant/30 rounded-xl px-3 py-2 text-xs focus:border-primary focus:outline-none bg-surface-container-low text-on-surface transition-all"
                >
                  {CAT_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label htmlFor="eLoc" className="block text-[10px] font-bold uppercase tracking-wider text-primary">
                  Location (optional)
                </label>
                <input
                  id="eLoc"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. Apollo Hospital"
                  className="w-full border border-outline-variant/30 rounded-xl px-3 py-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none bg-surface-container-low text-on-surface transition-all"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label htmlFor="eDesc" className="block text-[10px] font-bold uppercase tracking-wider text-primary">
                  Notes (optional)
                </label>
                <textarea
                  id="eDesc"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Any additional notes…"
                  rows={2}
                  className="w-full border border-outline-variant/30 rounded-xl px-3 py-2 text-xs focus:border-primary focus:outline-none bg-surface-container-low text-on-surface transition-all resize-none"
                />
              </div>

              {/* Private switch */}
              <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/15 select-none">
                <input
                  id="is_personal"
                  type="checkbox"
                  checked={formIsPersonal}
                  onChange={(e) => setFormIsPersonal(e.target.checked)}
                  className="w-4 h-4 rounded text-primary border-outline-variant/40 focus:ring-primary bg-surface-container-low cursor-pointer"
                />
                <label htmlFor="is_personal" className="text-xs text-on-surface font-semibold select-none cursor-pointer">
                  Private (only visible to me)
                </label>
              </div>

              {formMsg && (
                <p className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border ${formMsg.includes("Failed") ? "bg-rose-500/10 text-rose-700 border-rose-500/20" : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"}`}>
                  {formMsg}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/15">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-full text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-full bg-secondary text-on-secondary hover:bg-secondary/95 text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  {isSubmitting ? "Saving…" : "Save Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
