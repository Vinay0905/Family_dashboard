"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dock } from "@/components/ui/dock-two";
import { FamilyAvatars } from "@/components/ui/family-avatars";
import {
  CalendarDays,
  CheckSquare,
  Home,
  ShoppingCart,
  WalletCards,
  Copy,
  Check,
  Settings,
  Wrench,
  CreditCard,
  Plane,
  FileText,
  User,
  Users,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid
} from "lucide-react";
import { useAppStore } from "@/lib/store";

type AppShellProps = {
  children: React.ReactNode;
  familyName: string;
  displayName: string;
  inviteCode?: string;
};

const linkGroups = [
  {
    title: "Workspace",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/shopping", label: "Shopping", icon: ShoppingCart },
      { href: "/expenses", label: "Expenses", icon: WalletCards },
    ]
  },
  {
    title: "Planning",
    links: [
      { href: "/maintenance", label: "Maintenance", icon: Wrench },
      { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
      { href: "/holiday", label: "Holiday Planner", icon: Plane },
    ]
  },
  {
    title: "Vault & Contacts",
    links: [
      { href: "/documents", label: "Document Vault", icon: FileText },
      { href: "/contacts", label: "Useful Contacts", icon: User },
    ]
  },
  {
    title: "System",
    links: [
      { href: "/settings", label: "Settings", icon: Settings },
    ]
  }
];

export function AppShell({ children, familyName, displayName, inviteCode }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { familyMembers } = useAppStore();

  async function handleCopy() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy invite code:", err);
    }
  }

  // Active link helper
  const isLinkActive = (href: string) => pathname === href;

  // Build items for the floating glass Dock
  const dockItems = [
    { icon: Home, label: "Home", href: "/dashboard", active: isLinkActive("/dashboard") },
    { icon: CalendarDays, label: "Calendar", href: "/calendar", active: isLinkActive("/calendar") },
    { icon: CheckSquare, label: "Tasks", href: "/tasks", active: isLinkActive("/tasks") },
    { icon: ShoppingCart, label: "Shopping", href: "/shopping", active: isLinkActive("/shopping") },
    { icon: WalletCards, label: "Expenses", href: "/expenses", active: isLinkActive("/expenses") },
    { 
      icon: LayoutGrid, 
      label: "More", 
      onClick: () => setMoreOpen(true),
      active: moreOpen 
    },
    { icon: Settings, label: "Settings", href: "/settings", active: isLinkActive("/settings") }
  ].map(item => {
    if (item.href) {
      return {
        ...item,
        onClick: () => router.push(item.href)
      };
    }
    return item;
  });

  return (
    <div className="min-h-screen bg-transparent text-foreground font-sans flex flex-col md:flex-row relative">
      
      {/* ─── DYNAMIC AURORA SHADER BACKGROUND ───────────────── */}
      <div className="aurora-bg-container" aria-hidden="true">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>
      
      {/* ─── DESKTOP SIDEBAR ─────────────────────────────────── */}
      <aside className={cn(
        "hidden md:flex md:flex-col w-64 shrink-0 h-screen sticky top-0 p-4 gap-4 select-none",
        "backdrop-blur-xl border-r border-sidebar-border/40 shadow-xl transition-all duration-300",
        "bg-sidebar/80",
        sidebarCollapsed && "md:hidden"
      )}>
        {/* Sidebar Header */}
        <div className="px-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-quicksand text-lg font-bold text-primary leading-tight truncate max-w-[140px]" title={familyName}>
                {familyName}
              </h2>
              <p className="text-[10px] text-sidebar-foreground/80 font-bold tracking-wider uppercase opacity-85">
                {displayName}
              </p>
              {familyMembers && familyMembers.length > 0 && (
                <FamilyAvatars 
                  names={familyMembers.map(m => m.display_name || "Member")} 
                  size="sm" 
                  className="mt-1.5"
                />
              )}
            </div>
          </div>

          {inviteCode && (
            <button
              onClick={handleCopy}
              className="mt-4 w-full flex items-center justify-between rounded-xl bg-muted/65 border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors group cursor-pointer"
            >
              <span className="font-medium">Invite Code: <code className="font-mono text-primary font-bold">{inviteCode}</code></span>
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          )}
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {linkGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <h5 className="px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/50">
                {group.title}
              </h5>
              <div className="space-y-1">
                {group.links.map((link) => {
                  const active = isLinkActive(link.href);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 active:scale-[0.98]",
                        active
                          ? "bg-primary text-primary-foreground font-bold shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary-foreground" : "text-sidebar-foreground/70")} />
                      <span className="text-xs font-semibold">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Collapse Toggle Button */}
        <div className="mt-auto pt-4 border-t border-sidebar-border/30">
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold">Collapse Sidebar</span>
          </button>
        </div>
      </aside>

      {/* ─── MOBILE TOP APP BAR ────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-40 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex justify-between items-center select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
            <Users className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="font-quicksand text-base font-bold text-primary leading-tight truncate max-w-[180px]">{familyName}</h1>
            <p className="text-[9px] text-muted-foreground font-bold tracking-wider uppercase opacity-80">{displayName}</p>
          </div>
        </div>

        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all"
          title="Toggle Navigation Menu"
        >
          {moreOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* ─── MAIN CONTENT CONTAINER ─────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className={cn(
          "flex-grow px-4 md:px-16 py-6 relative transition-all duration-300",
          (sidebarCollapsed || true) ? "pb-32 md:pb-28" : "pb-24 md:pb-8"
        )}>
          {children}
        </main>
      </div>

      {/* ─── FLOATING DOCK (NAVBAR OPTIMISATION) ─────────────── */}
      <div className={cn(
        "fixed bottom-6 left-0 right-0 z-40 mx-auto px-4 pointer-events-none select-none transition-all duration-300",
        sidebarCollapsed ? "block" : "block md:hidden"
      )}>
        <div className="pointer-events-auto">
          <Dock items={dockItems} />
        </div>
      </div>

      {/* ─── FLOATING SIDEBAR EXPAND TRIGGER (DESKTOP) ─────────── */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="hidden md:flex fixed bottom-6 left-6 z-50 p-3.5 rounded-xl backdrop-blur-xl border border-border/60 bg-background/80 hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95 shadow-xl transition-all glass-card cursor-pointer group"
          title="Expand Sidebar"
        >
          <ChevronRight className="h-5 w-5 text-primary group-hover:text-accent-foreground transition-colors" />
        </button>
      )}

      {/* ─── MORE MENU OVERLAY ──────────────────────────────── */}
      <AnimatePresence>
        {moreOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            
            {/* Content Card */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={cn(
                "relative w-full max-w-2xl rounded-t-3xl md:rounded-2xl p-6 z-10",
                "backdrop-blur-xl border border-border/80 shadow-2xl",
                "bg-background/90 text-foreground max-h-[85vh] overflow-y-auto",
                "glass-card"
              )}
            >
              <div className="flex justify-between items-center mb-6 pb-2 border-b border-border/40">
                <div>
                  <h3 className="font-serif text-xl font-bold text-primary">All Navigation</h3>
                  <p className="text-xs text-muted-foreground">Access all family workspace tools</p>
                </div>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-2 rounded-xl bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {linkGroups.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-1">
                      {group.title}
                    </h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      {group.links.map((link) => {
                        const active = isLinkActive(link.href);
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMoreOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 active:scale-[0.98]",
                              active
                                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                                : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="text-xs font-semibold">{link.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}