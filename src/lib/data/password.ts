import { createClient } from "@/lib/supabase/server";
import type { PasswordItem } from "@/types/password";

export async function getPasswords(): Promise<PasswordItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("passwords")
    .select("id,title,username,url,notes,secret")
    .order("title");
  if (error) throw new Error(error.message);

  // Não devolvemos o texto cifrado ao cliente — só se existe uma senha guardada.
  return (data ?? []).map((r) => ({
    id: r.id as number,
    title: r.title as string,
    username: (r.username as string | null) ?? null,
    url: (r.url as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    has_secret: !!r.secret,
  }));
}
