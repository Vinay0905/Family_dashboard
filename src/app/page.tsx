import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  CheckSquare,
  ShoppingCart,
  WalletCards,
  Users,
  Sparkles,
  ArrowRight,
  Heart,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-on-surface font-sans">
      {/* Background ambient light effects */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />
      <div className="absolute top-1/3 right-1/4 h-[600px] w-[600px] translate-x-1/2 rounded-full bg-tertiary/10 blur-[120px]" />

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-outline-variant bg-surface-container-lowest/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-white shadow-md shadow-primary/20">
              <Heart className="h-5 w-5 fill-current" />
            </div>
            <span className="font-heading text-2xl font-black tracking-tight text-on-surface">
              Fam<span className="text-primary italic">Assist</span>
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors"
            >
              Log in
            </Link>
            <Button asChild className="bg-primary hover:bg-primary-container text-white font-bold transition-all px-4 rounded h-9">
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 rounded bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary border border-primary/25">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>Coordinating homes, simplifying lives</span>
          </div>

          {/* Heading */}
          <h1 className="mt-8 max-w-4xl font-heading text-5xl font-black tracking-tight text-on-surface sm:text-7xl/tight">
            The private organizer for your{" "}
            <span className="text-primary italic">entire family</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-2xl font-sans text-base text-on-surface-variant font-medium sm:text-lg">
            A single, secure dashboard to manage family calendars, coordinate lists, tracking tasks, sharing expenses, and keeping everyone connected.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary-container text-white px-8 h-12 shadow-lg shadow-primary/15 font-bold transition-all rounded">
              <Link href="/signup" className="flex items-center gap-2">
                Get Started For Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-outline-variant text-on-surface hover:border-primary hover:text-primary h-12 px-8 font-bold transition-all rounded bg-surface-container-lowest">
              <Link href="/login">Log in to Dashboard</Link>
            </Button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-28 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1 */}
          <div className="glass-card p-6 rounded shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/15 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-heading text-xl font-bold text-on-surface">Family Calendar</h3>
              <p className="mt-2 font-sans text-xs text-on-surface-variant font-medium leading-relaxed">
                Sync school events, sports games, doctor appointments, and trips in one shared agenda.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-6 rounded shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded bg-tertiary/15 text-tertiary">
                <CheckSquare className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-heading text-xl font-bold text-on-surface">Shared Tasks</h3>
              <p className="mt-2 font-sans text-xs text-on-surface-variant font-medium leading-relaxed">
                Assign household chores, set priorities, track homework, and celebrate finished lists together.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-card p-6 rounded shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded bg-secondary-container/20 text-secondary">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-heading text-xl font-bold text-on-surface">Shopping Lists</h3>
              <p className="mt-2 font-sans text-xs text-on-surface-variant font-medium leading-relaxed">
                Real-time shopping lists so anyone can add items on the fly and mark them as bought.
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="glass-card p-6 rounded shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded bg-[#006970]/10 text-[#006970]">
                <WalletCards className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-heading text-xl font-bold text-on-surface">Expense Tracker</h3>
              <p className="mt-2 font-sans text-xs text-on-surface-variant font-medium leading-relaxed">
                Keep budget records, log shared utility bills, track groceries, and split the balances cleanly.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant bg-surface-container-lowest/50 py-8 text-center text-xs font-bold text-on-surface-variant">
        <p>© {new Date().getFullYear()} FamAssist. Securely stored, privately shared.</p>
      </footer>
    </div>
  );
}