import { createClient } from "@/lib/supabase/server";

/** true se o e-mail for o do dono (ADMIN_EMAIL), comparando sem caixa/espaços. */
export function isAdminEmail(email: string | null | undefined): boolean {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return !!admin && !!email && email.trim().toLowerCase() === admin;
}

/** Bloqueia se o usuário logado não for o admin. Use no início de toda leitura/ação admin. */
export async function assertAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) throw new Error("Acesso restrito");
}
