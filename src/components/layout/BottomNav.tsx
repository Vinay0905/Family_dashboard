"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckSquare, Home, Menu, ShoppingCart } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/shopping", label: "Shop", icon: ShoppingCart },
  { href: "/settings", label: "Settings", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t border-primary/15 bg-surface-container-lowest z-40 md:hidden">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
              isActive
                ? "text-primary font-bold"
                : "text-on-surface-variant/70 hover:text-primary"
            }`}
          >
            <link.icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-on-surface-variant/50"}`} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}