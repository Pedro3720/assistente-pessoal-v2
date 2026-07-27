"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";

export async function disconnectGoogle() {
  const { supabase, userId } = await requireUser();

  const { error } = await supabase.from("google_accounts").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/calendario");
}
