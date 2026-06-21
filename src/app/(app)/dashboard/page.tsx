"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  CheckSquare,
  ShoppingCart,
  CalendarDays,
  TrendingUp,
  Wrench,
  CreditCard,
  Plane,
  FileText,
  Sun,
  Moon,
  Sparkles,
  Clock,
  AlertTriangle,
  CircleDot,
} from "lucide-react";

interface DashboardData {
  displayName: string;
  familyName: string;
  todayEvents: number;
  openTasks: number;
  shoppingItems: number;
  expensesTotal: number;
  expenseSparkline: number[];
  upcomingEvents: { id: string; title: string; start_at: string; category: string }[];
  recentTasks: { id: string; title: string; status: string; due_date: string | null }[];
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: Sun, emoji: "☀️" };
  if (hour < 18) return { text: "Good afternoon", icon: Sun, emoji: "🌤️" };
  return { text: "Good evening", icon: Moon, emoji: "🌙" };
}

/* ─── Sparkline SVG ─────────────────────────────────────────── */
function Sparkline({ data, color = "#b7004f", height = 80 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length < 2) {
    return (
      <svg className="w-full" style={{ height }} viewBox="0 0 100 40" preserveAspectRatio="none">
        <line x1="0" y1="20" x2="100" y2="20" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.25" />
        <text x="50" y="28" textAnchor="middle" fill={color} fontSize="6" opacity="0.4">No data yet</text>
      </svg>
    );
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 36 - ((v - min) / range) * 30,
  }));

  // Smooth curve using quadratic bezier
  let pathD = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1].x + pts[i].x) / 2;
    pathD += ` Q ${cpx},${pts[i - 1].y} ${pts[i].x},${pts[i].y}`;
  }
  const areaD = `${pathD} L 100,40 L 0,40 Z`;
  const lastPt = pts[pts.length - 1];

  return (
    <svg className="w-full" style={{ height }} viewBox="0 0 100 40" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkArea" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.02 }} />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkArea)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPt.x} cy={lastPt.y} r="2.5" fill="white" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

/* ─── Style maps ────────────────────────────────────────────── */
const CAT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  family:   { bg: "bg-primary/12", text: "text-primary", dot: "bg-primary" },
  school:   { bg: "bg-purple-500/12", text: "text-purple-600", dot: "bg-purple-500" },
  work:     { bg: "bg-blue-500/12", text: "text-blue-600", dot: "bg-blue-500" },
  travel:   { bg: "bg-amber-500/12", text: "text-amber-600", dot: "bg-amber-500" },
  medical:  { bg: "bg-rose-500/12", text: "text-rose-600", dot: "bg-rose-500" },
  birthday: { bg: "bg-emerald-500/12", text: "text-emerald-600", dot: "bg-emerald-500" },
  other:    { bg: "bg-slate-500/12", text: "text-slate-600", dot: "bg-slate-400" },
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:     { bg: "bg-amber-500/12", text: "text-amber-700" },
  in_progress: { bg: "bg-blue-500/12", text: "text-blue-700" },
  completed:   { bg: "bg-emerald-500/12", text: "text-emerald-700" },
  overdue:     { bg: "bg-rose-500/12", text: "text-rose-700" },
};

/* ─── Animated stat number ──────────────────────────────────── */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const steps = 20;
    const inc = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += inc;
      if (current >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.round(current));
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) { router.push("/login"); return; }

      const { data: member } = await supabase
        .from("family_members")
        .select("family_id, display_name, families(name)")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!member) { router.push("/onboarding"); return; }

      const familyId = member.family_id;
      const today = new Date().toISOString().slice(0, 10);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
      const now = new Date();
      const monthFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const monthTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

      const [eventsRes, tasksRes, shoppingRes, expenseMonthRes, expenseLast7Res, upcomingEventsRes, recentTasksRes] =
        await Promise.all([
          supabase.from("events").select("id", { count: "exact", head: true }).eq("family_id", familyId).gte("start_at", `${today}T00:00:00`).lte("start_at", `${today}T23:59:59`),
          supabase.from("tasks").select("id", { count: "exact", head: true }).eq("family_id", familyId).neq("status", "completed"),
          supabase.from("shopping_items").select("id", { count: "exact", head: true }).eq("family_id", familyId).eq("is_purchased", false),
          supabase.from("expenses").select("amount").eq("family_id", familyId).gte("expense_date", monthFrom).lte("expense_date", monthTo),
          supabase.from("expenses").select("amount, expense_date").eq("family_id", familyId).gte("expense_date", sevenDaysAgoStr).lte("expense_date", today).order("expense_date", { ascending: true }),
          supabase.from("events").select("id, title, start_at, category").eq("family_id", familyId).gte("start_at", `${today}T00:00:00`).order("start_at", { ascending: true }).limit(5),
          supabase.from("tasks").select("id, title, status, due_date").eq("family_id", familyId).neq("status", "completed").order("due_date", { ascending: true, nullsFirst: false }).limit(5),
        ]);

      const dayMap: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        dayMap[d.toISOString().slice(0, 10)] = 0;
      }
      (expenseLast7Res.data || []).forEach((e) => {
        const key = String(e.expense_date).slice(0, 10);
        if (dayMap[key] !== undefined) dayMap[key] += Number(e.amount);
      });

      const familiesData = member.families as { name: string } | { name: string }[] | null;
      const familyName = Array.isArray(familiesData)
        ? familiesData[0]?.name ?? "Family"
        : familiesData?.name ?? "Family";

      setData({
        displayName: member.display_name ?? "there",
        familyName,
        todayEvents: eventsRes.count ?? 0,
        openTasks: tasksRes.count ?? 0,
        shoppingItems: shoppingRes.count ?? 0,
        expensesTotal: (expenseMonthRes.data || []).reduce((s, e) => s + Number(e.amount), 0),
        expenseSparkline: Object.values(dayMap),
        upcomingEvents: upcomingEventsRes.data ?? [],
        recentTasks: recentTasksRes.data ?? [],
      });
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-base text-on-surface-variant font-medium">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const greeting = getGreeting();
  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const overdueTasks = data.recentTasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"
  );

  return (
    <div className="space-y-6">

      {/* ═══ HERO GREETING ═══════════════════════════════════════ */}
      <header className="glass-card rounded-lg p-6 md:p-8 relative overflow-hidden">
        {/* Decorative gradient blob */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-gradient-to-tr from-secondary/15 to-transparent blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
          <div>
            <p className="text-sm font-bold tracking-wider text-on-surface-variant flex items-center gap-2 mb-1">
              <span>{greeting.emoji}</span>
              <span className="uppercase">{greeting.text}</span>
            </p>
            <h1 className="font-heading text-4xl md:text-5xl text-on-background tracking-tight font-extrabold leading-tight">
              {data.displayName}
            </h1>
            <p className="text-sm text-on-surface-variant mt-1.5 font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary/60" />
              {todayStr}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span className="text-sm font-bold bg-primary/10 text-primary px-4 py-2 rounded-lg border border-primary/20 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {data.familyName}
            </span>
            {overdueTasks.length > 0 && (
              <span className="text-xs font-bold bg-rose-500/10 text-rose-600 px-3 py-1 rounded flex items-center gap-1.5 border border-rose-500/20">
                <AlertTriangle className="h-3.5 w-3.5" />
                {overdueTasks.length} overdue task{overdueTasks.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ═══ STAT CARDS ══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            icon: CalendarDays,
            label: "Today's Events",
            value: data.todayEvents,
            suffix: data.todayEvents === 1 ? "event" : "events",
            href: "/calendar",
            gradient: "from-primary/15 to-primary/5",
            iconColor: "text-primary",
            accentBorder: "border-l-primary",
          },
          {
            icon: CheckSquare,
            label: "Pending Tasks",
            value: data.openTasks,
            suffix: data.openTasks === 1 ? "task" : "tasks",
            href: "/tasks",
            gradient: "from-amber-500/15 to-amber-500/5",
            iconColor: "text-amber-500",
            accentBorder: "border-l-amber-500",
          },
          {
            icon: ShoppingCart,
            label: "Shopping Items",
            value: data.shoppingItems,
            suffix: "to buy",
            href: "/shopping",
            gradient: "from-emerald-500/15 to-emerald-500/5",
            iconColor: "text-emerald-500",
            accentBorder: "border-l-emerald-500",
          },
          {
            icon: TrendingUp,
            label: "Monthly Spend",
            value: -1, // special case for formatted amount
            suffix: "this month",
            href: "/expenses",
            gradient: "from-rose-500/15 to-rose-500/5",
            iconColor: "text-rose-500",
            accentBorder: "border-l-rose-500",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={`glass-card rounded-lg p-5 md:p-6 flex flex-col gap-4 group border-l-4 ${card.accentBorder} bg-gradient-to-br ${card.gradient}`}
            >
              <div className="flex justify-between items-center">
                <div className={`w-10 h-10 rounded-lg ${card.iconColor} bg-white/60 flex items-center justify-center shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-on-surface-variant/25 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
              </div>

              <div>
                <p className="font-heading font-extrabold text-3xl md:text-4xl text-on-background leading-none">
                  {card.value === -1
                    ? `₹${data.expensesTotal.toLocaleString("en-IN")}`
                    : <AnimatedNumber value={card.value} />
                  }
                </p>
                <p className="text-sm text-on-surface-variant font-medium mt-1">{card.suffix}</p>
              </div>

              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/50">{card.label}</p>
            </Link>
          );
        })}
      </div>

      {/* ═══ MAIN CONTENT: Spending + Events + Tasks ═════════════ */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* ─── Spending Trend (wider) ─────────────────────────── */}
        <div className="lg:col-span-1 glass-card rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-heading font-bold text-lg text-on-surface">Spending Trend</h3>
              <TrendingUp className="h-5 w-5 text-primary/40" />
            </div>
            <p className="text-sm text-on-surface-variant font-medium">Last 7 days</p>
          </div>

          <div className="my-4">
            <Sparkline data={data.expenseSparkline} height={100} />
          </div>

          <div className="flex justify-between items-center border-t border-outline-variant/40 pt-3">
            <span className="text-sm text-on-surface-variant font-medium">
              {new Date(Date.now() - 6 * 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
            <span className="text-sm text-on-surface-variant font-medium">Today</span>
          </div>

          <Link
            href="/expenses"
            className="mt-3 self-start flex items-center gap-2 text-primary text-sm font-bold uppercase tracking-wide hover:translate-x-1 transition-transform"
          >
            View Expenses <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* ─── Upcoming Events ─────────────────────────────────── */}
        <div className="lg:col-span-1 glass-card rounded-lg p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-heading font-bold text-lg text-on-surface">Upcoming Events</h3>
            <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded">
              {data.todayEvents} today
            </span>
          </div>

          {data.upcomingEvents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-on-surface-variant/35">
              <CalendarDays className="h-10 w-10 mb-3 stroke-[1.5]" />
              <p className="text-sm font-semibold">No upcoming events</p>
              <p className="text-xs font-medium mt-1">Your schedule is clear!</p>
            </div>
          ) : (
            <div className="space-y-2.5 flex-1">
              {data.upcomingEvents.map((evt) => {
                const evtDate = new Date(evt.start_at);
                const isTodayEvt = evtDate.toDateString() === new Date().toDateString();
                const cat = CAT_COLORS[evt.category] ?? CAT_COLORS.other;
                return (
                  <div key={evt.id} className="flex gap-3 items-start p-3 rounded-lg border border-outline-variant/40 hover:border-primary/40 transition-colors">
                    {/* Date block */}
                    <div className={`shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center ${isTodayEvt ? "bg-primary text-white" : "bg-surface-container-high text-on-surface"}`}>
                      <span className="text-[10px] font-bold uppercase leading-none">
                        {evtDate.toLocaleDateString("en-IN", { month: "short" })}
                      </span>
                      <span className="text-lg font-extrabold font-heading leading-none">
                        {evtDate.getDate()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{evt.title}</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {evtDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${cat.bg} ${cat.text}`}>
                      {evt.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <Link
            href="/calendar"
            className="mt-4 self-start flex items-center gap-2 text-primary text-sm font-bold uppercase tracking-wide hover:translate-x-1 transition-transform"
          >
            Open Calendar <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* ─── Pending Tasks ─────────────────────────────────── */}
        <div className="lg:col-span-1 glass-card rounded-lg p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-heading font-bold text-lg text-on-surface">Pending Tasks</h3>
            <span className={`text-xs font-bold px-2.5 py-1 rounded ${overdueTasks.length > 0 ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}`}>
              {data.openTasks} open
            </span>
          </div>

          {data.recentTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-on-surface-variant/35">
              <CheckSquare className="h-10 w-10 mb-3 stroke-[1.5]" />
              <p className="text-sm font-semibold">All tasks done!</p>
              <p className="text-xs font-medium mt-1">Nothing pending 🎉</p>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {data.recentTasks.map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
                const statusKey = isOverdue ? "overdue" : task.status;
                const sty = STATUS_STYLE[statusKey] ?? STATUS_STYLE.pending;
                return (
                  <div key={task.id} className="flex gap-3 items-center p-3 rounded-lg border border-outline-variant/40 hover:border-primary/40 transition-colors">
                    {/* Status dot */}
                    <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${isOverdue ? "bg-rose-500 animate-pulse" : task.status === "in_progress" ? "bg-blue-500" : "bg-amber-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{task.title}</p>
                      {task.due_date && (
                        <p className={`text-xs font-medium mt-0.5 flex items-center gap-1 ${isOverdue ? "text-rose-500" : "text-on-surface-variant"}`}>
                          <Clock className="h-3 w-3" />
                          Due {new Date(task.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${sty.bg} ${sty.text}`}>
                      {isOverdue ? "overdue" : task.status.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <Link
            href="/tasks"
            className="mt-4 self-start flex items-center gap-2 text-primary text-sm font-bold uppercase tracking-wide hover:translate-x-1 transition-transform"
          >
            View All Tasks <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ═══ QUICK NAVIGATION ════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Wrench, label: "Maintenance", desc: "Home assets & repairs", href: "/maintenance", color: "text-blue-500", gradient: "from-blue-500/10 to-transparent" },
          { icon: CreditCard, label: "Subscriptions", desc: "Monthly services", href: "/subscriptions", color: "text-purple-500", gradient: "from-purple-500/10 to-transparent" },
          { icon: Plane, label: "Holiday Plan", desc: "Trips & vacations", href: "/holiday", color: "text-amber-500", gradient: "from-amber-500/10 to-transparent" },
          { icon: FileText, label: "Documents", desc: "Family documents", href: "/documents", color: "text-emerald-500", gradient: "from-emerald-500/10 to-transparent" },
        ].map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href}
              className={`glass-card rounded-lg p-5 flex flex-col gap-3 group bg-gradient-to-br ${link.gradient}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-white/60 shadow-sm ${link.color}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{link.label}</p>
                <p className="text-xs text-on-surface-variant/60 font-medium mt-0.5">{link.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-on-surface-variant/20 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 mt-auto self-end" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}