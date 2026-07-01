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
  GraduationCap,
  Lock,
  ShieldCheck,
  FolderOpen,
  Info,
  Clock,
  Sparkles,
  Pencil
} from "lucide-react";

interface DocumentMetadata {
  id: string;
  family_id: string;
  created_by: string;
  created_at: string;
  name: string;
  category: "aadhar" | "passport" | "license" | "education" | "warranty" | "manual" | "travel" | "school" | "other";
  storage_path: string;
  file_size: number;
  mime_type: string;
}

// Categorization configurations
const CATEGORY_MAP: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  aadhar: {
    label: "Aadhar Card",
    color: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-100/60 dark:bg-rose-950/20",
    border: "border-rose-200 dark:border-rose-900/30",
    icon: FileText
  },
  passport: {
    label: "Passport",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-100/60 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-900/30",
    icon: Compass
  },
  license: {
    label: "Driving License",
    color: "text-amber-850 dark:text-warning",
    bg: "bg-amber-100/60 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-900/30",
    icon: FileBadge
  },
  education: {
    label: "Education Related",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-100/60 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-900/30",
    icon: GraduationCap
  },
  warranty: {
    label: "Warranty Card",
    color: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-100/60 dark:bg-purple-950/20",
    border: "border-purple-200 dark:border-purple-900/30",
    icon: ShieldCheck
  },
  manual: {
    label: "User Manual",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-100/60 dark:bg-orange-950/20",
    border: "border-orange-200 dark:border-orange-900/30",
    icon: HelpCircle
  },
  travel: {
    label: "Travel Booking",
    color: "text-sky-750 dark:text-sky-400",
    bg: "bg-sky-100/60 dark:bg-sky-950/20",
    border: "border-sky-200 dark:border-sky-900/30",
    icon: Compass
  },
  school: {
    label: "School Form",
    color: "text-indigo-755 dark:text-indigo-400",
    bg: "bg-indigo-100/60 dark:bg-indigo-950/20",
    border: "border-indigo-200 dark:border-indigo-900/30",
    icon: GraduationCap
  },
  other: {
    label: "Other / General",
    color: "text-slate-700 dark:text-slate-400",
    bg: "bg-slate-100/60 dark:bg-slate-900/60",
    border: "border-slate-200 dark:border-slate-800/30",
    icon: FileText
  }
};

export default function NewDocumentsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<any>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<"created_at" | "name">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc"); // Default newest first

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("aadhar");
  const [driveLink, setDriveLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setIsEditing(false);
    setTitle("");
    setCategory("aadhar");
    setDriveLink("");
    setError(null);
  };

  const handleOpenEdit = (doc: DocumentMetadata) => {
    setEditingId(doc.id);
    setIsEditing(true);
    setTitle(doc.name || "");
    setCategory(doc.category || "aadhar");
    setDriveLink(doc.storage_path || "");
    setError(null);
    setShowCreateModal(true);
  };

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
          setDocuments(docsData as unknown as DocumentMetadata[]);
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

      if (isEditing && editingId) {
        // Update document metadata
        const { error: dbError } = await supabase
          .from("documents")
          .update({
            name: title.trim(),
            category: category as any,
            storage_path: formattedLink,
          })
          .eq("id", editingId);

        if (dbError) throw dbError;

        // Reload document list
        const { data: docsData } = await supabase
          .from("documents")
          .select("*")
          .eq("family_id", member.family_id);

        if (docsData) {
          setDocuments(docsData as unknown as DocumentMetadata[]);
        }

        resetForm();
        setShowCreateModal(false);
        alert("Document updated successfully!");
      } else {
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

        setDocuments((prev) => [newDoc as unknown as DocumentMetadata, ...prev]);
        resetForm();
        setShowCreateModal(false);
        alert("Document reference added successfully!");
      }
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

  // Document counts per category helper
  const getDocCount = (cat: string) => documents.filter((d) => d.category === cat).length;

  // Filter & Sort
  const filteredDocs = documents
    .filter((doc) => {
      const matchSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === "all" || doc.category === categoryFilter;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      const multiplier = sortDirection === "asc" ? 1 : -1;
      if (sortField === "name") {
        return a.name.localeCompare(b.name) * multiplier;
      } else {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * multiplier;
      }
    });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-on-surface-variant font-medium">Loading document vault…</p>
        </div>
      </div>
    );
  }

  // Calculate mock storage utilization or registered links ratio
  const activeCategoriesCount = Object.keys(CATEGORY_MAP).filter((cat) => getDocCount(cat) > 0).length;
  const linkLimit = 100;
  const linkProgress = Math.min((documents.length / linkLimit) * 100, 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* ── Page Header ────────────────────────────────────── */}
      <section className="glass-card p-6 md:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant/80">
            <Lock className="h-3.5 w-3.5 text-primary" />
            <span>Secure Link Storage</span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight">
            Document <span className="text-primary italic">Vault</span>
          </h2>
          <p className="text-sm text-on-surface-variant font-medium max-w-2xl">
            Keep track of Aadhar cards, licenses, passports, and education files using secure, private Google Drive or Dropbox links.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <Button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="bg-secondary hover:bg-secondary/90 text-on-secondary px-6 h-12 gap-2 text-xs font-bold uppercase tracking-wider shadow-md rounded-xl cursor-pointer active:scale-95 transition-all"
          >
            <Plus className="h-4.5 w-4.5" />
            Add Document Link
          </Button>
        </div>
      </section>

      {/* ─── BENTO STATS & GUIDELINE BLOCKS ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Storage usage / security policy card */}
        <div className="lg:col-span-4 glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-on-surface">Privacy First</h3>
                <p className="text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-wider">Storage Guidelines</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant/90 leading-relaxed font-medium">
              In compliance with security standards, actual documents are <span className="font-bold text-on-surface">not stored</span> on our servers. You should upload files to your own secure cloud space (Google Drive, OneDrive) and register the links here.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-outline-variant/15 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-on-surface">Registered Links</span>
              <span className="text-primary">{documents.length} / {linkLimit} slots</span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${linkProgress}%` }} 
              />
            </div>
            <p className="text-[10px] text-on-surface-variant/75 font-semibold flex items-center gap-1">
              <Info className="h-3 w-3" />
              {activeCategoriesCount} of {Object.keys(CATEGORY_MAP).length} categories utilized
            </p>
          </div>
        </div>

        {/* Categories folder grid */}
        <div className="lg:col-span-8 glass-card p-6 rounded-2xl space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-on-surface">Category Folders</h3>
            <p className="text-xs text-on-surface-variant font-medium">Tap a folder to filter your file list below.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(CATEGORY_MAP).map(([val, conf]) => {
              const count = getDocCount(val);
              const isActive = categoryFilter === val;
              const Icon = conf.icon;
              return (
                <div
                  key={val}
                  onClick={() => setCategoryFilter(isActive ? "all" : val)}
                  className={`group cursor-pointer p-4 rounded-xl border transition-all duration-200 active:scale-95 flex flex-col justify-between ${
                    isActive
                      ? "bg-primary/10 border-primary/40 shadow-xs"
                      : "bg-surface-container-low/50 border-outline-variant/15 hover:border-primary/20 hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${conf.bg} ${conf.color} border border-current/15`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {count > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {count}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-on-surface truncate group-hover:text-primary transition-colors">
                      {conf.label}
                    </h4>
                    <p className="text-[10px] text-on-surface-variant/70 font-semibold mt-0.5">
                      {count} {count === 1 ? "file" : "files"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ─── SEARCH & FILTER CONTROLS ───────────────────────── */}
      <section className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant/65" />
          <input
            type="text"
            placeholder="Search document title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-surface-container-low/40 border border-outline-variant/20 text-xs h-9 rounded-xl w-full focus:outline-none focus:border-primary transition-all font-sans font-medium"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          {categoryFilter !== "all" && (
            <button
              onClick={() => setCategoryFilter("all")}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl bg-surface-container-high border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-highest transition-all flex items-center gap-1 cursor-pointer"
            >
              Clear Filter <X className="h-3 w-3" />
            </button>
          )}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-outline-variant/20 bg-surface-container-low/40 px-3 py-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary transition-all h-9"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_MAP).map(([val, conf]) => (
              <option key={val} value={val}>{conf.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ─── DOCUMENTS TABLE / GRID ─────────────────────────── */}
      <section className="glass-card rounded-2xl overflow-hidden">
        
        {/* Table Header Row (Desktop Layout) */}
        <div className="px-6 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low/30">
          <h3 className="font-serif text-base font-bold text-on-surface">
            {categoryFilter === "all" ? "All Documents" : `${CATEGORY_MAP[categoryFilter]?.label} Files`}
          </h3>
          <span className="text-xs text-on-surface-variant/70 font-semibold">
            Showing {filteredDocs.length} of {documents.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-on-surface-variant font-sans text-[10px] font-bold uppercase tracking-wider border-b border-outline-variant/15 bg-surface-container-low/10">
                <th className="px-6 py-3 font-semibold">Document Title</th>
                <th className="px-6 py-3 font-semibold hidden md:table-cell">Category</th>
                <th 
                  onClick={() => toggleSort("created_at")}
                  className="px-6 py-3 font-semibold cursor-pointer hover:bg-primary/5 transition-colors select-none"
                >
                  <span className="items-center gap-1 inline-flex">
                    Date Added <ArrowUpDown className="h-3 w-3 text-primary/60" />
                  </span>
                </th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-xs font-medium">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-on-surface-variant/40">
                      <FolderOpen className="h-10 w-10 mb-3 stroke-[1.5] text-on-surface-variant/30" />
                      <p className="text-sm font-semibold">No documents found</p>
                      <p className="text-xs font-medium mt-1">
                        {searchQuery || categoryFilter !== "all" 
                          ? "Try adjusting your search query or filters" 
                          : "Register a secure link to save references here"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const categoryConf = CATEGORY_MAP[doc.category] || CATEGORY_MAP.other;
                  const Icon = categoryConf.icon;

                  return (
                    <tr 
                      key={doc.id} 
                      className="hover:bg-primary/[0.01] transition-colors"
                    >
                      {/* Title & Mobile Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 max-w-sm sm:max-w-md md:max-w-lg">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${categoryConf.bg} ${categoryConf.color} ${categoryConf.border}`}>
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-on-surface text-sm block truncate" title={doc.name}>
                              {doc.name}
                            </span>
                            <span className="md:hidden mt-0.5 inline-flex px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider bg-primary/5 border-primary/10 text-primary">
                              {categoryConf.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge (Desktop) */}
                      <td className="px-6 py-4 hidden md:table-cell font-sans">
                        <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${categoryConf.color} bg-primary/5 border-primary/10`}>
                          {categoryConf.label}
                        </span>
                      </td>

                      {/* Date Added */}
                      <td className="px-6 py-4 font-sans text-on-surface-variant/80">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 opacity-60" />
                          <span>
                            {new Date(doc.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <a 
                            href={doc.storage_path} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                          >
                            Open Link <ExternalLink className="h-3 w-3" />
                          </a>
                          <button
                            onClick={() => handleOpenEdit(doc)}
                            className="p-2 text-on-surface-variant/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all cursor-pointer"
                            title="Edit Reference"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 text-on-surface-variant/40 hover:text-error hover:bg-error/10 rounded-xl transition-all cursor-pointer"
                            title="Remove Reference"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── MOBILE FLOATING ACTION BUTTON ─────────────────── */}
      <button 
        onClick={() => {
          resetForm();
          setShowCreateModal(true);
        }}
        className="md:hidden fixed right-6 bottom-20 w-14 h-14 bg-secondary text-on-secondary rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40"
        title="Add Document Link"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* ─── ADD DOCUMENT MODAL DIALOG ──────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowCreateModal(false)} 
          />

          <form 
            onSubmit={handleSaveDocument} 
            className="relative z-10 w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <h3 className="font-serif text-lg font-bold text-primary flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {isEditing ? "Edit Reference Link" : "Register Reference Link"}
              </h3>
              <button 
                type="button"
                onClick={() => {
                  resetForm();
                  setShowCreateModal(false);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/65 hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-error bg-error/5 p-3.5 text-xs font-bold text-error">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="docTitle" className="text-[10px] font-bold uppercase tracking-wider text-primary">Document Title</Label>
              <Input
                id="docTitle"
                type="text"
                placeholder="e.g. Dad's Aadhar Card, Car Insurance Policy"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-surface-container-low/40 border border-outline-variant/20 rounded-xl focus:border-primary text-xs h-10 w-full"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="docCategory" className="text-[10px] font-bold uppercase tracking-wider text-primary">Category</Label>
              <select
                id="docCategory"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low/40 px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors font-semibold h-10"
              >
                {Object.entries(CATEGORY_MAP).map(([val, conf]) => (
                  <option key={val} value={val}>{conf.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="driveLink" className="text-[10px] font-bold uppercase tracking-wider text-primary">Google Drive / Secure Link</Label>
              <Input
                id="driveLink"
                type="text"
                placeholder="e.g. drive.google.com/file/d/..."
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                className="bg-surface-container-low/40 border border-outline-variant/20 rounded-xl focus:border-primary text-xs h-10 w-full"
                required
              />
              <p className="text-[9px] text-on-surface-variant/60 font-semibold uppercase mt-1">Please paste the share link from Google Drive, Dropbox, or OneDrive</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-2">
              <Button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowCreateModal(false);
                }}
                className="flex-1 py-3 border border-outline-variant bg-surface text-on-surface font-sans text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-primary hover:bg-primary-container text-on-primary py-3 rounded-xl active:scale-95 transition-all shadow-md font-sans text-xs font-bold uppercase tracking-widest cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </span>
                ) : isEditing ? (
                  "Save Changes"
                ) : (
                  "Save Link Reference"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
