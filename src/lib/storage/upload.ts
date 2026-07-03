import type { SupabaseClient } from "@supabase/supabase-js";

/** Sobe uma imagem para {bucket}/{userId}/... e devolve a URL pública. */
export async function uploadImageFile(
  supabase: SupabaseClient,
  bucket: string,
  userId: string,
  file: File
): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${Date.now()}.${ext || "jpg"}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
