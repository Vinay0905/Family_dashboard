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
  Users
} from "lucide-react";

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

export function Sidebar({
  familyName,
  displayName,
  inviteCode,
}: {
  familyName: string;
  displayName: string;
  inviteCode?: string;
}) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

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

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-primary/15 bg-surface-container-lowest md:flex md:flex-col z-40 p-4 gap-2 shadow-[10px_0_30px_rgba(183,0,79,0.03)]">
      <div className="mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-container rounded flex items-center justify-center text-white font-bold shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="overflow-hidden">
            <h2 className="font-heading text-xl text-primary leading-tight font-bold truncate">{familyName}</h2>
            <p className="font-sans text-[11px] text-on-surface-variant opacity-60 font-semibold tracking-wider uppercase">{displayName}</p>
          </div>
        </div>

        {inviteCode ? (
          <div className="mt-4 flex items-center justify-between rounded bg-surface-container-low border border-primary/10 px-3 py-1.5 text-xs">
            <span className="text-on-surface-variant font-medium">Code: <code className="font-mono text-primary font-bold">{inviteCode}</code></span>
            <button
              onClick={handleCopy}
              className="text-primary hover:brightness-110 transition-all cursor-pointer"
              title="Copy Invite Code"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-secondary" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto p-1 space-y-4">
        {linkGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <h5 className="px-3 text-[10px] font-bold uppercase tracking-wider text-primary/60">
              {group.title}
            </h5>
            <div className="space-y-1">
              {group.links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 rounded p-2.5 transition-all duration-200 ${
                      isActive
                        ? "text-primary font-bold bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(183,0,79,0.03)]"
                        : "text-on-surface-variant hover:text-primary hover:bg-primary/5 border border-transparent"
                    }`}
                  >
                    <link.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-on-surface-variant/60"}`} />
                    <span className="font-sans text-xs font-semibold">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}