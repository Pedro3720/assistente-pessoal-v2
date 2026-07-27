"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { profileInput } from "@/lib/validation/profile";
import { uploadAvatarFile } from "@/lib/storage/avatar";

export async function updateProfile(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();

  let avatar_url = (formData.get("avatar_url") as string) || null;
  const file = formData.get("avatar_file");
  if (file instanceof File && file.size > 0) {
    avatar_url = await uploadAvatarFile(supabase, user.id, file);
  }

  const input = profileInput.parse({
    display_name: formData.get("display_name"),
    phone: (formData.get("phone") as string) || null,
    avatar_url,
  });

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...input });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  revalidatePath("/perfil");
}
