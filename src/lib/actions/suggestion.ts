"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { idParam } from "@/lib/validation/common";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/auth/admin";
import { suggestionInput, suggestionStatus } from "@/lib/validation/suggestion";
import { uploadImageFile } from "@/lib/storage/upload";

export async function createSuggestion(formData: FormData): Promise<void> {
  const { supabase, userId } = await requireUser();

  const files = formData
    .getAll("image_files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const image_urls: string[] = [];
  for (const file of files) {
    image_urls.push(await uploadImageFile(supabase, "suggestions", userId, file));
  }

  const input = suggestionInput.parse({
    title: formData.get("title"),
    description: (formData.get("description") as string) || null,
    image_url: image_urls[0] ?? null,
    image_urls,
  });

  const { error } = await supabase.from("suggestions").insert({ ...input, user_id: userId });
  if (error) throw new Error(error.message);
  revalidatePath("/sugestoes");
}

export async function setSuggestionStatus(id: number, status: unknown): Promise<void> {
  const rowId = idParam.parse(id);
  const value = suggestionStatus.parse(status);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("suggestions").update({ status: value }).eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidatePath("/sugestoes");
}

export async function deleteSuggestion(id: number): Promise<void> {
  const rowId = idParam.parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("suggestions").delete().eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidatePath("/sugestoes");
}

export async function adminSetSuggestionStatus(id: number, status: unknown): Promise<void> {
  await assertAdmin();
  const rowId = idParam.parse(id);
  const value = suggestionStatus.parse(status);
  const admin = createAdminClient();
  const { error } = await admin.from("suggestions").update({ status: value }).eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/sugestoes");
}

export async function adminDeleteSuggestion(id: number): Promise<void> {
  await assertAdmin();
  const rowId = idParam.parse(id);
  const admin = createAdminClient();
  const { error } = await admin.from("suggestions").delete().eq("id", rowId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/sugestoes");
}
