"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { passwordInput } from "@/lib/validation/password";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, userId: user.id };
}

function revalidate() {
  revalidatePath("/senhas");
}

export async function createPassword(raw: unknown) {
  const input = passwordInput.parse(raw);
  const { supabase, userId } = await ctx();
  const { error } = await supabase.from("passwords").insert({
    user_id: userId,
    title: input.title,
    username: input.username || null,
    url: input.url || null,
    notes: input.notes || null,
    secret: input.password ? encryptSecret(input.password) : null,
  });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function updatePassword(id: number, raw: unknown) {
  const input = passwordInput.parse(raw);
  const { supabase } = await ctx();
  const patch: Record<string, string | null> = {
    title: input.title,
    username: input.username || null,
    url: input.url || null,
    notes: input.notes || null,
  };
  // Só troca a senha se o usuário digitou uma nova (em branco = mantém a atual).
  if (input.password) patch.secret = encryptSecret(input.password);

  const { error } = await supabase.from("passwords").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deletePassword(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("passwords").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

/** Decifra e devolve a senha de UM item, sob demanda. */
export async function revealPassword(id: number): Promise<string> {
  const { supabase } = await ctx();
  const { data, error } = await supabase.from("passwords").select("secret").eq("id", id).single();
  if (error) throw new Error(error.message);
  const secret = (data?.secret as string | null) ?? null;
  return secret ? decryptSecret(secret) : "";
}
