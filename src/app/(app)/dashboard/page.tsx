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
  Sun,
  Moon,
} from "lucide-react";

interface DashboardData {
  displayName: string;
  familyName: string;
  todayEvents: number;
  openTasks: number;
  shoppingItems: number;
  expensesTotal: number;
  expenseSparkline: number[]; // last 7 days amounts
  upcomingEvents: { id: string; title: string; start_at: string; category: string }[];
  recentTasks: { id: string; title: string; status: string; due_date: string | null }[];
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: Sun };
  if (hour < 18) return { text: "Good afternoon", icon: Sun };
  return { text: "Good evening", icon: Moon };
}

// Mini sparkline SVG from data array
function Sparkline({ data, color = "#b7004f" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) {
    return (
      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
        <line x1="0" y1="20" x2="100" y2="20" stroke={color} strokeWidth="2" strokeDasharray="4 2" opacity="0.3" />
      </svg>
    );
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 38 - ((val - min) / range) * 34;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L 100,40 L 0,40 Z`;

  return (
    <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.35 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Endpoint dot */}
      <circle
        cx={(((data.length - 1) / (data.length - 1)) * 100).toString()}
        cy={(38 - ((data[data.length - 1] - min) / range) * 34).toString()}
        r="3"
        fill={color}
      />
    </svg>
  );
}

const CATEGORY_COLOR: Record<string, string> = {
  family: "bg-primary/10 text-primary",
  school: "bg-purple-500/10 text-purple-600",
  work: "bg-blue-500/10 text-blue-600",
  travel: "bg-amber-500/10 text-amber-600",
  medical: "bg-rose-500/10 text-rose-600",
  birthday: "bg-emerald-500/10 text-emerald-600",
  other: "bg-slate-500/10 text-slate-500",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600",
  in_progress: "bg-blue-500/10 text-blue-600",
  completed: "bg-emerald-500/10 text-emerald-600",
  overdue: "bg-rose-500/10 text-rose-600",
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        router.push("/login");
        return;
      }

      const { data: member } = await supabase
        .from("family_members")
        .select("family_id, display_name, families(name)")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!member) {
        router.push("/onboarding");
        return;
      }

      const familyId = member.family_id;
      const today = new Date().toISOString().slice(0, 10);

      // --- Last 7 days expense bucketing ---
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

      const now = new Date();
      const monthFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const monthTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

      const [
        eventsRes,
        tasksRes,
        shoppingRes,
        expenseMonthRes,
        expenseLast7Res,
        upcomingEventsRes,
        recentTasksRes,
      ] = await Promise.all([
        supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("family_id", familyId)
          .gte("start_at", `${today}T00:00:00`)
          .lte("start_at", `${today}T23:59:59`),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("family_id", familyId)
          .neq("status", "completed"),
        supabase
          .from("shopping_items")
          .select("id", { count: "exact", head: true })
          .eq("family_id", familyId)
          .eq("is_purchased", false),
        supabase
          .from("expenses")
          .select("amount")
          .eq("family_id", familyId)
          .gte("expense_date", monthFrom)
          .lte("expense_date", monthTo),
        supabase
          .from("expenses")
          .select("amount, expense_date")
          .eq("family_id", familyId)
          .gte("expense_date", sevenDaysAgoStr)
          .lte("expense_date", today)
          .order("expense_date", { ascending: true }),
        supabase
          .from("events")
          .select("id, title, start_at, category")
          .eq("family_id", familyId)
          .gte("start_at", `${today}T00:00:00`)
          .order("start_at", { ascending: true })
          .limit(5),
        supabase
          .from("tasks")
          .select("id, title, status, due_date")
          .eq("family_id", familyId)
          .neq("status", "completed")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(5),
      ]);

      // Build 7-day sparkline: one total per day
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
      const sparkline = Object.values(dayMap);

      const expensesTotal = (expenseMonthRes.data || []).reduce((s, e) => s + Number(e.amount), 0);

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
        expensesTotal,
        expenseSparkline: sparkline,
        upcomingEvents: upcomingEventsRes.data ?? [],
        recentTasks: recentTasksRes.data ?? [],
      });
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const greeting = getGreeting();
  const GreetIcon = greeting.icon;

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-on-surface-variant font-medium">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GreetIcon className="h-5 w-5 text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{greeting.text}</p>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl text-on-background tracking-tight font-extrabold">
            {data.displayName}
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-1 font-medium">{todayStr}</p>
        </div>
        <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded border border-primary/20">
          {data.familyName}
        </span>
      </header>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: CalendarDays,
            label: "Today's Events",
            value: data.todayEvents,
            suffix: data.todayEvents === 1 ? "event" : "events",
            href: "/calendar",
            color: "text-primary",
          },
          {
            icon: CheckSquare,
            label: "Pending Tasks",
            value: data.openTasks,
            suffix: data.openTasks === 1 ? "task" : "tasks",
            href: "/tasks",
            color: "text-amber-500",
          },
          {
            icon: ShoppingCart,
            label: "Shopping Items",
            value: data.shoppingItems,
            suffix: "to buy",
            href: "/shopping",
            color: "text-emerald-500",
          },
          {
            icon: TrendingUp,
            label: "Monthly Spend",
            value: `₹${data.expensesTotal.toLocaleString("en-IN")}`,
            suffix: "this month",
            href: "/expenses",
            color: "text-rose-500",
            isAmount: true,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="glass-card rounded p-5 flex flex-col gap-3 hover:scale-[1.02] transition-transform group"
            >
              <div className="flex justify-between items-start">
                <Icon className={`h-5 w-5 ${card.color}`} />
                <ArrowRight className="h-4 w-4 text-on-surface-variant/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <p className={`font-heading font-extrabold text-2xl text-on-background`}>
                  {card.value}
                </p>
                <p className="text-[11px] text-on-surface-variant font-semibold mt-0.5">{card.suffix}</p>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60">{card.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Expense Sparkline Card */}
        <div className="lg:col-span-1 glass-card rounded p-6 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-heading font-bold text-base text-on-surface">Spending Trend</h3>
              <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">Last 7 days</p>
            </div>
            <TrendingUp className="h-5 w-5 text-primary opacity-60" />
          </div>
          <div className="h-24 w-full">
            <Sparkline data={data.expenseSparkline} />
          </div>
          <div className="flex justify-between items-center border-t border-outline-variant/50 pt-3">
            <span className="text-xs text-on-surface-variant font-medium">
              {new Date(Date.now() - 6 * 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
            <span className="text-xs text-on-surface-variant font-medium">Today</span>
          </div>
          <Link
            href="/expenses"
            className="self-start flex items-center gap-1.5 text-primary font-sans text-xs font-bold uppercase tracking-wider hover:translate-x-0.5 transition-transform"
          >
            View Expenses <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Upcoming Events */}
        <div className="lg:col-span-1 glass-card rounded p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-heading font-bold text-base text-on-surface">Upcoming Events</h3>
            <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
              Today+
            </span>
          </div>

          {data.upcomingEvents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-on-surface-variant/40">
              <CalendarDays className="h-8 w-8 mb-2 stroke-[1.5]" />
              <p className="text-xs font-semibold">No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {data.upcomingEvents.map((evt) => {
                const evtDate = new Date(evt.start_at);
                const isToday =
                  evtDate.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={evt.id}
                    className="flex gap-3 items-start p-3 rounded border border-outline-variant/50 bg-surface-container-low/20"
                  >
                    <div className="text-center shrink-0 w-9">
                      <p className="text-[10px] font-bold uppercase text-on-surface-variant/60">
                        {evtDate.toLocaleDateString("en-IN", { month: "short" })}
                      </p>
                      <p className={`text-lg font-extrabold font-heading leading-none ${isToday ? "text-primary" : "text-on-surface"}`}>
                        {evtDate.getDate()}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">{evt.title}</p>
                      <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                        {evtDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${CATEGORY_COLOR[evt.category] ?? CATEGORY_COLOR.other}`}>
                      {evt.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <Link
            href="/calendar"
            className="self-start flex items-center gap-1.5 text-primary font-sans text-xs font-bold uppercase tracking-wider hover:translate-x-0.5 transition-transform"
          >
            Open Calendar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Pending Tasks */}
        <div className="lg:col-span-1 glass-card rounded p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-heading font-bold text-base text-on-surface">Pending Tasks</h3>
            <span className="text-xs font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">
              {data.openTasks} open
            </span>
          </div>

          {data.recentTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-on-surface-variant/40">
              <CheckSquare className="h-8 w-8 mb-2 stroke-[1.5]" />
              <p className="text-xs font-semibold">All tasks complete!</p>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {data.recentTasks.map((task) => {
                const isOverdue =
                  task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
                const statusKey = isOverdue ? "overdue" : task.status;
                return (
                  <div
                    key={task.id}
                    className="flex gap-3 items-center p-3 rounded border border-outline-variant/50 bg-surface-container-low/20"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">{task.title}</p>
                      {task.due_date && (
                        <p className={`text-[10px] font-medium mt-0.5 ${isOverdue ? "text-rose-500" : "text-on-surface-variant"}`}>
                          Due {new Date(task.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_COLOR[statusKey] ?? STATUS_COLOR.pending}`}>
                      {isOverdue ? "overdue" : task.status.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <Link
            href="/tasks"
            className="self-start flex items-center gap-1.5 text-primary font-sans text-xs font-bold uppercase tracking-wider hover:translate-x-0.5 transition-transform"
          >
            View All Tasks <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Quick Links Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Wrench, label: "Maintenance", href: "/maintenance", color: "text-blue-500" },
          { icon: CreditCard, label: "Subscriptions", href: "/subscriptions", color: "text-purple-500" },
          { icon: Plane, label: "Holiday Plan", href: "/holiday", color: "text-amber-500" },
          { icon: CalendarDays, label: "Documents", href: "/documents", color: "text-emerald-500" },
        ].map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href}
              className="glass-card rounded p-4 flex items-center gap-3 hover:scale-[1.02] transition-transform group"
            >
              <Icon className={`h-5 w-5 shrink-0 ${link.color}`} />
              <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">{link.label}</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto text-on-surface-variant/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}