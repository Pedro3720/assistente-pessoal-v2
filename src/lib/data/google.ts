import { createClient } from "@/lib/supabase/server";

/** Status da conexão com o Google do usuário atual. Nunca lança (tolera tabela ausente). */
export async function getGoogleConnection(): Promise<{ connected: boolean; email: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase.from("google_accounts").select("google_email").maybeSingle();
  return { connected: !!data, email: (data?.google_email as string | null) ?? null };
}
