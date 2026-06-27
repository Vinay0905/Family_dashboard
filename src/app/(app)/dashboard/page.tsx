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
  Plus
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

/* ─── Refined Sparkline SVG ─────────────────────────────────── */
function Sparkline({ data, color = "#005da7", height = 80 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length < 2) {
    return (
      <svg className="w-full" style={{ height }} viewBox="0 0 100 40" preserveAspectRatio="none">
        <line x1="0" y1="20" x2="100" y2="20" stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />
        <text x="50" y="24" textAnchor="middle" fill={color} fontSize="5" opacity="0.4" className="font-semibold">No transactions</text>
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
        <linearGradient id="sparkAreaNew" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.25 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.01 }} />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkAreaNew)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPt.x} cy={lastPt.y} r="2.2" fill="white" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

/* ─── Warmth & Order Style Maps ────────────────────────────── */
const CAT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  family:   { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  school:   { bg: "bg-purple-600/10", text: "text-purple-700", dot: "bg-purple-600" },
  work:     { bg: "bg-blue-600/10", text: "text-blue-700", dot: "bg-blue-600" },
  travel:   { bg: "bg-amber-600/10", text: "text-amber-700", dot: "bg-amber-600" },
  medical:  { bg: "bg-rose-600/10", text: "text-rose-700", dot: "bg-rose-600" },
  birthday: { bg: "bg-emerald-600/10", text: "text-emerald-700", dot: "bg-emerald-600" },
  other:    { bg: "bg-slate-600/10", text: "text-slate-700", dot: "bg-slate-500" },
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:     { bg: "bg-amber-500/10", text: "text-amber-800" },
  in_progress: { bg: "bg-blue-500/10", text: "text-blue-800" },
  completed:   { bg: "bg-emerald-500/10", text: "text-emerald-800" },
  overdue:     { bg: "bg-rose-500/10", text: "text-rose-800" },
};

/* ─── Animated stat number ──────────────────────────────────── */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const steps = 15;
    const inc = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += inc;
      if (current >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(Math.round(current));
    }, 25);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
}

export default function NewDashboardPage() {
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
          <p className="text-sm text-on-surface-variant font-medium">Gathering family updates…</p>
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
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* ─── HERO GREETING SECTION ───────────────────────────── */}
      <section className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl border border-outline-variant/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        {/* Soft atmospheric gradient glow matching Warmth & Order */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant/80">
            <span>{greeting.emoji}</span>
            <span>{greeting.text}</span>
          </div>
          <h2 className="font-quicksand text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight">
            {greeting.text === "Good morning" ? "Good morning" : greeting.text === "Good afternoon" ? "Good afternoon" : "Good evening"}, {data.displayName}
          </h2>
          <p className="text-sm text-on-surface-variant font-medium">{todayStr}</p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            {data.familyName}
          </span>
          {overdueTasks.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-secondary-container/10 text-secondary px-3 py-2 rounded-xl border border-secondary-container/20">
              <AlertTriangle className="h-3.5 w-3.5" />
              {overdueTasks.length} overdue chore{overdueTasks.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </section>

      {/* ─── BENTO STATS GRID ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: CalendarDays,
            label: "Events Today",
            value: data.todayEvents,
            desc: "agenda items",
            href: "/calendar",
            iconBg: "bg-[#E3F2FD] text-primary",
            activeClass: "hover:bg-primary-container/5 hover:border-primary/30",
          },
          {
            icon: CheckSquare,
            label: "Active Tasks",
            value: data.openTasks,
            desc: "household chores",
            href: "/tasks",
            iconBg: "bg-[#E8F5E9] text-tertiary",
            activeClass: "hover:bg-tertiary-container/5 hover:border-tertiary/30",
          },
          {
            icon: ShoppingCart,
            label: "Shopping Items",
            value: data.shoppingItems,
            desc: "items to buy",
            href: "/shopping",
            iconBg: "bg-[#FFF3E0] text-secondary",
            activeClass: "hover:bg-secondary-container/10 hover:border-secondary/30",
          },
          {
            icon: TrendingUp,
            label: "Total Expenses",
            value: -1, // special card for spend
            desc: "spent this month",
            href: "/expenses",
            iconBg: "bg-[#FFEBEE] text-secondary-container",
            activeClass: "hover:bg-secondary-container/10 hover:border-secondary-container/30",
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              href={card.href}
              className={`bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/20 flex flex-col justify-between group transition-all duration-200 active:scale-[0.98] shadow-sm ${card.activeClass}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-full ${card.iconBg} flex items-center justify-center shadow-xs`}>
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-on-surface-variant/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>

              <div>
                <span className="block font-quicksand text-3xl font-bold text-on-surface leading-none">
                  {card.value === -1 ? (
                    `₹${data.expensesTotal.toLocaleString("en-IN")}`
                  ) : (
                    <AnimatedNumber value={card.value} />
                  )}
                </span>
                <span className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant/40 mt-2">
                  {card.label}
                </span>
                <span className="text-xs text-on-surface-variant/75 font-medium mt-0.5 block">
                  {card.desc}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ─── MAIN BLOCKS ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upcoming Agenda Feed */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-quicksand text-xl font-bold text-on-surface">Upcoming Agenda</h3>
              <Link href="/calendar" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                View Calendar <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {data.upcomingEvents.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-on-surface-variant/40">
                <CalendarDays className="h-10 w-10 mb-3 stroke-[1.5] text-on-surface-variant/30" />
                <p className="text-sm font-semibold">Your agenda is clear today</p>
                <p className="text-xs font-medium mt-1">Enjoy a relaxing day at home!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.upcomingEvents.map((evt) => {
                  const evtDate = new Date(evt.start_at);
                  const isTodayEvt = evtDate.toDateString() === new Date().toDateString();
                  const cat = CAT_COLORS[evt.category] ?? CAT_COLORS.other;
                  return (
                    <div key={evt.id} className="flex gap-4 items-center p-3 rounded-xl border border-outline-variant/15 hover:border-primary/30 hover:bg-surface-container-low/40 transition-all group">
                      {/* Date / Time highlight box */}
                      <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-semibold text-center ${
                        isTodayEvt ? "bg-primary text-on-primary shadow-xs" : "bg-surface-container-high text-on-surface"
                      }`}>
                        <span className="text-[10px] font-bold uppercase leading-none">{evtDate.toLocaleDateString("en-IN", { month: "short" })}</span>
                        <span className="text-lg font-bold font-quicksand leading-none mt-0.5">{evtDate.getDate()}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">{evt.title}</p>
                        <p className="text-xs text-on-surface-variant font-medium mt-0.5 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-on-surface-variant/60" />
                          {evtDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>

                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-current/10 ${cat.bg} ${cat.text}`}>
                        {evt.category}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="lg:col-span-1 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-quicksand text-xl font-bold text-on-surface mb-4">Quick Actions</h3>
            <p className="text-xs text-on-surface-variant font-medium mb-6">Instantly log items or updates into the family records.</p>
            
            <div className="flex flex-col gap-2">
              <Link
                href="/tasks"
                className="w-full flex items-center justify-between p-4 rounded-xl bg-primary text-on-primary hover:opacity-95 active:scale-[0.98] transition-all font-bold text-sm shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <CheckSquare className="h-4.5 w-4.5" />
                  Add New Task
                </span>
                <Plus className="h-4 w-4" />
              </Link>
              
              <Link
                href="/calendar"
                className="w-full flex items-center justify-between p-4 rounded-xl bg-tertiary text-on-tertiary hover:opacity-95 active:scale-[0.98] transition-all font-bold text-sm shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <CalendarDays className="h-4.5 w-4.5" />
                  Schedule Event
                </span>
                <Plus className="h-4 w-4" />
              </Link>

              <Link
                href="/expenses"
                className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary text-on-secondary hover:opacity-95 active:scale-[0.98] transition-all font-bold text-sm shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <TrendingUp className="h-4.5 w-4.5" />
                  Log Expense
                </span>
                <Plus className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-outline-variant/20">
            <h4 className="font-quicksand text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Household Status</h4>
            <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
              <span>Next Service Due</span>
              <span className="text-primary font-bold">Checking...</span>
            </div>
          </div>
        </div>

      </div>

      {/* ─── BOTTOM BLOCK: SPENDING TREND + PENDING TASKS ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Spending Trend Chart */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-quicksand text-lg font-bold text-on-surface">Weekly Spending</h3>
              <TrendingUp className="h-5 w-5 text-secondary opacity-60" />
            </div>
            <p className="text-xs text-on-surface-variant font-medium">Summary of the last 7 days of transactions.</p>
          </div>

          <div className="my-6 py-2">
            <Sparkline data={data.expenseSparkline} color="#a53b29" height={90} />
          </div>

          <div className="flex justify-between items-center border-t border-outline-variant/15 pt-4">
            <span className="text-xs text-on-surface-variant font-bold">
              {new Date(Date.now() - 6 * 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
            <span className="text-xs text-on-surface-variant font-bold">Today</span>
            <Link href="/expenses" className="text-xs font-bold text-secondary hover:underline flex items-center gap-1 uppercase tracking-wider">
              Manage <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Pending Tasks / Chores */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-quicksand text-lg font-bold text-on-surface">Pending Tasks</h3>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${overdueTasks.length > 0 ? "bg-rose-500/10 text-rose-700" : "bg-amber-500/10 text-amber-700"}`}>
                {data.openTasks} active
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium">Assigned household chores and schedules.</p>
          </div>

          <div className="my-4 space-y-2 flex-grow">
            {data.recentTasks.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center text-on-surface-variant/40">
                <CheckSquare className="h-8 w-8 mb-2 stroke-[1.5] text-on-surface-variant/30" />
                <p className="text-xs font-semibold">All chores completed!</p>
              </div>
            ) : (
              data.recentTasks.map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
                const statusKey = isOverdue ? "overdue" : task.status;
                const sty = STATUS_STYLE[statusKey] ?? STATUS_STYLE.pending;
                return (
                  <div key={task.id} className="flex gap-3 items-center p-2.5 rounded-xl border border-outline-variant/15 hover:border-primary/30 transition-all">
                    <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${isOverdue ? "bg-rose-500 animate-pulse" : task.status === "in_progress" ? "bg-blue-500" : "bg-amber-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">{task.title}</p>
                      {task.due_date && (
                        <p className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${isOverdue ? "text-rose-600 font-bold" : "text-on-surface-variant/60"}`}>
                          Due {new Date(task.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border border-current/10 ${sty.bg} ${sty.text}`}>
                      {isOverdue ? "overdue" : task.status.replace("_", " ")}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-outline-variant/15 pt-4 flex justify-between items-center">
            <span className="text-xs text-on-surface-variant/60 font-semibold">Total: {data.openTasks} tasks pending</span>
            <Link href="/tasks" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 uppercase tracking-wider">
              Work Board <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* ─── DYNAMIC UTILITY TILES ──────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Wrench, label: "Maintenance", desc: "Service assets", href: "/maintenance", color: "text-blue-600", bg: "from-blue-500/10 to-transparent" },
          { icon: CreditCard, label: "Subscriptions", desc: "Recurring plans", href: "/subscriptions", color: "text-purple-600", bg: "from-purple-500/10 to-transparent" },
          { icon: Plane, label: "Holiday Planner", desc: "Trips & packing", href: "/holiday", color: "text-amber-600", bg: "from-amber-500/10 to-transparent" },
          { icon: FileText, label: "Documents", desc: "Family archives", href: "/documents", color: "text-emerald-600", bg: "from-emerald-500/10 to-transparent" },
        ].map((link, idx) => {
          const Icon = link.icon;
          return (
            <Link
              key={idx}
              href={link.href}
              className={`bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/20 flex flex-col gap-3 group bg-gradient-to-br ${link.bg} transition-all duration-200 active:scale-[0.98] hover:border-outline-variant/40`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-outline-variant/10 shadow-xs ${link.color}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">{link.label}</p>
                <p className="text-[10px] text-on-surface-variant/70 font-semibold mt-0.5">{link.desc}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-on-surface-variant/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-auto self-end" />
            </Link>
          );
        })}
      </section>

    </div>
  );
}
