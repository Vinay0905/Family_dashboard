"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FileText,
  UploadCloud,
  Trash2,
  Download,
  ShieldAlert,
  FileBadge,
  HelpCircle,
  Compass,
  GraduationCap,
  Loader2,
} from "lucide-react";

const CATEGORY_MAP: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  warranty: { label: "Warranty", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/20", icon: FileBadge },
  manual: { label: "Manual", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-500/20", icon: HelpCircle },
  travel: { label: "Travel", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/20 border-sky-500/20", icon: Compass },
  school: { label: "School", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-500/20", icon: GraduationCap },
  other: { label: "Other", color: "text-slate-650 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/60 border-slate-500/20", icon: FileText },
};

export default function DocumentsPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<any>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"school" | "other" | "warranty" | "manual" | "travel">("other");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        setUser(userData.user);

        const { data: memberData } = await supabase
          .from("family_members")
          .select("family_id")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        
        if (!memberData) return;
        setMember(memberData);

        // Fetch documents
        const { data: docsData } = await supabase
          .from("documents")
          .select("*")
          .eq("family_id", memberData.family_id)
          .order("created_at", { ascending: false });
        
        if (docsData) {
          setDocuments(docsData);
        }
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !user || !member) return;

    setError(null);
    setUploading(true);

    try {
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${member.family_id}/${category}/${timestamp}-${sanitizedFileName}`;

      // 1. Upload to storage bucket
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 2. Save metadata in public.documents
      const { error: dbError } = await supabase.from("documents").insert({
        family_id: member.family_id,
        created_by: user.id,
        name: name.trim() || file.name,
        category,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
      });

      if (dbError) {
        // Rollback storage upload on DB failure
        await supabase.storage.from("documents").remove([storagePath]);
        throw dbError;
      }

      // Reset form
      setName("");
      setCategory("other");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refresh list
      const { data: docsData } = await supabase
        .from("documents")
        .select("*")
        .eq("family_id", member.family_id)
        .order("created_at", { ascending: false });
      
      if (docsData) setDocuments(docsData);

    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err?.message ?? "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(storagePath: string, fileName: string) {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(storagePath, 60);

      if (error) throw error;
      
      window.open(data.signedUrl, "_blank");
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to generate download link.");
    }
  }

  async function handleDelete(docId: string, storagePath: string) {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      // 1. Remove from storage
      await supabase.storage.from("documents").remove([storagePath]);

      // 2. Delete from DB
      await supabase.from("documents").delete().eq("id", docId);

      // Refresh list
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete document.");
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = 2;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="font-heading text-4xl text-on-surface tracking-tight font-extrabold">
            Document <span className="text-primary italic">Vault</span>
          </h1>
          <p className="font-sans text-sm text-on-surface-variant mt-2 font-medium">
            Store warranties, product manuals, itineraries, and school forms.
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
            Only upload non-sensitive files (warranties, manuals, school sheets, flyers). 
            <span className="font-bold text-on-surface"> Do not upload government IDs, financial cards, bank statements, or password documents here.</span>
          </p>
        </div>
      </section>

      {/* Grid Container */}
      <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Files Stream Grid */}
        <div className="space-y-6">
          <h3 className="font-heading text-lg font-bold text-on-surface flex items-center gap-3 border-b border-primary/10 pb-2">
            <span className="w-6 h-1 bg-primary rounded-full"></span> Secure Storage
          </h3>

          {documents.length === 0 ? (
            <div className="rounded border border-dashed border-primary/10 p-10 text-center text-on-surface-variant/50">
              <FileText className="mx-auto h-8 w-8 mb-2 opacity-30 text-primary" />
              <p className="text-sm font-medium">No documents stored in the vault yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {documents.map((doc) => {
                const categoryConf = CATEGORY_MAP[doc.category] || CATEGORY_MAP.other;
                const Icon = categoryConf.icon;

                return (
                  <article
                    key={doc.id}
                    className="group relative flex flex-col justify-between rounded border border-outline/10 bg-white p-4 hover:shadow-[0_0_20px_rgba(183,0,79,0.03)] hover:border-primary transition-all duration-300"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 pr-8 overflow-hidden">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded border ${categoryConf.bg} ${categoryConf.color}`}>
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-heading text-sm font-extrabold text-on-surface truncate" title={doc.name}>
                              {doc.name}
                            </h4>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/60 block mt-0.5">
                              {categoryConf.label}
                            </span>
                          </div>
                        </div>

                        {/* Hover action overlays */}
                        <div className="absolute right-2.5 top-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDownload(doc.storage_path, doc.name)}
                            className="flex h-7 w-7 items-center justify-center rounded text-on-surface-variant/45 hover:text-primary transition-colors cursor-pointer"
                            title="Download File"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id, doc.storage_path)}
                            className="flex h-7 w-7 items-center justify-center rounded text-on-surface-variant/45 hover:text-primary transition-colors cursor-pointer"
                            title="Delete File"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-[10px] text-on-surface-variant/50 font-semibold uppercase tracking-wider">
                        <span>{formatBytes(doc.file_size || 0)}</span>
                        <span>•</span>
                        <span>{new Date(doc.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Upload Form */}
        <div>
          <form onSubmit={handleUpload} className="space-y-4 rounded glass-card p-6 bg-surface-container-lowest border border-primary/10 h-fit">
            <div>
              <h3 className="font-heading text-lg font-bold text-on-surface mb-4">Upload Document</h3>
            </div>

            {error && (
              <div className="rounded border border-error bg-error/5 p-3.5 text-xs font-bold text-error">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Document Name (Optional)</label>
              <input
                id="docName"
                type="text"
                placeholder="Defaults to file name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Category</label>
              <select
                id="docCategory"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-primary focus:outline-none transition-colors"
                required
              >
                <option value="other">Other / General</option>
                <option value="warranty">Warranty Card</option>
                <option value="manual">User Manual</option>
                <option value="travel">Travel Booking</option>
                <option value="school">School Form</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-primary">Attachment File</label>
              <input
                id="fileInput"
                type="file"
                ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full rounded border border-outline-variant bg-white px-3 py-1.5 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-primary/10 file:bg-primary/5 file:text-primary file:text-[10px] file:font-bold file:uppercase cursor-pointer"
                required
              />
              <p className="text-[9px] text-on-surface-variant/60 font-semibold uppercase mt-1">PDF, JPG, PNG or WEBP up to 50MB</p>
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full mt-2 bg-primary text-on-primary font-sans text-xs font-bold uppercase tracking-widest py-3 rounded hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(183,0,79,0.15)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" /> Upload Document
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
