"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  MapPin,
  CalendarDays,
  X,
} from "lucide-react";

type ViewMode = "day" | "month" | "yearly";

interface CalEvent {
  id: string;
  title: string;
  start_at: string;
  category: string;
  location?: string | null;
  description?: string | null;
}

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const CAT_STYLE: Record<string, string> = {
  family:   "bg-primary/15 text-primary border-primary/30",
  school:   "bg-purple-500/15 text-purple-700 border-purple-300",
  work:     "bg-blue-500/15 text-blue-700 border-blue-300",
  travel:   "bg-amber-500/15 text-amber-700 border-amber-300",
  medical:  "bg-rose-500/15 text-rose-700 border-rose-300",
  birthday: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  other:    "bg-slate-500/15 text-slate-600 border-slate-300",
};

const CAT_DOT: Record<string, string> = {
  family:   "bg-primary",
  school:   "bg-purple-500",
  work:     "bg-blue-500",
  travel:   "bg-amber-500",
  medical:  "bg-rose-500",
  birthday: "bg-emerald-500",
  other:    "bg-slate-400",
};

const CAT_OPTIONS = ["family","school","work","travel","birthday","medical","other"];

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

  const [loading, setLoading]       = useState(true);
  const [events, setEvents]         = useState<CalEvent[]>([]);
  const [familyId, setFamilyId]     = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode]     = useState<ViewMode>("month");

  // Right-panel form state
  const [formTitle, setFormTitle]         = useState("");
  const [formStartAt, setFormStartAt]     = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}T10:00`;
  });
  const [formCategory, setFormCategory]   = useState("family");
  const [formLocation, setFormLocation]   = useState("");
  const [formDesc, setFormDesc]           = useState("");
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [formMsg, setFormMsg]             = useState<string | null>(null);

  // ── Load data ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) { router.push("/login"); return; }

      const { data: memberData, error: memberError } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (memberError || !memberData) { router.push("/onboarding"); return; }

      setFamilyId(memberData.family_id);

      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("family_id", memberData.family_id)
        .order("start_at", { ascending: true });

      setEvents(eventsData ?? []);
    } catch (err) {
      console.error("Error loading calendar:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  // Keep form date in sync when selected date changes
  useEffect(() => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    setFormStartAt(`${y}-${m}-${d}T10:00`);
  }, [selectedDate]);

  // ── Helpers ──────────────────────────────────────────────────
  const eventsOnDate = (date: Date) =>
    events.filter((e) => isSameDay(new Date(e.start_at), date));

  const eventsInMonth = (year: number, month: number) =>
    events.filter((e) => {
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
          is_personal: false,
        })
        .select()
        .single();

      if (error) throw error;

      setEvents((prev) =>
        [...prev, newEvent as CalEvent].sort(
          (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
        )
      );

      // Reset form (keep date & category)
      setFormTitle("");
      setFormLocation("");
      setFormDesc("");
      setFormMsg("Event added!");
      setTimeout(() => setFormMsg(null), 2500);
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
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth    = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    const monthEvts = eventsInMonth(year, month);

    return (
      <div className="flex flex-col h-full">
        {/* Month header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/50 shrink-0">
          <div>
            <h2 className="font-heading font-extrabold text-lg text-primary leading-tight">
              {MONTHS[month]} {year}
            </h2>
            <p className="text-[10px] text-on-surface-variant font-semibold">
              {monthEvts.length} event{monthEvts.length !== 1 ? "s" : ""} this month
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate(-1)} className="w-7 h-7 rounded border border-outline-variant flex items-center justify-center hover:text-primary hover:border-primary transition-colors cursor-pointer">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button onClick={goToday} className="px-2.5 h-7 rounded border border-outline-variant text-[11px] font-bold hover:text-primary hover:border-primary transition-colors cursor-pointer">
              Today
            </button>
            <button onClick={() => navigate(1)} className="w-7 h-7 rounded border border-outline-variant flex items-center justify-center hover:text-primary hover:border-primary transition-colors cursor-pointer">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-outline-variant/50 shrink-0">
          {DAYS_SHORT.map((d) => (
            <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-wide text-on-surface-variant/60 border-r last:border-r-0 border-outline-variant/20">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 flex-1 overflow-hidden">
          {cells.map((date, idx) => {
            if (!date) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="border-r border-b last-col-no-border border-outline-variant/20 bg-surface-container-low/10"
                />
              );
            }

            const dayEvts  = eventsOnDate(date);
            const isSelected = isSameDay(date, selectedDate);
            const todayDay   = isToday(date);
            const isWeekend  = date.getDay() === 0 || date.getDay() === 6;

            return (
              <div
                key={`day-${date.toDateString()}`}
                onClick={() => setSelectedDate(date)}
                className={`border-r border-b border-outline-variant/20 p-1 flex flex-col cursor-pointer transition-colors overflow-hidden
                  ${isSelected ? "bg-primary/8 ring-1 ring-inset ring-primary/40" : "hover:bg-surface-container-low/30"}
                  ${isWeekend && !isSelected ? "bg-surface-container-low/15" : ""}
                `}
              >
                {/* Day number */}
                <span
                  className={`text-[11px] font-extrabold self-start w-6 h-6 flex items-center justify-center rounded-full mb-0.5 shrink-0
                    ${todayDay ? "bg-primary text-white" : isSelected ? "text-primary" : "text-on-surface"}
                  `}
                >
                  {date.getDate()}
                </span>

                {/* Event pills */}
                <div className="flex flex-col gap-px overflow-hidden">
                  {dayEvts.slice(0, 2).map((evt) => (
                    <button
                      key={evt.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedDate(date); }}
                      className={`w-full text-left text-[9px] font-bold px-1 py-px rounded truncate border ${CAT_STYLE[evt.category] ?? CAT_STYLE.other}`}
                    >
                      {evt.title}
                    </button>
                  ))}
                  {dayEvts.length > 2 && (
                    <span className="text-[9px] font-bold text-on-surface-variant/50 px-1">
                      +{dayEvts.length - 2}
                    </span>
                  )}
                </div>
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
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/50 shrink-0">
          <div>
            <h2 className="font-heading font-extrabold text-lg text-primary">
              {currentDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            <p className="text-[10px] text-on-surface-variant font-semibold">{dayEvts.length} event{dayEvts.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate(-1)} className="w-7 h-7 rounded border border-outline-variant flex items-center justify-center hover:text-primary cursor-pointer"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <button onClick={goToday} className="px-2.5 h-7 rounded border border-outline-variant text-[11px] font-bold hover:text-primary cursor-pointer">Today</button>
            <button onClick={() => navigate(1)} className="w-7 h-7 rounded border border-outline-variant flex items-center justify-center hover:text-primary cursor-pointer"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {Array.from({ length: 24 }, (_, h) => {
            const hEvts = evtsByHour[h] ?? [];
            const lbl = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
            return (
              <div key={h} className="flex border-b border-outline-variant/20 min-h-[52px]">
                <div className="w-14 shrink-0 px-2 pt-2 text-[10px] font-bold text-on-surface-variant/40 border-r border-outline-variant/20">{lbl}</div>
                <div className="flex-1 p-1 flex flex-col gap-1">
                  {hEvts.map((evt) => (
                    <div key={evt.id} className={`px-2 py-1 rounded border text-[11px] font-bold ${CAT_STYLE[evt.category] ?? CAT_STYLE.other}`}>
                      {new Date(evt.start_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} — {evt.title}
                    </div>
                  ))}
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
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/50 shrink-0">
          <h2 className="font-heading font-extrabold text-xl text-primary">{year}</h2>
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate(-1)} className="w-7 h-7 rounded border border-outline-variant flex items-center justify-center hover:text-primary cursor-pointer"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <button onClick={goToday} className="px-2.5 h-7 rounded border border-outline-variant text-[11px] font-bold hover:text-primary cursor-pointer">Now</button>
            <button onClick={() => navigate(1)} className="w-7 h-7 rounded border border-outline-variant flex items-center justify-center hover:text-primary cursor-pointer"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
          {MONTHS.map((monthName, mi) => {
            const monthEvts  = eventsInMonth(year, mi);
            const firstDay   = new Date(year, mi, 1).getDay();
            const daysInMonth = new Date(year, mi + 1, 0).getDate();
            const isCurrMonth = new Date().getFullYear() === year && new Date().getMonth() === mi;

            return (
              <div
                key={monthName}
                onClick={() => { setCurrentDate(new Date(year, mi, 1)); setViewMode("month"); }}
                className={`rounded border p-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all
                  ${isCurrMonth ? "border-primary bg-primary/5" : "border-outline-variant/50"}
                `}
              >
                <div className="flex justify-between items-center mb-2">
                  <p className={`text-xs font-bold ${isCurrMonth ? "text-primary" : "text-on-surface"}`}>{monthName}</p>
                  {monthEvts.length > 0 && (
                    <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">{monthEvts.length}</span>
                  )}
                </div>
                <div className="grid grid-cols-7 gap-px">
                  {["S","M","T","W","T","F","S"].map((d, i) => (
                    <span key={i} className="text-[8px] text-center font-bold text-on-surface-variant/30">{d}</span>
                  ))}
                  {Array.from({ length: firstDay }, (_, i) => <span key={`ep-${i}`} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const dn = i + 1;
                    const dd = new Date(year, mi, dn);
                    const hasEvt = eventsOnDate(dd).length > 0;
                    const tod = isToday(dd);
                    return (
                      <span key={dn} className={`text-[8px] text-center w-full aspect-square flex items-center justify-center rounded-full font-bold
                        ${tod ? "bg-primary text-white" : hasEvt ? "bg-primary/20 text-primary" : "text-on-surface/50"}
                      `}>{dn}</span>
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
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── TOP: Day's Event List ────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 border-b border-outline-variant/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold text-sm text-on-surface">{selLabel}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${dayEvts.length > 0 ? "bg-primary/10 text-primary" : "bg-surface-container text-on-surface-variant"}`}>
              {dayEvts.length} event{dayEvts.length !== 1 ? "s" : ""}
            </span>
          </div>

          {dayEvts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-on-surface-variant/40">
              <CalendarDays className="h-8 w-8 mb-2 stroke-[1.5]" />
              <p className="text-[11px] font-semibold">No events on this day</p>
              <p className="text-[10px] font-medium mt-0.5">Use the form below to add one</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dayEvts.map((evt) => (
                <div
                  key={evt.id}
                  className="group flex gap-2 items-start p-3 rounded border border-outline-variant/50 bg-surface-container-low/20 hover:border-primary transition-all"
                >
                  {/* Category stripe */}
                  <div className={`w-0.5 self-stretch rounded-full shrink-0 ${CAT_DOT[evt.category] ?? CAT_DOT.other}`} />

                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-on-surface truncate">{evt.title}</p>
                    <p className="text-[10px] text-on-surface-variant font-medium flex items-center gap-1 mt-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(evt.start_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {evt.location && (
                      <p className="text-[10px] text-on-surface-variant font-medium flex items-center gap-1 mt-0.5">
                        <MapPin className="h-2.5 w-2.5 text-secondary" />
                        <span className="truncate">{evt.location}</span>
                      </p>
                    )}
                    <span className={`inline-block mt-1 text-[8px] font-bold uppercase px-1.5 py-px rounded border ${CAT_STYLE[evt.category] ?? CAT_STYLE.other}`}>
                      {evt.category}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteEvent(evt.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/10 hover:text-rose-500 text-on-surface-variant/40 transition-all shrink-0 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── BOTTOM: Add Event Form ───────────────────────── */}
        <div className="shrink-0 p-4 overflow-y-auto" style={{ maxHeight: "55%" }}>
          <h3 className="font-heading font-extrabold text-sm text-primary mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Event
          </h3>

          <form onSubmit={handleAddEvent} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="eTitle" className="text-[9px] font-bold uppercase tracking-wider text-primary">Title *</Label>
              <Input
                id="eTitle"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Doctor appointment"
                required
                className="h-8 text-xs bg-surface-container-lowest border-outline-variant rounded focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="eDate" className="text-[9px] font-bold uppercase tracking-wider text-primary">Date & Time *</Label>
              <Input
                id="eDate"
                type="datetime-local"
                value={formStartAt}
                onChange={(e) => setFormStartAt(e.target.value)}
                required
                className="h-8 text-xs bg-surface-container-lowest border-outline-variant rounded focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="eCat" className="text-[9px] font-bold uppercase tracking-wider text-primary">Category</Label>
              <select
                id="eCat"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full h-8 rounded border border-outline-variant bg-surface-container-lowest px-2 text-xs text-on-surface focus:border-primary focus:outline-none"
              >
                {CAT_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="eLoc" className="text-[9px] font-bold uppercase tracking-wider text-primary">Location (optional)</Label>
              <Input
                id="eLoc"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="e.g. Apollo Hospital"
                className="h-8 text-xs bg-surface-container-lowest border-outline-variant rounded focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="eDesc" className="text-[9px] font-bold uppercase tracking-wider text-primary">Notes (optional)</Label>
              <textarea
                id="eDesc"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Any additional notes…"
                rows={2}
                className="w-full rounded border border-outline-variant bg-surface-container-lowest px-2 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none resize-none"
              />
            </div>

            {formMsg && (
              <p className={`text-[10px] font-bold px-2 py-1 rounded ${formMsg.includes("Failed") ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                {formMsg}
              </p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-8 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded cursor-pointer"
            >
              {isSubmitting ? "Saving…" : "Save Event"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* ── Page Header ────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl text-on-surface tracking-tight font-extrabold">
            Family <span className="text-primary italic">Calendar</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-1 font-medium">
            Schedule and track all your family events in one place.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-surface-container rounded p-1 border border-outline-variant">
          {(["day", "month", "yearly"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded px-4 py-1.5 text-xs font-bold capitalize transition-all cursor-pointer ${
                viewMode === mode
                  ? "bg-primary text-white shadow-sm"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {mode === "yearly" ? "Year" : mode === "month" ? "Month" : "Day"}
            </button>
          ))}
        </div>
      </section>

      {/* ── Main Area: 3/4 Calendar | 1/4 Panel ────────────── */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ minHeight: "calc(100vh - 220px)" }}>

        {/* Left: Calendar (3/4) */}
        <div className="glass-card rounded overflow-hidden flex flex-col" style={{ flex: "0 0 75%" }}>
          {viewMode === "month"  && <MonthView />}
          {viewMode === "day"    && <DayView />}
          {viewMode === "yearly" && <YearlyView />}
        </div>

        {/* Right: Panel (1/4) */}
        <div className="glass-card rounded overflow-hidden flex flex-col" style={{ flex: "0 0 calc(25% - 1rem)" }}>
          <RightPanel />
        </div>
      </div>
    </div>
  );
}