import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Guard de sessão único e reutilizável para Server Actions que mutam dados.
 * Cria o client do servidor (RLS aplicado com a identidade real, auth.uid()) e
 * exige um usuário autenticado. Lança se não houver sessão.
 *
 * Substitui os ctx() que antes eram copiados em cada arquivo de actions.
 * O tipo de retorno é inferido (mesmo formato { supabase, userId } de antes),
 * com o objeto `user` a mais para quem precisar (ex.: e-mail).
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, user, userId: user.id };
}
