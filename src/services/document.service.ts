import { createClient } from "@/lib/supabase/server";

export async function getDocuments(familyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createDocumentMetadata(doc: {
  family_id: string;
  created_by: string;
  name: string;
  category: "warranty" | "manual" | "travel" | "school" | "other";
  storage_path: string;
  file_size?: number;
  mime_type?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .insert(doc)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDocument(docId: string, storagePath: string) {
  const supabase = await createClient();
  
  // 1. Delete from storage bucket
  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([storagePath]);
  
  if (storageError) {
    console.error("Storage delete error (might be already removed):", storageError);
  }

  // 2. Delete database entry
  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", docId);

  if (dbError) throw dbError;
}

export async function createDocumentDownloadUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}
