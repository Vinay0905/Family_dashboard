"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Heart, User, Settings, LogOut, Copy, Check, Shield, Users } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [family, setFamily] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          router.push("/login");
          return;
        }
        setUser(userData.user);

        // Fetch family member profile
        const { data: memberData, error: memberError } = await supabase
          .from("family_members")
          .select("family_id, display_name, role")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (memberError || !memberData) {
          router.push("/onboarding");
          return;
        }
        setMember(memberData);

        // Fetch family details
        const { data: familyData, error: familyError } = await supabase
          .from("families")
          .select("name, invite_code")
          .eq("id", memberData.family_id)
          .maybeSingle();

        if (!familyError && familyData) {
          setFamily(familyData);
        }

        // Fetch all family members
        const { data: membersData } = await supabase
          .from("family_members")
          .select("id, user_id, display_name, role, joined_at")
          .eq("family_id", memberData.family_id)
          .order("joined_at", { ascending: true });

        if (membersData) {
          setAllMembers(membersData);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, router]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out failed:", err);
      setSigningOut(false);
    }
  }

  async function handleCopy() {
    if (!family?.invite_code) return;
    try {
      await navigator.clipboard.writeText(family.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy invite code:", err);
    }
  }

  async function handleChangeRole(memberId: string, newRole: "admin" | "member" | "child") {
    try {
      const { error } = await supabase
        .from("family_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;
      
      setAllMembers(
        allMembers.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      console.error("Failed to update role:", err);
      alert("Failed to update member role.");
    }
  }

  async function handleKickMember(memberId: string, name: string) {
    if (!confirm(`Are you sure you want to remove ${name} from the family?`)) return;

    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      setAllMembers(allMembers.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error("Failed to remove member:", err);
      alert("Failed to remove family member.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
          Family <span className="text-primary italic">Settings</span>
        </h1>
        <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
          Manage your account profile, check invite codes, and manage family workspace members.
        </p>
      </div>

      <div className="space-y-8">
        {/* User Profile Info */}
        <div className="glass-card p-6 rounded shadow-sm">
          <div className="flex items-center gap-4 border-b border-primary/10 pb-4 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded bg-primary/10 text-primary">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold text-on-surface">Your Profile</h3>
              <p className="font-sans text-xs text-on-surface-variant font-medium">Personal account identification details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 items-center border-b border-surface-container pb-3">
              <span className="text-sm font-semibold text-on-surface-variant">Display Name</span>
              <span className="col-span-2 text-sm text-on-surface font-bold">
                {member?.display_name || user?.user_metadata?.display_name || "Not set"}
              </span>
            </div>
            <div className="grid grid-cols-3 items-center pb-1">
              <span className="text-sm font-semibold text-on-surface-variant">Email Address</span>
              <span className="col-span-2 text-sm text-on-surface font-mono font-bold">
                {user?.email}
              </span>
            </div>
          </div>
        </div>

        {/* Family Organization Details */}
        <div className="glass-card p-6 rounded shadow-sm">
          <div className="flex items-center gap-4 border-b border-primary/10 pb-4 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded bg-secondary-container/20 text-secondary-container">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-heading text-xl font-bold text-on-surface">Family Details</h3>
              <p className="font-sans text-xs text-on-surface-variant font-medium">Workspace details and invite code configuration</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 items-center border-b border-surface-container pb-3">
              <span className="text-sm font-semibold text-on-surface-variant">Family Name</span>
              <span className="col-span-2 text-sm text-on-surface font-bold">
                {family?.name ?? "No Family"}
              </span>
            </div>

            <div className="grid grid-cols-3 items-center border-b border-surface-container pb-3">
              <span className="text-sm font-semibold text-on-surface-variant">Your Role</span>
              <span className="col-span-2">
                <span className="inline-flex items-center gap-1 rounded bg-tertiary/10 px-2.5 py-0.5 text-xs font-bold text-tertiary capitalize">
                  <Shield className="h-3 w-3" />
                  {member?.role ?? "Member"}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-3 items-center pb-1">
              <span className="text-sm font-semibold text-on-surface-variant">Invite Code</span>
              <div className="col-span-2 flex items-center gap-3">
                <code className="rounded bg-surface-container px-2 py-1 font-mono text-sm font-bold text-primary select-all">
                  {family?.invite_code}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 gap-1.5 text-xs cursor-pointer border-outline-variant hover:border-primary text-primary font-bold transition-all rounded bg-surface-container-lowest"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Family Member Management (Only shown if member database loaded) */}
        {allMembers.length > 0 && (
          <div className="glass-card p-6 rounded shadow-sm">
            <div className="flex items-center gap-4 border-b border-primary/10 pb-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-tertiary/10 text-tertiary">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-on-surface">Family Members</h3>
                <p className="font-sans text-xs text-on-surface-variant font-medium">
                  {member?.role === "admin"
                    ? "Manage roles and remove members from this family workspace."
                    : "View active members in this family space."}
                </p>
              </div>
            </div>

            <div className="divide-y divide-surface-container">
              {allMembers.map((m) => {
                const isSelf = m.user_id === user?.id;
                const isAdmin = member?.role === "admin";
                
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <span className="text-sm font-bold text-on-surface">
                        {m.display_name || "Unknown Member"} {isSelf ? "(You)" : ""}
                      </span>
                      <span className="block text-[10px] text-on-surface-variant font-medium mt-0.5">
                        Joined on {new Date(m.joined_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Role selection / display */}
                      {isAdmin && !isSelf ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleChangeRole(m.id, e.target.value as any)}
                          className="rounded border border-outline-variant bg-surface-container-lowest px-2 py-1 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="child">Child</option>
                        </select>
                      ) : (
                        <span className="inline-flex items-center rounded bg-surface-container border border-outline-variant px-2.5 py-0.5 text-xs font-bold text-on-surface-variant capitalize">
                          {m.role}
                        </span>
                      )}

                      {/* Kick action button (Only available to Admins, cannot kick self) */}
                      {isAdmin && !isSelf && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleKickMember(m.id, m.display_name)}
                          className="h-7 text-xs text-primary border-outline-variant hover:bg-primary hover:text-white hover:border-primary cursor-pointer font-bold transition-all rounded"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Danger/Action Zone */}
        <div className="border border-primary/20 bg-primary/5 p-6 rounded shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-heading text-lg font-bold text-primary">Session Actions</h3>
              <p className="font-sans text-xs text-on-surface-variant font-medium">Log out of your family workspace session on this device.</p>
            </div>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              disabled={signingOut}
              className="gap-2 shrink-0 bg-primary hover:bg-primary-container text-white font-bold cursor-pointer active:scale-[0.98] transition-all rounded"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? "Logging out..." : "Log out"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
