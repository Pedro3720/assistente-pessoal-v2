import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, phone, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    // Perfil é "chrome" (nome/avatar). Se a leitura falhar (ex.: tabela ainda
    // não migrada), degrada para null em vez de derrubar toda a área logada.
    console.error("getProfile falhou:", error.message);
    return null;
  }
  return (data as Profile | null) ?? null;
}
