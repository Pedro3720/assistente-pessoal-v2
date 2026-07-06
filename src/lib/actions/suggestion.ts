"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/auth/admin";
import { suggestionInput, suggestionStatus } from "@/lib/validation/suggestion";
import { uploadImageFile } from "@/lib/storage/upload";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, userId: user.id };
}

export async function createSuggestion(formData: FormData): Promise<void> {
  const { supabase, userId } = await ctx();

  let image_url: string | null = null;
  const file = formData.get("image_file");
  if (file instanceof File && file.size > 0) {
    image_url = await uploadImageFile(supabase, "suggestions", userId, file);
  }

  const input = suggestionInput.parse({
    title: formData.get("title"),
    description: (formData.get("description") as string) || null,
    image_url,
  });

  const { error } = await supabase.from("suggestions").insert({ ...input, user_id: userId });
  if (error) throw new Error(error.message);
  revalidatePath("/sugestoes");
}

export async function setSuggestionStatus(id: number, status: unknown): Promise<void> {
  const value = suggestionStatus.parse(status);
  const { supabase } = await ctx();
  const { error } = await supabase.from("suggestions").update({ status: value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/sugestoes");
}

export async function deleteSuggestion(id: number): Promise<void> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("suggestions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/sugestoes");
}

export async function adminSetSuggestionStatus(id: number, status: unknown): Promise<void> {
  await assertAdmin();
  const value = suggestionStatus.parse(status);
  const admin = createAdminClient();
  const { error } = await admin.from("suggestions").update({ status: value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/sugestoes");
}

export async function adminDeleteSuggestion(id: number): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("suggestions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/sugestoes");
}
