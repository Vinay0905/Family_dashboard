"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  X
} from "lucide-react";

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
  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col md:flex-row">
      
      {/* ─── DESKTOP SIDEBAR ─────────────────────────────────── */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0 p-4 gap-4 select-none">
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
            </div>
          </div>

          {inviteCode && (
            <button
              onClick={handleCopy}
              className="mt-4 w-full flex items-center justify-between rounded-xl bg-muted border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors group cursor-pointer"
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
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 active:scale-[0.98] ${
                        active
                          ? "bg-primary text-primary-foreground font-bold shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary-foreground" : "text-sidebar-foreground/70"}`} />
                      <span className="text-xs font-semibold">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
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
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground border border-border hover:bg-accent active:scale-95 transition-all"
          title="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Mobile Navigation Dropdown Overlay */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 top-16 z-30 bg-black/10 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute top-16 left-0 right-0 z-40 bg-card border-b border-border p-4 max-h-[80vh] overflow-y-auto animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="grid grid-cols-2 gap-2">
                {linkGroups.flatMap(g => g.links).map((link) => {
                  const active = isLinkActive(link.href);
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl p-3 transition-all active:scale-95 ${
                        active
                          ? "bg-primary text-primary-foreground font-bold shadow-md"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-semibold">{link.label}</span>
                    </Link>
                  );
                })}
              </div>

              {inviteCode && (
                <div className="mt-4 border-t border-border pt-4">
                  <button
                    onClick={handleCopy}
                    className="w-full flex items-center justify-between rounded-xl bg-muted border border-border px-3 py-2 text-xs text-muted-foreground"
                  >
                    <span>Invite Code: <code className="font-mono text-primary font-bold">{inviteCode}</code></span>
                    {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </header>

      {/* ─── MAIN CONTENT CONTAINER ─────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-grow px-4 md:px-16 py-6 pb-24 md:pb-8 relative">
          {children}
        </main>
      </div>

      {/* ─── MOBILE BOTTOM NAV BAR ───────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-2 py-2 bg-card/90 backdrop-blur shadow-md rounded-t-2xl border-t border-border">
        {[
          { href: "/dashboard", label: "Home", icon: Home },
          { href: "/calendar", label: "Calendar", icon: CalendarDays },
          { href: "/tasks", label: "Tasks", icon: CheckSquare },
          { href: "/shopping", label: "Shopping", icon: ShoppingCart },
          { href: "/settings", label: "Settings", icon: Settings },
        ].map((link) => {
          const active = isLinkActive(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-xl transition-all active:scale-95 ${
                active
                  ? "bg-primary/15 text-primary font-bold"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold mt-0.5">{link.label}</span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}