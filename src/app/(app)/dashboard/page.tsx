import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentFamilyForUser, getDashboardCounts } from "@/services/dashboard.service";
import { 
  CalendarDays, 
  TrendingUp, 
  ShoppingBag, 
  AlertTriangle,
  ArrowRight,
  TrendingDown
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const member = await getCurrentFamilyForUser(data.user.id);
  if (!member) {
    redirect("/onboarding");
  }
  const counts = await getDashboardCounts(member.family_id);

  // Format today's date
  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-12">
      {/* Top App Bar Title */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="font-heading text-4xl md:text-5xl text-on-background tracking-tight font-extrabold">
            Good morning, <span className="text-primary animate-neon-text">{member.display_name || "there"}</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 flex items-center gap-2 font-medium">
            <span className="material-symbols-outlined text-primary text-[18px]">calendar_month</span>
            {todayStr}
          </p>
        </div>
      </header>

      {/* Bento Grid Dashboard */}
      <div className="bento-grid">
        {/* Widget: Today's Events (Large Span) */}
        <section className="col-span-12 lg:col-span-8 glass-card p-6 rounded flex flex-col justify-between min-h-[260px]">
          <div className="flex justify-between items-center">
            <h3 className="font-heading text-xl font-bold flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">calendar_today</span>
              Today's Agenda
            </h3>
            <span className="text-primary font-sans text-xs font-bold uppercase tracking-wider bg-primary/10 px-3 py-1 rounded">
              {counts.todayEvents} Events
            </span>
          </div>

          <div className="my-6">
            {counts.todayEvents === 0 ? (
              <p className="text-on-surface-variant font-medium text-sm">
                No events scheduled for today. Have a relaxed day!
              </p>
            ) : (
              <p className="text-on-surface-variant font-medium text-sm">
                You have {counts.todayEvents} event{counts.todayEvents > 1 ? "s" : ""} scheduled for today.
              </p>
            )}
          </div>

          <Link 
            href="/calendar" 
            className="self-start flex items-center gap-2 text-primary font-sans text-xs font-bold uppercase tracking-widest hover:translate-x-1 transition-transform"
          >
            View Calendar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        {/* Widget: Expenses Sparkline */}
        <section className="col-span-12 lg:col-span-4 glass-card p-6 rounded flex flex-col justify-between overflow-hidden min-h-[260px]">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-heading text-lg font-bold text-on-surface">Monthly Spend</h3>
              <span className="material-symbols-outlined text-primary">trending_up</span>
            </div>
            <p className="text-3xl font-heading font-extrabold text-on-background">₹{counts.expensesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-on-surface-variant mt-1 font-semibold">
              Current Billing Month
            </p>
          </div>
          <div className="h-20 mt-4 relative">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
              <path className="sparkline-svg" d="M0,35 Q10,32 20,38 T40,25 T60,30 T80,10 T100,5" fill="none" stroke="#b7004f" strokeWidth="2"></path>
              <path d="M0,35 Q10,32 20,38 T40,25 T60,30 T80,10 T100,5 L100,40 L0,40 Z" fill="url(#gradient)" opacity="0.1"></path>
              <defs>
                <linearGradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: "#b7004f", stopOpacity: 1 }}></stop>
                  <stop offset="100%" style={{ stopColor: "#b7004f", stopOpacity: 0 }}></stop>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </section>

        {/* Widget: Tasks Due */}
        <section className="col-span-12 md:col-span-6 lg:col-span-4 glass-card p-6 rounded flex flex-col justify-between min-h-[240px]">
          <div className="flex justify-between items-center">
            <h3 className="font-heading text-lg font-bold flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">checklist</span>
              Active Tasks
            </h3>
          </div>
          <div className="my-6">
            <p className="text-2xl font-heading font-extrabold text-on-background">{counts.openTasks} Pending</p>
            <p className="text-xs text-on-surface-variant font-semibold mt-1">Chores & tasks requiring action</p>
          </div>
          <Link 
            href="/tasks" 
            className="flex items-center gap-2 text-primary font-sans text-xs font-bold uppercase tracking-widest hover:translate-x-1 transition-transform"
          >
            Check Task List <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        {/* Widget: Shopping Status */}
        <section className="col-span-12 md:col-span-6 lg:col-span-4 glass-card p-6 rounded flex flex-col justify-between min-h-[240px]">
          <div className="flex justify-between items-center">
            <h3 className="font-heading text-lg font-bold flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">shopping_bag</span>
              Shopping List
            </h3>
          </div>
          <div className="my-6">
            <p className="text-2xl font-heading font-extrabold text-on-background">{counts.shoppingItems} Items</p>
            <p className="text-xs text-on-surface-variant font-semibold mt-1">To buy from stores</p>
          </div>
          <Link 
            href="/shopping" 
            className="flex items-center gap-2 text-primary font-sans text-xs font-bold uppercase tracking-widest hover:translate-x-1 transition-transform"
          >
            Go Shopping <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>

        {/* Widget: Maintenance & Planning Alerts */}
        <section className="col-span-12 md:col-span-12 lg:col-span-4 glass-card p-6 rounded bg-primary/5 border-primary/20 flex flex-col justify-between min-h-[240px]">
          <div className="flex justify-between items-center">
            <h3 className="font-heading text-lg font-bold flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-primary">engineering</span>
              Planning
            </h3>
          </div>
          <div className="my-4 flex flex-col gap-2">
            <Link href="/maintenance" className="flex items-center justify-between p-2 rounded bg-white/50 border border-primary/10 hover:bg-white text-xs font-semibold">
              <span>Maintenance Assets</span>
              <span className="material-symbols-outlined text-[16px] text-primary">arrow_forward</span>
            </Link>
            <Link href="/subscriptions" className="flex items-center justify-between p-2 rounded bg-white/50 border border-primary/10 hover:bg-white text-xs font-semibold">
              <span>Subscribed Services</span>
              <span className="material-symbols-outlined text-[16px] text-primary">arrow_forward</span>
            </Link>
          </div>
          <Link 
            href="/holiday" 
            className="flex items-center gap-2 text-primary font-sans text-xs font-bold uppercase tracking-widest hover:translate-x-1 transition-transform"
          >
            Holiday Planner <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>

      {/* Atmospheric Brand Watermark */}
      <div className="fixed bottom-0 right-0 p-8 pointer-events-none opacity-[0.03] hidden lg:block select-none">
        <p className="text-[120px] font-heading font-extrabold leading-none text-primary uppercase select-none">FAM<br/>ASSIST</p>
      </div>
    </div>
  );
}