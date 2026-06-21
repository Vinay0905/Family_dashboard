"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, ShieldCheck, Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#faf8ff] px-4 py-12 sm:px-6 lg:px-8">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-tertiary/10 blur-[120px]" />

      <div className="relative w-full max-w-md">
        {/* Logo/Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded bg-primary text-white shadow-lg shadow-primary/20">
            <Heart className="h-7 w-7 fill-current animate-pulse text-white" />
          </div>
          <h2 className="mt-6 font-heading text-4xl font-extrabold tracking-tight text-on-surface">
            Welcome <span className="text-primary italic">Back</span>
          </h2>
          <p className="mt-2 font-sans text-sm text-on-surface-variant font-medium">
            Log in to access your family dashboard
          </p>
        </div>

        {/* Form Container Card */}
        <div className="mt-8 glass-card p-8 rounded shadow-xl">
          <form onSubmit={onSubmit} className="space-y-5">
            {error ? (
              <div className="rounded border border-primary/20 bg-primary/5 p-3 text-sm text-primary flex items-start gap-2 animate-shake font-medium">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute top-2.5 left-3 h-4 w-4 text-on-surface-variant" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-10 bg-surface-container-lowest border-outline-variant rounded focus:border-primary font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute top-2.5 left-3 h-4 w-4 text-on-surface-variant" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-10 pr-10 bg-surface-container-lowest border-outline-variant rounded focus:border-primary font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-2.5 right-3 text-on-surface-variant hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary font-bold text-white shadow-lg shadow-primary/10 transition-all hover:bg-primary-container active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 rounded h-10 cursor-pointer"
            >
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <div className="mt-6 border-t border-surface-container pt-4 text-center">
            <p className="font-sans text-sm text-on-surface-variant font-medium">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="font-bold text-primary transition-colors hover:text-primary-container hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}