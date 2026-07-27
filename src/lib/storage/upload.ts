import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enforceRate } from "@/lib/ratelimit";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
// Teto secundario no servidor. O limite real do request e o bodySizeLimit (4MB)
// das Server Actions (next.config.ts); aqui barramos por arquivo com folga.
const MAX_BYTES = 5 * 1024 * 1024;

/** Sobe uma imagem para {bucket}/{userId}/... e devolve a URL pública. */
export async function uploadImageFile(
  supabase: SupabaseClient,
  bucket: string,
  userId: string,
  file: File
): Promise<string> {
  await enforceRate("upload", userId, "Muitos envios de imagem em pouco tempo. Aguarde um pouco.");

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Tipo de arquivo não permitido. Envie JPG, PNG, WEBP ou GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Imagem muito grande (máximo 5 MB).");
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${Date.now()}.${ext || "jpg"}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
