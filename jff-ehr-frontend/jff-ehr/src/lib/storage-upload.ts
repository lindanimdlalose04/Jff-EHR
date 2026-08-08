import { supabase } from "@/lib/supabase";

/**
 * Shared document/scan upload to Supabase Storage (C2: real upload from the
 * computer, alongside pasting a URL). Used for signed consent PDFs (B6) and for
 * camper/crew photo-or-scan fields, which may be a PDF rather than an image.
 *
 * Everything goes to one public bucket under a per-use folder, so only a single
 * bucket needs provisioning. Paths are unguessable (a random UUID per file).
 */
const BUCKET = "consent-documents";

export async function uploadDocument(folder: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "application/pdf", upsert: false });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** True when a stored document URL points at a PDF rather than an image. */
export function isPdfUrl(url: string | null | undefined): boolean {
  return !!url && /\.pdf(\?|$)/i.test(url);
}
