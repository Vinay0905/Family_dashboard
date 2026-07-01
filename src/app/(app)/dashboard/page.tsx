"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
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
  completedTasks: number;
  shoppingItems: number;
  completedShoppingItems: number;
  expensesTotal: number;
  expenseSparkline: number[];
  upcomingEvents: { id: string; title: string; start_at: string; category: string }[];
  recentTasks: { id: string; title: string; status: string; due_date: string | null }[];
}

import { cn } from "@/lib/utils";

/* ─── Circular Progress SVG Dial ────────────────────────────── */
function StatDial({ percentage, colorClass = "stroke-primary" }: { percentage: number; colorClass?: string }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          className="stroke-muted-foreground/15 fill-transparent"
          strokeWidth="3.5"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          className={cn("fill-transparent transition-all duration-1000 ease-out", colorClass)}
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-black text-foreground font-sans tracking-tight">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: Sun, emoji: "☀️" };
  if (hour < 18) return { text: "Good afternoon", icon: Sun, emoji: "🌤️" };
  return { text: "Good evening", icon: Moon, emoji: "🌙" };
}

/* ─── Refined Sparkline SVG ─────────────────────────────────── */
function Sparkline({ data, color = "var(--color-chart-2)", height = 80 }: { data: number[]; color?: string; height?: number }) {
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
      <circle cx={lastPt.x} cy={lastPt.y} r="2.2" fill="var(--color-background)" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

/* ─── Warmth & Order Style Maps ────────────────────────────── */
const CAT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  family:   { bg: "bg-primary/15", text: "text-primary", dot: "bg-primary" },
  school:   { bg: "bg-chart-1/15", text: "text-chart-1", dot: "bg-chart-1" },
  work:     { bg: "bg-chart-2/15", text: "text-chart-2", dot: "bg-chart-2" },
  travel:   { bg: "bg-chart-3/15", text: "text-chart-3", dot: "bg-chart-3" },
  medical:  { bg: "bg-destructive/15", text: "text-destructive", dot: "bg-destructive" },
  birthday: { bg: "bg-chart-4/15", text: "text-chart-4", dot: "bg-chart-4" },
  other:    { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground/60" },
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending:     { bg: "bg-chart-3/15", text: "text-chart-3" },
  in_progress: { bg: "bg-chart-1/15", text: "text-chart-1" },
  completed:   { bg: "bg-chart-4/15", text: "text-chart-4" },
  overdue:     { bg: "bg-destructive/15", text: "text-destructive" },
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
  const [taskFilter, setTaskFilter] = useState<"all" | "overdue" | "active">("all");
  const [eventFilter, setEventFilter] = useState<"all" | "today" | "upcoming">("all");

  const { familyId: cachedFamilyId, familyMembers: cachedMembers, currentUser: cachedUser, memberRole: cachedRole, familyName: cachedFamilyName, isInitialized, setAppInfo } = useAppStore();

  const loadDashboard = useCallback(async () => {
    try {
      let activeUser = cachedUser;
      let activeFamilyId = cachedFamilyId;
      let activeRole = cachedRole;
      let activeMembers = cachedMembers;
      let activeFamilyName = cachedFamilyName;
      let displayName = "";

      if (!isInitialized) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) { router.push("/login"); return; }
        activeUser = userData.user;

        const { data: member } = await supabase
          .from("family_members")
          .select("family_id, display_name, role, families(name)")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (!member) { router.push("/onboarding"); return; }

        activeFamilyId = member.family_id;
        displayName = member.display_name ?? userData.user.email ?? "there";
        activeRole = member.role;

        const familiesData = member.families as { name: string } | { name: string }[] | null;
        activeFamilyName = Array.isArray(familiesData)
          ? familiesData[0]?.name ?? "Family"
          : familiesData?.name ?? "Family";

        // Fetch family members list
        const { data: membersData } = await supabase
          .from("family_members")
          .select("user_id, display_name, role")
          .eq("family_id", member.family_id);

        activeMembers = membersData ?? [];

        setAppInfo({
          familyId: activeFamilyId,
          familyMembers: activeMembers,
          currentUser: activeUser,
          memberRole: activeRole,
          familyName: activeFamilyName
        });
      } else {
        activeUser = cachedUser;
        activeFamilyId = cachedFamilyId;
        activeRole = cachedRole;
        activeMembers = cachedMembers;
        activeFamilyName = cachedFamilyName;

        const currentMember = activeMembers.find(m => m.user_id === activeUser?.id);
        displayName = currentMember?.display_name ?? activeUser?.email ?? "there";
      }

      if (!activeFamilyId) return;
      const today = new Date().toISOString().slice(0, 10);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);
      const now = new Date();
      const monthFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const monthTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

      const [eventsRes, tasksRes, completedTasksRes, shoppingRes, completedShoppingRes, expenseMonthRes, expenseLast7Res, upcomingEventsRes, recentTasksRes] =
        await Promise.all([
          supabase.from("events").select("id", { count: "exact", head: true }).eq("family_id", activeFamilyId).gte("start_at", `${today}T00:00:00`).lte("start_at", `${today}T23:59:59`),
          supabase.from("tasks").select("id", { count: "exact", head: true }).eq("family_id", activeFamilyId).neq("status", "completed"),
          supabase.from("tasks").select("id", { count: "exact", head: true }).eq("family_id", activeFamilyId).eq("status", "completed"),
          supabase.from("shopping_items").select("id", { count: "exact", head: true }).eq("family_id", activeFamilyId).eq("is_purchased", false),
          supabase.from("shopping_items").select("id", { count: "exact", head: true }).eq("family_id", activeFamilyId).eq("is_purchased", true),
          supabase.from("expenses").select("amount").eq("family_id", activeFamilyId).gte("expense_date", monthFrom).lte("expense_date", monthTo),
          supabase.from("expenses").select("amount, expense_date").eq("family_id", activeFamilyId).gte("expense_date", sevenDaysAgoStr).lte("expense_date", today).order("expense_date", { ascending: true }),
          supabase.from("events").select("id, title, start_at, category").eq("family_id", activeFamilyId).gte("start_at", `${today}T00:00:00`).order("start_at", { ascending: true }).limit(5),
          supabase.from("tasks").select("id, title, status, due_date").eq("family_id", activeFamilyId).neq("status", "completed").order("due_date", { ascending: true, nullsFirst: false }).limit(5),
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

      setData({
        displayName,
        familyName: activeFamilyName,
        todayEvents: eventsRes.count ?? 0,
        openTasks: tasksRes.count ?? 0,
        completedTasks: completedTasksRes.count ?? 0,
        shoppingItems: shoppingRes.count ?? 0,
        completedShoppingItems: completedShoppingRes.count ?? 0,
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
  }, [supabase, router, cachedFamilyId, cachedMembers, cachedUser, cachedRole, cachedFamilyName, isInitialized, setAppInfo]);

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
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="bento-grid">
        
        {/* ─── HERO GREETING SECTION ───────────────────────────── */}
        <section className="col-span-12 glass-card neon-glow hover:neon-glow-active p-6 md:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden transition-all duration-300">
          {/* Soft atmospheric gradient glow matching Warmth & Order */}
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-primary/15 via-tertiary/10 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-72 h-72 rounded-full bg-gradient-to-tr from-secondary/10 to-transparent blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/90">
              <span className="text-base">{greeting.emoji}</span>
              <span className="font-sans">{greeting.text}</span>
            </div>
            <h1 className="font-serif text-3xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
              {greeting.text === "Good morning" ? "Good morning" : greeting.text === "Good afternoon" ? "Good afternoon" : "Good evening"}, <span className="text-primary font-black">{data.displayName}</span>
            </h1>
            <p className="text-sm text-muted-foreground/80 font-semibold font-sans flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary/70 animate-pulse" />
              {todayStr}
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary/10 text-primary px-4 py-2.5 rounded-xl border border-primary/20 shadow-xs hover:bg-primary/20 transition-colors">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {data.familyName}
            </span>
            {overdueTasks.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-destructive/10 text-destructive px-3.5 py-2.5 rounded-xl border border-destructive/20 shadow-xs hover:bg-destructive/20 transition-colors">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive animate-bounce" />
                {overdueTasks.length} overdue chore{overdueTasks.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </section>

        {/* ─── BENTO STATS CARDS ────────────────────────────────── */}
        {(() => {
          const eventsPercentage = data.todayEvents > 0 ? Math.max(100 - (data.todayEvents * 15), 10) : 100;
          const totalTasks = data.openTasks + data.completedTasks;
          const tasksPercentage = totalTasks > 0 ? (data.completedTasks / totalTasks) * 100 : 100;
          const totalShopping = data.shoppingItems + data.completedShoppingItems;
          const shoppingPercentage = totalShopping > 0 ? (data.completedShoppingItems / totalShopping) * 100 : 100;
          const budgetLimit = 30000;
          const expensesPercentage = Math.min((data.expensesTotal / budgetLimit) * 100, 100);

          const statsCards = [
            {
              icon: CalendarDays,
              label: "Events Today",
              value: data.todayEvents,
              desc: "click to filter agenda today",
              href: "/calendar",
              iconBg: "bg-primary/10 text-primary",
              hoverBorder: "hover:border-primary/40",
              percentage: eventsPercentage,
              dialColor: "stroke-primary",
              active: eventFilter === "today",
              onClick: () => setEventFilter(prev => prev === "today" ? "all" : "today"),
            },
            {
              icon: CheckSquare,
              label: "Active Tasks",
              value: data.openTasks,
              desc: "click to filter pending chores",
              href: "/tasks",
              iconBg: "bg-tertiary/10 text-tertiary",
              hoverBorder: "hover:border-tertiary/40",
              percentage: tasksPercentage,
              dialColor: "stroke-tertiary",
              active: taskFilter === "active",
              onClick: () => setTaskFilter(prev => prev === "active" ? "all" : "active"),
            },
            {
              icon: ShoppingCart,
              label: "Shopping Items",
              value: data.shoppingItems,
              desc: "purchased vs total lists",
              href: "/shopping",
              iconBg: "bg-chart-1/10 text-chart-1",
              hoverBorder: "hover:border-chart-1/40",
              percentage: shoppingPercentage,
              dialColor: "stroke-chart-1",
              active: false,
              onClick: () => router.push("/shopping"),
            },
            {
              icon: TrendingUp,
              label: "Total Expenses",
              value: -1,
              desc: "spent of ₹30,000 budget",
              href: "/expenses",
              iconBg: "bg-destructive/10 text-destructive",
              hoverBorder: "hover:border-destructive/40",
              percentage: expensesPercentage,
              dialColor: "stroke-destructive",
              active: false,
              onClick: () => router.push("/expenses"),
            },
          ];

          return statsCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={card.onClick}
                className={cn(
                  "col-span-6 lg:col-span-3 glass-card neon-glow hover:neon-glow-active p-6 rounded-2xl flex flex-col justify-between group transition-all duration-300 ease-out cursor-pointer hover:-translate-y-1.5 hover:scale-[1.03]",
                  card.hoverBorder,
                  card.active && "border-primary/50 shadow-md scale-[1.02] bg-primary/[0.03]"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${card.iconBg} flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <StatDial percentage={card.percentage} colorClass={card.dialColor} />
                    <Link 
                      href={card.href} 
                      onClick={(e) => e.stopPropagation()} 
                      className="p-1.5 rounded-lg bg-muted/50 border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-all shrink-0"
                      title={`Open ${card.label}`}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                <div>
                  <span className="block font-serif text-3xl md:text-4xl font-extrabold text-foreground leading-none tracking-tight">
                    {card.value === -1 ? (
                      `₹${data.expensesTotal.toLocaleString("en-IN")}`
                    ) : (
                      <AnimatedNumber value={card.value} />
                    )}
                  </span>
                  <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mt-3 font-sans">
                    {card.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground/85 font-semibold mt-0.5 block font-sans">
                    {card.desc}
                  </span>
                </div>
              </div>
            );
          });
        })()}

        {/* ─── UPCOMING AGENDA FEED ───────────────────────────── */}
        <div className="col-span-12 lg:col-span-8 glass-card neon-glow hover:neon-glow-active p-6 rounded-2xl flex flex-col justify-between transition-all duration-300">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2.5">
                <h3 className="font-serif text-2xl font-black text-foreground">Upcoming Agenda</h3>
                {eventFilter !== "all" && (
                  <span 
                    onClick={() => setEventFilter("all")}
                    className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors flex items-center gap-1 font-sans"
                    title="Click to clear filter"
                  >
                    Today Only ✕
                  </span>
                )}
              </div>
              <Link href="/calendar" className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 font-sans group">
                View Calendar <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {(() => {
              const filteredEvents = data.upcomingEvents.filter((evt) => {
                if (eventFilter === "all") return true;
                const evtDate = new Date(evt.start_at);
                const isTodayEvt = evtDate.toDateString() === new Date().toDateString();
                if (eventFilter === "today") return isTodayEvt;
                return true;
              });

              if (filteredEvents.length === 0) {
                return (
                  <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground/50">
                    <CalendarDays className="h-10 w-10 mb-3 stroke-[1.5] text-primary/30" />
                    <p className="text-sm font-bold font-sans">No events matched this filter</p>
                    <p className="text-xs font-semibold mt-1 font-sans">Click the badge to clear.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filteredEvents.map((evt) => {
                    const evtDate = new Date(evt.start_at);
                    const isTodayEvt = evtDate.toDateString() === new Date().toDateString();
                    const cat = CAT_COLORS[evt.category] ?? CAT_COLORS.other;
                    return (
                      <div key={evt.id} className="flex gap-4 items-center p-3.5 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/30 transition-all duration-200 group/item">
                        {/* Date / Time highlight box */}
                        <div className={`shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-center transition-all ${
                          isTodayEvt ? "bg-primary text-primary-foreground shadow-sm scale-105" : "bg-muted text-foreground"
                        }`}>
                          <span className="text-[10px] font-bold uppercase leading-none tracking-wider">{evtDate.toLocaleDateString("en-IN", { month: "short" })}</span>
                          <span className="text-lg font-extrabold font-serif leading-none mt-0.5">{evtDate.getDate()}</span>
                        </div>

                        <div className="flex-1 min-w-0 font-sans">
                          <p className="text-sm font-bold text-foreground group-hover/item:text-primary transition-colors truncate">{evt.title}</p>
                          <p className="text-xs text-muted-foreground font-semibold mt-0.5 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary/65 animate-pulse" />
                            {evtDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>

                        <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border border-current/10 font-sans tracking-wide ${cat.bg} ${cat.text}`}>
                          {evt.category}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ─── QUICK ACTIONS PANEL ───────────────────────────── */}
        <div className="col-span-12 lg:col-span-4 glass-card neon-glow hover:neon-glow-active p-6 rounded-2xl flex flex-col justify-between transition-all duration-300">
          <div>
            <h3 className="font-serif text-2xl font-black text-foreground mb-2">Quick Actions</h3>
            <p className="text-xs text-muted-foreground font-semibold mb-6 font-sans">Instantly log items or updates into the family records.</p>
            
            <div className="flex flex-col gap-3">
              <Link
                href="/tasks"
                className="w-full flex items-center justify-between p-4 rounded-xl bg-primary text-primary-foreground hover:opacity-95 hover:-translate-y-0.5 active:scale-[0.98] transition-all font-bold text-sm shadow-sm font-sans group/act"
              >
                <span className="flex items-center gap-3">
                  <CheckSquare className="h-4.5 w-4.5 group-hover/act:rotate-6 transition-transform" />
                  Add New Task
                </span>
                <Plus className="h-4 w-4" />
              </Link>
              
              <Link
                href="/calendar"
                className="w-full flex items-center justify-between p-4 rounded-xl bg-tertiary text-tertiary-foreground hover:opacity-95 hover:-translate-y-0.5 active:scale-[0.98] transition-all font-bold text-sm shadow-sm font-sans group/act"
              >
                <span className="flex items-center gap-3">
                  <CalendarDays className="h-4.5 w-4.5 group-hover/act:rotate-6 transition-transform" />
                  Schedule Event
                </span>
                <Plus className="h-4 w-4" />
              </Link>

              <Link
                href="/expenses"
                className="w-full flex items-center justify-between p-4 rounded-xl bg-accent text-accent-foreground hover:opacity-95 hover:-translate-y-0.5 active:scale-[0.98] transition-all font-bold text-sm border border-border shadow-sm font-sans group/act"
              >
                <span className="flex items-center gap-3">
                  <TrendingUp className="h-4.5 w-4.5 group-hover/act:rotate-6 transition-transform" />
                  Log Expense
                </span>
                <Plus className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-border">
            <h4 className="font-serif text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Household Status</h4>
            <div className="flex items-center justify-between text-xs font-bold text-foreground font-sans">
              <span className="text-muted-foreground">Next Service Due</span>
              <span className="text-primary font-extrabold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                Checking...
              </span>
            </div>
          </div>
        </div>

        {/* ─── SPENDING TREND CHART ───────────────────────────── */}
        <div className="col-span-12 md:col-span-6 glass-card neon-glow hover:neon-glow-active p-6 rounded-2xl flex flex-col justify-between transition-all duration-300">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-serif text-2xl font-black text-foreground">Weekly Spending</h3>
              <TrendingUp className="h-5 w-5 text-chart-2 opacity-80" />
            </div>
            <p className="text-xs text-muted-foreground font-semibold font-sans">Summary of the last 7 days of transactions.</p>
          </div>

          <div className="my-6 py-2">
            <Sparkline data={data.expenseSparkline} color="var(--color-chart-2)" height={90} />
          </div>

          <div className="flex justify-between items-center border-t border-border pt-4 font-sans">
            <span className="text-xs text-muted-foreground font-bold">
              {new Date(Date.now() - 6 * 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
            <span className="text-xs text-muted-foreground font-bold">Today</span>
            <Link href="/expenses" className="text-xs font-extrabold text-chart-2 hover:text-chart-2/80 transition-colors flex items-center gap-1 uppercase tracking-wider">
              Manage <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* ─── PENDING TASKS / CHORES ─────────────────────────── */}
        <div className="col-span-12 md:col-span-6 glass-card neon-glow hover:neon-glow-active p-6 rounded-2xl flex flex-col justify-between transition-all duration-300">
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2.5">
                <h3 className="font-serif text-2xl font-black text-foreground">Pending Tasks</h3>
                {taskFilter !== "all" && (
                  <span 
                    onClick={() => setTaskFilter("all")}
                    className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors flex items-center gap-1 font-sans"
                    title="Click to clear filter"
                  >
                    Active Only ✕
                  </span>
                )}
              </div>
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full font-sans tracking-wide ${overdueTasks.length > 0 ? "bg-destructive/10 text-destructive border border-destructive/20 animate-pulse" : "bg-chart-3/15 text-chart-3"}`}>
                {data.openTasks} active
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-semibold font-sans">Assigned household chores and schedules.</p>
          </div>

          <div className="my-4 space-y-2.5 flex-grow">
            {(() => {
              const filteredTasks = data.recentTasks.filter((task) => {
                if (taskFilter === "all") return true;
                if (taskFilter === "active") return task.status !== "completed";
                return true;
              });

              if (filteredTasks.length === 0) {
                return (
                  <div className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground/50">
                    <CheckSquare className="h-8 w-8 mb-2 stroke-[1.5] text-primary/40 animate-bounce" />
                    <p className="text-xs font-bold font-sans">No tasks match this filter</p>
                  </div>
                );
              }

              return filteredTasks.map((task) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
                const statusKey = isOverdue ? "overdue" : task.status;
                const sty = STATUS_STYLE[statusKey] ?? STATUS_STYLE.pending;
                return (
                  <div key={task.id} className="flex gap-3.5 items-center p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/30 transition-all duration-200 group/task">
                    <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${isOverdue ? "bg-destructive animate-pulse shadow-[0_0_8px_var(--color-destructive)]" : task.status === "in_progress" ? "bg-chart-1" : "bg-chart-3"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate group-hover/task:text-primary transition-colors font-sans">{task.title}</p>
                      {task.due_date && (
                        <p className={`text-[10px] font-bold mt-0.5 flex items-center gap-1 font-sans ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                          Due {new Date(task.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border border-current/10 font-sans tracking-wider ${sty.bg} ${sty.text}`}>
                      {isOverdue ? "overdue" : task.status.replace("_", " ")}
                    </span>
                  </div>
                );
              });
            })()}
          </div>

          <div className="border-t border-border pt-4 flex justify-between items-center font-sans">
            <span className="text-xs text-muted-foreground font-bold">Total: {data.openTasks} tasks pending</span>
            <Link href="/tasks" className="text-xs font-extrabold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 uppercase tracking-wider">
              Work Board <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* ─── DYNAMIC UTILITY TILES ──────────────────────────── */}
        {[
          { icon: Wrench, label: "Maintenance", desc: "Service assets", href: "/maintenance", color: "text-chart-1", bg: "from-chart-1/10 to-transparent", hoverBorder: "hover:border-chart-1/40" },
          { icon: CreditCard, label: "Subscriptions", desc: "Recurring plans", href: "/subscriptions", color: "text-chart-2", bg: "from-chart-2/10 to-transparent", hoverBorder: "hover:border-chart-2/40" },
          { icon: Plane, label: "Holiday Planner", desc: "Trips & packing", href: "/holiday", color: "text-chart-3", bg: "from-chart-3/10 to-transparent", hoverBorder: "hover:border-chart-3/40" },
          { icon: FileText, label: "Documents", desc: "Family archives", href: "/documents", color: "text-chart-4", bg: "from-chart-4/10 to-transparent", hoverBorder: "hover:border-chart-4/40" },
        ].map((link, idx) => {
          const Icon = link.icon;
          return (
            <Link
              key={idx}
              href={link.href}
              className={`col-span-6 md:col-span-3 glass-card neon-glow hover:neon-glow-active p-5 rounded-2xl border border-border flex flex-col justify-between group bg-gradient-to-br ${link.bg} transition-all duration-300 ease-out active:scale-[0.98] hover:-translate-y-1.5 hover:scale-[1.03] ${link.hoverBorder}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-card border border-border shadow-sm transition-transform duration-300 group-hover:scale-110 ${link.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4">
                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors font-sans">{link.label}</p>
                <p className="text-[11px] text-muted-foreground font-semibold mt-1 font-sans leading-tight">{link.desc}</p>
              </div>
              <div className="flex justify-between items-center mt-4 pt-2 border-t border-border/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors font-sans">Open</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          );
        })}

      </div>
    </div>
  );
}
