"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, 
  Menu, 
  X, 
  Home, 
  CalendarDays, 
  CheckSquare, 
  ShoppingCart, 
  Settings 
} from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/shopping", label: "Shop", icon: ShoppingCart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TopBar({ familyName }: { familyName: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-primary/10 bg-surface-container-lowest/80 backdrop-blur px-4 py-3 md:hidden flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center text-primary">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-sm text-primary leading-tight">{familyName}</h1>
          <p className="font-sans text-[10px] text-on-surface-variant opacity-60 font-semibold tracking-wider uppercase">Family HQ</p>
        </div>
      </div>

      <div className="relative">
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-9 h-9 flex items-center justify-center text-on-surface hover:text-primary rounded border border-outline-variant/60 bg-surface-container-lowest transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {menuOpen && (
          <>
            {/* Backdrop overlay */}
            <div 
              className="fixed inset-0 z-40 bg-black/5 backdrop-blur-xs md:hidden" 
              onClick={() => setMenuOpen(false)} 
            />
            
            {/* Dropdown Box */}
            <div className="absolute right-0 top-11 z-50 w-52 glass-card rounded p-3 shadow-xl md:hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="space-y-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 rounded p-2.5 transition-all ${
                        isActive
                          ? "bg-primary/10 text-primary font-bold border border-primary/20"
                          : "text-on-surface-variant hover:text-primary hover:bg-primary/5 border border-transparent"
                      }`}
                    >
                      <link.icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-primary" : "text-on-surface-variant/60"}`} />
                      <span className="font-sans text-xs font-bold">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}