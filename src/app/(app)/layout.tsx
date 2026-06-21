import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const { data: member } = await supabase
    .from("family_members")
    .select("display_name, role, family_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!member) redirect("/onboarding");

  const { data: family } = await supabase
    .from("families")
    .select("name, invite_code")
    .eq("id", member.family_id)
    .maybeSingle();

  if (!family) redirect("/onboarding");

  return (
    <AppShell
      familyName={family?.name ?? "Family"}
      displayName={member.display_name ?? userData.user.email ?? "You"}
      inviteCode={family?.invite_code ?? ""}
    >
      {children}
    </AppShell>
  );
}
