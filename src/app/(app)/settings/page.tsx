"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Heart,
  User,
  Settings,
  LogOut,
  Copy,
  Check,
  Shield,
  Users,
  Info,
  Share2,
  LogIn,
  Download,
  History,
  Trash2
} from "lucide-react";

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
  const [joinCode, setJoinCode] = useState("");
  const [joiningFamily, setJoiningFamily] = useState(false);
  const [leavingFamily, setLeavingFamily] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Code copied to clipboard!");

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
          .select("id, family_id, display_name, role")
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

  const resetApp = useAppStore((state) => state.resetApp);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      resetApp();
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
      setToastMessage("Invite code copied to clipboard!");
      setShowToast(true);
      setTimeout(() => {
        setCopied(false);
        setShowToast(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy invite code:", err);
    }
  }

  async function handleShare() {
    if (!family?.invite_code) return;
    const inviteLink = `${window.location.origin}/onboarding?tab=join`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join our Family on Fam_Assist",
          text: `Use my invite code ${family.invite_code} to join our family hub!`,
          url: inviteLink,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`Invite code: ${family.invite_code}\nLink: ${inviteLink}`);
        setToastMessage("Invitation info copied to clipboard!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  }

  async function handleJoinFamily(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoiningFamily(true);
    try {
      const finalDisplayName = member?.display_name || user?.user_metadata?.display_name || user?.email || "Family Member";
      const { error: joinError } = await supabase.rpc("join_family_by_code" as any, {
        invite_code_input: joinCode.trim().toUpperCase(),
        display_name_input: finalDisplayName,
      });

      if (joinError) throw joinError;

      alert("Successfully joined the family!");
      window.location.reload();
    } catch (err: any) {
      console.error("Failed to join family:", err);
      alert(err.message || "Invalid invite code. Please check and try again.");
    } finally {
      setJoiningFamily(false);
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

  async function handleLeaveFamily() {
    if (!member) return;
    if (!confirm("Are you sure you want to leave this family? You will lose access to all shared lists, calendar events, and tasks.")) return;
    
    setLeavingFamily(true);
    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", member.id);

      if (error) throw error;
      alert("You have left the family.");
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      console.error("Failed to leave family:", err);
      alert("Failed to leave family.");
    } finally {
      setLeavingFamily(false);
    }
  }

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getAvatarColorClass = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-primary/10 text-primary border border-primary/20";
      case "member":
        return "bg-tertiary/10 text-tertiary border border-tertiary/20";
      case "child":
        return "bg-secondary/10 text-secondary border border-secondary/20";
      default:
        return "bg-surface-container-highest text-on-surface-variant";
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary capitalize">
            <Shield className="h-3 w-3" />
            Admin
          </span>
        );
      case "member":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/10 border border-tertiary/20 px-2.5 py-0.5 text-xs font-bold text-tertiary capitalize">
            Member
          </span>
        );
      case "child":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 border border-secondary/20 px-2.5 py-0.5 text-xs font-bold text-secondary capitalize">
            Child
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-container border border-outline-variant/30 px-2.5 py-0.5 text-xs font-bold text-on-surface-variant capitalize">
            {role}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-6 select-none">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-tertiary text-on-tertiary px-6 py-3 rounded-full shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 font-semibold text-sm">
          <Check className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 md:mb-8">
        <p className="font-sans text-xs md:text-sm text-on-surface-variant mb-1 uppercase tracking-wider font-bold">Settings Hub</p>
        <h2 className="font-heading text-3xl md:text-4xl text-on-surface font-bold tracking-tight">
          Manage Your <span className="text-primary italic">Household</span>
        </h2>
        <div className="h-1.5 w-24 bg-secondary-container rounded-full mt-3"></div>
      </div>

      <div className="bento-grid">
        {/* User Profile Card */}
        <div className="col-span-12 lg:col-span-5 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col justify-between group transition-all duration-300">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-on-surface">Your Profile</h3>
                <p className="font-sans text-xs text-on-surface-variant font-medium">Personal account identification details</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/25 mb-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${getAvatarColorClass(member?.role)}`}>
                {getInitials(member?.display_name || user?.email || "U")}
              </div>
              <div className="overflow-hidden">
                <p className="font-heading text-base font-bold text-on-surface truncate">
                  {member?.display_name || user?.user_metadata?.display_name || "Not set"}
                </p>
                <p className="font-sans text-xs text-on-surface-variant truncate font-medium">{user?.email}</p>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-on-surface-variant/70 italic mt-2">
            Workspace session started from {user?.email}
          </p>
        </div>

        {/* Family Details / Invite Card */}
        <div className="col-span-12 lg:col-span-7 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col justify-between group transition-all duration-300 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary opacity-5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-secondary-container/10 rounded-xl text-secondary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="font-sans text-[10px] text-secondary uppercase tracking-widest font-bold">Active Workspace</span>
                <h3 className="font-heading text-lg font-bold text-on-surface">Family Details</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-0.5">Family Name</p>
                <p className="text-sm font-bold text-on-surface">{family?.name ?? "No Family"}</p>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-0.5">Your Role</p>
                <div>{getRoleBadge(member?.role)}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-surface-container-low p-4 rounded-xl border-2 border-dashed border-outline-variant/60 flex items-center justify-between gap-4">
              <div className="overflow-hidden">
                <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-bold mb-1">Invite Code</p>
                <code className="font-heading text-xl md:text-2xl tracking-[0.15em] font-extrabold text-primary select-all truncate">
                  {family?.invite_code || "N/A"}
                </code>
              </div>
              <button
                onClick={handleCopy}
                disabled={!family?.invite_code}
                className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 hover:bg-primary hover:text-white text-primary font-bold px-4 py-2.5 rounded-xl transition-all duration-200 active:scale-95 shrink-0 text-xs cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <button
              onClick={handleShare}
              disabled={!family?.invite_code}
              className="w-full bg-primary hover:bg-primary-container text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer text-xs md:text-sm shadow-sm"
            >
              <Share2 className="h-4 w-4" />
              Send Invitation Link
            </button>
          </div>
        </div>

        {/* Join Family Form */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/20 shadow-sm transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-tertiary-container/10 rounded-xl text-tertiary">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <span className="font-sans text-[10px] text-tertiary uppercase tracking-widest font-bold">Join Household</span>
              <h3 className="font-heading text-lg font-bold text-on-surface">Join Another Family</h3>
            </div>
          </div>

          <form onSubmit={handleJoinFamily} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-code" className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Enter Invite Code
              </Label>
              <Input
                id="invite-code"
                placeholder="e.g. ABCD-1234"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-base focus:border-primary transition-all uppercase tracking-widest font-bold"
                required
              />
            </div>

            <div className="p-4 bg-tertiary-container/5 rounded-xl border border-tertiary-container/20 flex gap-3 items-start">
              <Info className="h-4.5 w-4.5 text-tertiary shrink-0 mt-0.5" />
              <p className="text-xs text-on-tertiary-container font-medium leading-relaxed">
                Joining another family will disconnect you from your current family dashboard. All personal data stays with you.
              </p>
            </div>

            <button
              type="submit"
              disabled={joiningFamily || !joinCode.trim()}
              className="w-full bg-secondary hover:bg-secondary/90 text-on-secondary font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer text-xs md:text-sm shadow-sm disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              {joiningFamily ? "Switching..." : "Join New Family Group"}
            </button>
          </form>
        </div>

        {/* Role Permissions Summary */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-low p-6 rounded-2xl border border-outline-variant/50 flex flex-col justify-between">
          <div>
            <h5 className="font-heading text-sm font-bold text-on-surface mb-4 flex items-center gap-1.5 uppercase tracking-wider">
              <Info className="h-4.5 w-4.5 text-primary" />
              Role Summary
            </h5>
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0"></span>
                <div>
                  <p className="font-bold text-xs text-on-surface">Admin</p>
                  <p className="text-[11px] text-on-surface-variant font-medium leading-normal">
                    Full control over billing, invite codes, and member roles.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-2 h-2 rounded-full bg-tertiary mt-1.5 shrink-0"></span>
                <div>
                  <p className="font-bold text-xs text-on-surface">Member</p>
                  <p className="text-[11px] text-on-surface-variant font-medium leading-normal">
                    Can create and edit all shared tasks, events, and lists.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-2 h-2 rounded-full bg-secondary mt-1.5 shrink-0"></span>
                <div>
                  <p className="font-bold text-xs text-on-surface">Child</p>
                  <p className="text-[11px] text-on-surface-variant font-medium leading-normal">
                    Restricted access. Can view lists and mark their own tasks as done.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-on-surface-variant/60 font-medium leading-normal mt-4 border-t border-outline-variant/30 pt-3">
            Roles can only be managed by administrators.
          </p>
        </div>

        {/* Family Member Management */}
        {allMembers.length > 0 && (
          <div className="col-span-12 bg-surface-container-lowest p-6 md:p-8 rounded-2xl border border-outline-variant/20 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-heading text-lg font-bold text-on-surface flex items-center gap-2">
                  <Users className="h-5 w-5 text-tertiary" />
                  Family Members
                </h3>
                <p className="font-sans text-xs text-on-surface-variant font-medium mt-1">
                  {member?.role === "admin"
                    ? "Manage roles and remove members from this family workspace."
                    : "View active members in this family space."}
                </p>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-on-surface-variant font-bold text-xs uppercase tracking-wider">
                    <th className="px-4 pb-2">Member</th>
                    <th className="px-4 pb-2">Role</th>
                    <th className="px-4 pb-2 font-sans">Joined Date</th>
                    <th className="px-4 pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-sans font-medium">
                  {allMembers.map((m) => {
                    const isSelf = m.user_id === user?.id;
                    const isAdmin = member?.role === "admin";
                    
                    return (
                      <tr key={m.id} className="bg-surface-container-low hover:bg-surface-container transition-colors rounded-xl group duration-200">
                        <td className="px-4 py-3 rounded-l-xl border-t border-b border-l border-outline-variant/15">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColorClass(m.role)}`}>
                              {getInitials(m.display_name || "Unknown")}
                            </div>
                            <span className="font-bold text-on-surface">
                              {m.display_name || "Unknown Member"} {isSelf ? "(You)" : ""}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-t border-b border-outline-variant/15">
                          {isAdmin && !isSelf ? (
                            <select
                              value={m.role}
                              onChange={(e) => handleChangeRole(m.id, e.target.value as any)}
                              className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all cursor-pointer shadow-xs"
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                              <option value="child">Child</option>
                            </select>
                          ) : (
                            <div>{getRoleBadge(m.role)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 border-t border-b border-outline-variant/15 text-on-surface-variant text-xs">
                          {new Date(m.joined_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3 rounded-r-xl border-t border-b border-r border-outline-variant/15 text-right">
                          {isAdmin && !isSelf && (
                            <button
                              onClick={() => handleKickMember(m.id, m.display_name)}
                              className="inline-flex items-center gap-1 bg-secondary/5 hover:bg-secondary hover:text-white border border-secondary/15 text-secondary font-bold px-3 py-1.5 rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stack View */}
            <div className="block md:hidden space-y-3">
              {allMembers.map((m) => {
                const isSelf = m.user_id === user?.id;
                const isAdmin = member?.role === "admin";
                
                return (
                  <div key={m.id} className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/15 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColorClass(m.role)}`}>
                        {getInitials(m.display_name || "Unknown")}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-on-surface leading-tight">
                          {m.display_name || "Unknown Member"} {isSelf ? "(You)" : ""}
                        </p>
                        <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                          Joined on {new Date(m.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-outline-variant/20 pt-2.5 mt-0.5">
                      <div>
                        {isAdmin && !isSelf ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleChangeRole(m.id, e.target.value as any)}
                            className="rounded-xl border border-outline-variant bg-surface-container-lowest px-2.5 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all cursor-pointer"
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="child">Child</option>
                          </select>
                        ) : (
                          <div>{getRoleBadge(m.role)}</div>
                        )}
                      </div>

                      {isAdmin && !isSelf && (
                        <button
                          onClick={() => handleKickMember(m.id, m.display_name)}
                          className="inline-flex items-center gap-1 bg-secondary/5 hover:bg-secondary hover:text-white border border-secondary/15 text-secondary font-bold px-3 py-1.5 rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Session Actions and Danger Zone */}
        <div className="col-span-12 bg-surface-container-low p-6 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-stretch md:items-center">
          <div className="space-y-1">
            <h4 className="font-heading text-base font-bold text-on-surface">Account Actions</h4>
            <p className="font-sans text-xs text-on-surface-variant font-medium leading-relaxed">
              Export data, audit activity log, leave your current workspace, or log out of your session on this device.
            </p>
          </div>

          <div className="grid grid-cols-2 md:flex md:items-center gap-3">
            <button
              onClick={() => alert("Export Data: Feature coming soon!")}
              className="flex-1 md:flex-none bg-surface-container-highest hover:bg-outline-variant text-on-surface font-bold p-3 md:px-4 md:py-2.5 rounded-xl flex flex-col md:flex-row items-center justify-center gap-1.5 transition-colors group active:scale-95 text-xs cursor-pointer"
            >
              <Download className="h-4 w-4 text-on-surface-variant group-hover:scale-110 transition-transform shrink-0" />
              <span>Export Data</span>
            </button>

            <button
              onClick={() => alert("Audit Log: Feature coming soon!")}
              className="flex-1 md:flex-none bg-surface-container-highest hover:bg-outline-variant text-on-surface font-bold p-3 md:px-4 md:py-2.5 rounded-xl flex flex-col md:flex-row items-center justify-center gap-1.5 transition-colors group active:scale-95 text-xs cursor-pointer"
            >
              <History className="h-4 w-4 text-on-surface-variant group-hover:scale-110 transition-transform shrink-0" />
              <span>Audit Log</span>
            </button>

            <button
              onClick={handleLeaveFamily}
              disabled={leavingFamily}
              className="flex-1 md:flex-none bg-secondary/10 hover:bg-secondary hover:text-on-secondary text-secondary font-bold p-3 md:px-4 md:py-2.5 rounded-xl flex flex-col md:flex-row items-center justify-center gap-1.5 transition-colors group active:scale-95 text-xs cursor-pointer border border-secondary/20"
            >
              <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform shrink-0" />
              <span>{leavingFamily ? "Leaving..." : "Leave Family"}</span>
            </button>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex-1 md:flex-none bg-primary hover:bg-primary-container text-white font-bold p-3 md:px-5 md:py-2.5 rounded-xl flex flex-col md:flex-row items-center justify-center gap-1.5 transition-colors group active:scale-95 text-xs cursor-pointer shadow-sm"
            >
              <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform shrink-0" />
              <span>{signingOut ? "Logging out..." : "Log Out"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
