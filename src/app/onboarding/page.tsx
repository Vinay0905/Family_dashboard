import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, PlusCircle, UserPlus, Info, CheckCircle2 } from "lucide-react";

function redirectWithError(message: string, tab: string = "create"): never {
  redirect(`/onboarding?tab=${tab}&error=${encodeURIComponent(message)}`);
}

async function createFamily(formData: FormData) {
  "use server";

  const familyName = String(formData.get("familyName") || "").trim();
  const displayName = String(formData.get("displayName") || "").trim();
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");
  if (!familyName) redirectWithError("Please enter a family name.", "create");

  const { data: family, error } = await supabase
    .from("families")
    .insert({ name: familyName, created_by: userData.user.id })
    .select("id")
    .single();

  if (error || !family) {
    redirectWithError(error?.message ?? "Could not create family.", "create");
  }

  const finalDisplayName = displayName || userData.user.user_metadata?.display_name || userData.user.email;

  const { error: memberError } = await supabase.from("family_members").insert({
    family_id: family.id,
    user_id: userData.user.id,
    role: "admin",
    display_name: finalDisplayName,
  });

  if (memberError) {
    redirectWithError(memberError.message, "create");
  }

  // Also update user metadata display_name if not set
  if (displayName) {
    await supabase.auth.updateUser({
      data: { display_name: displayName }
    });
  }

  redirect("/dashboard");
}

async function joinFamily(formData: FormData) {
  "use server";

  const inviteCode = String(formData.get("inviteCode") || "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") || "").trim();
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");
  if (!inviteCode) redirectWithError("Please enter an invite code.", "join");

  const finalDisplayName = displayName || userData.user.user_metadata?.display_name || userData.user.email || "Family Member";

  // Use RPC to join because RLS restricts SELECT queries on families for non-members
  const { error: joinError } = await supabase.rpc("join_family_by_code" as any, {
    invite_code_input: inviteCode,
    display_name_input: finalDisplayName,
  });

  if (joinError) {
    redirectWithError(joinError.message || "Invalid invite code. Please check and try again.", "join");
  }

  // Update user metadata display_name if provided
  if (displayName) {
    await supabase.auth.updateUser({
      data: { display_name: displayName }
    });
  }

  redirect("/dashboard");
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  // Check if they are already in a family
  const { data: member } = await supabase
    .from("family_members")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (member) redirect("/dashboard");

  const params = await searchParams;
  const activeTab = params.tab === "join" ? "join" : "create";
  const defaultDisplayName = data.user.user_metadata?.display_name || "";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6 lg:px-8">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-tertiary/10 blur-[120px]" />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded bg-primary text-white shadow-lg shadow-primary/20">
            <Heart className="h-7 w-7 fill-current animate-pulse text-white" />
          </div>
          <h2 className="mt-6 font-heading text-4xl font-extrabold tracking-tight text-on-surface">
            Welcome to <span className="text-primary italic">FamAssist</span>
          </h2>
          <p className="mt-2 font-sans text-sm text-on-surface-variant font-medium">
            Create a new family space or join an existing one to get started
          </p>
        </div>

        {/* Card Container */}
        <div className="mt-8 glass-card p-6 rounded-2xl shadow-xl">
          
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-2 rounded bg-surface-container p-1 border border-outline-variant">
            <Link
              href="/onboarding?tab=create"
              className={`flex items-center justify-center gap-2 rounded py-2 text-xs font-bold transition-all ${
                activeTab === "create"
                  ? "bg-primary text-white shadow-sm"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              Create Family
            </Link>
            <Link
              href="/onboarding?tab=join"
              className={`flex items-center justify-center gap-2 rounded py-2 text-xs font-bold transition-all ${
                activeTab === "join"
                  ? "bg-primary text-white shadow-sm"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Join Family
            </Link>
          </div>

          {params.error ? (
            <div className="mt-4 rounded border border-primary/20 bg-primary/5 p-3 text-sm text-primary flex items-start gap-2 font-medium">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{params.error}</span>
            </div>
          ) : null}

          {/* Create Form */}
          {activeTab === "create" ? (
            <form action={createFamily} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Your Display Name
                </Label>
                <Input
                  id="displayName"
                  name="displayName"
                  placeholder="Dad, Mom, Alex..."
                  defaultValue={defaultDisplayName}
                  className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="familyName" className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Family Name
                </Label>
                <Input
                  id="familyName"
                  name="familyName"
                  placeholder="e.g. The Sharma Family"
                  className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary font-medium"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary font-bold text-white shadow-lg shadow-primary/10 transition-all hover:bg-primary-container active:scale-[0.98] rounded h-10 cursor-pointer"
              >
                Create Family
              </Button>
            </form>
          ) : (
            /* Join Form */
            <form action={joinFamily} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Your Display Name
                </Label>
                <Input
                  id="displayName"
                  name="displayName"
                  placeholder="Dad, Mom, Alex..."
                  defaultValue={defaultDisplayName}
                  className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inviteCode" className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Invite Code
                </Label>
                <Input
                  id="inviteCode"
                  name="inviteCode"
                  placeholder="e.g. A1B2C3D4"
                  className="uppercase tracking-widest font-mono bg-surface-container-lowest border-outline-variant rounded focus:border-primary font-bold"
                  required
                  maxLength={8}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary font-bold text-white shadow-lg shadow-primary/10 transition-all hover:bg-primary-container active:scale-[0.98] rounded h-10 cursor-pointer"
              >
                Join Family
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
