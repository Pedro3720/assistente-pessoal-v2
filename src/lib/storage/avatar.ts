import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadImageFile } from "./upload";

/** Sobe a foto para avatars/{userId}/... e devolve a URL pública. */
export function uploadAvatarFile(supabase: SupabaseClient, userId: string, file: File): Promise<string> {
  return uploadImageFile(supabase, "avatars", userId, file);
}
