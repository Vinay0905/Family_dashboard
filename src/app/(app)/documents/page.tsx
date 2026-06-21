"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Search,
  ArrowUpDown,
  X,
  FileBadge,
  HelpCircle,
  Compass,
  GraduationCap
} from "lucide-react";

// Categorization configurations
const CATEGORY_MAP: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  aadhar: { label: "Aadhar Card", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/20 border-rose-500/20", icon: FileText },
  passport: { label: "Passport", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-500/20", icon: Compass },
  license: { label: "Driving License", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-500/20", icon: FileBadge },
  education: { label: "Education Related", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/20", icon: GraduationCap },
  warranty: { label: "Warranty Card", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/20 border-purple-500/20", icon: FileBadge },
  manual: { label: "User Manual", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-500/20", icon: HelpCircle },
  travel: { label: "Travel Booking", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/20 border-sky-500/20", icon: Compass },
  school: { label: "School Form", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500/20", icon: GraduationCap },
  other: { label: "Other / General", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/60 border-slate-500/20", icon: FileText },
};

export default function DocumentsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  
  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<"created_at" | "name">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc"); // Default earliest first

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("aadhar");
  const [driveLink, setDriveLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          router.push("/login");
          return;
        }
        setUser(userData.user);

        const { data: memberData } = await supabase
          .from("family_members")
          .select("family_id")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        
        if (!memberData) {
          router.push("/onboarding");
          return;
        }
        setMember(memberData);

        // Fetch document metadata
        const { data: docsData } = await supabase
          .from("documents")
          .select("*")
          .eq("family_id", memberData.family_id);
        
        if (docsData) {
          setDocuments(docsData);
        }
      } catch (err) {
        console.error("Error loading documents:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, router]);

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !driveLink.trim() || !user || !member) return;

    setError(null);
    setIsSubmitting(true);

    try {
      // Ensure drive link is formatted correctly with protocol
      let formattedLink = driveLink.trim();
      if (!formattedLink.startsWith("http://") && !formattedLink.startsWith("https://")) {
        formattedLink = `https://${formattedLink}`;
      }

      // Save document record (Google Drive Link stored in storage_path)
      const { data: newDoc, error: dbError } = await supabase
        .from("documents")
        .insert({
          family_id: member.family_id,
          created_by: user.id,
          name: title.trim(),
          category: category as any,
          storage_path: formattedLink,
          file_size: 0,
          mime_type: "google-drive"
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setDocuments((prev) => [...prev, newDoc]);
      setTitle("");
      setCategory("aadhar");
      setDriveLink("");
      setShowCreateModal(false);
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err?.message ?? "Failed to save document link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to remove this document placeholder?")) return;

    try {
      const { error: dbError } = await supabase.from("documents").delete().eq("id", docId);
      if (dbError) throw dbError;

      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete document.");
    }
  };

  const toggleSort = (field: "created_at" | "name") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter & Sort
  const filteredDocs = documents
    .filter((doc) => {
      const matchSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === "all" || doc.category === categoryFilter;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      let multiplier = sortDirection === "asc" ? 1 : -1;
      if (sortField === "name") {
        return a.name.localeCompare(b.name) * multiplier;
      } else {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * multiplier;
      }
    });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Document <span className="text-primary italic">Vault</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Keep track of Aadhar cards, licenses, passports, and education files using secure Google Drive links.
          </p>
        </div>
      </section>

      {/* Security Warning Alert */}
      <section className="rounded bg-error-container/5 border border-error/20 p-5 flex items-start gap-3 shadow-sm max-w-4xl">
        <ShieldAlert className="h-5 w-5 shrink-0 text-error mt-0.5" />
        <div>
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-error block mb-1">
            Privacy & Security Guidelines
          </span>
          <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
            In compliance with our security standards, actual documents are <span className="font-bold text-on-surface">not stored</span> on our servers. You should upload files to your own secure cloud space (Google Drive, OneDrive) and register the access link here.
          </p>
        </div>
      </section>

      {/* Filter and Search Controls */}
      <section className="glass-card rounded p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant/60" />
          <Input
            placeholder="Search document title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-surface-container-lowest border-outline-variant text-xs h-9 rounded"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_MAP).map(([val, conf]) => (
              <option key={val} value={val}>{conf.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Tabular Documents Grid */}
      <div className="glass-card rounded shadow-sm overflow-hidden border border-primary/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low border-b border-primary/10 font-bold uppercase text-primary tracking-wider">
                <th className="p-3.5 pl-4">Document Title</th>
                <th className="p-3.5">Category</th>
                <th 
                  onClick={() => toggleSort("created_at")}
                  className="p-3.5 cursor-pointer hover:bg-primary/5 transition-colors select-none"
                >
                  <span className="items-center gap-1 inline-flex">
                    Date Added <ArrowUpDown className="h-3 w-3 text-primary/60" />
                  </span>
                </th>
                <th className="p-3.5">Google Drive Link</th>
                <th className="p-3.5 pr-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-on-surface-variant/40 font-semibold italic bg-surface-container-lowest">
                    No documents registered in the vault.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const categoryConf = CATEGORY_MAP[doc.category] || CATEGORY_MAP.other;
                  const Icon = categoryConf.icon;

                  return (
                    <tr 
                      key={doc.id} 
                      className="bg-surface-container-lowest hover:bg-primary/[0.02] transition-colors"
                    >
                      <td className="p-3.5 pl-4 font-sans max-w-xs">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border ${categoryConf.bg} ${categoryConf.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-bold text-on-surface text-sm truncate" title={doc.name}>
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 font-sans font-medium text-on-surface-variant">
                        <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${categoryConf.color} bg-primary/5 border-primary/10`}>
                          {categoryConf.label}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-on-surface-variant">
                        {new Date(doc.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="p-3.5 font-sans font-semibold text-primary">
                        <a 
                          href={doc.storage_path} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 hover:underline"
                        >
                          Open Link <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="p-3.5 pr-4 text-center">
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 text-on-surface-variant/40 hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                          title="Remove Reference"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Button to open creation modal */}
      <div className="flex justify-center pt-2">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary-container text-white px-8 h-12 gap-2 text-sm font-bold shadow-lg shadow-primary/20 rounded cursor-pointer animate-neon-text active:scale-95 transition-all"
        >
          <Plus className="h-5 w-5" /> Add Document Link
        </Button>
      </div>

      {/* Add Document Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-xs" 
            onClick={() => setShowCreateModal(false)} 
          />

          <form 
            onSubmit={handleSaveDocument} 
            className="relative z-10 w-full max-w-lg glass-card rounded p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-primary/10">
              <h3 className="font-heading text-lg font-bold text-primary flex items-center gap-2">
                <FileText className="h-5 w-5" /> Add Document Link
              </h3>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/60 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="rounded border border-error bg-error/5 p-3.5 text-xs font-bold text-error">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="docTitle" className="text-[10px] font-bold uppercase tracking-wider text-primary">Document Title</Label>
              <Input
                id="docTitle"
                type="text"
                placeholder="e.g. Dad's Aadhar Card, Car Insurance Policy"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="docCategory" className="text-[10px] font-bold uppercase tracking-wider text-primary">Category</Label>
              <select
                id="docCategory"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors font-semibold"
              >
                {Object.entries(CATEGORY_MAP).map(([val, conf]) => (
                  <option key={val} value={val}>{conf.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="driveLink" className="text-[10px] font-bold uppercase tracking-wider text-primary">Google Drive / Secure Link</Label>
              <Input
                id="driveLink"
                type="text"
                placeholder="e.g. drive.google.com/file/d/..."
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                className="bg-surface-container-lowest border-outline-variant rounded focus:border-primary text-xs"
                required
              />
              <p className="text-[9px] text-on-surface-variant/60 font-semibold uppercase mt-1">Please paste the share link from Google Drive or Dropbox</p>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-primary hover:bg-primary-container text-white py-3 rounded active:scale-95 transition-all shadow-md font-sans text-xs font-bold uppercase tracking-widest cursor-pointer"
            >
              {isSubmitting ? "Saving Link..." : "Save Link Reference"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
