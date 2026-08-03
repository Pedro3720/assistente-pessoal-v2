import "server-only";
import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Origem do nosso Storage. Avatar de fora dela é descartado (a CSP barraria). */
const ORIGEM_SUPABASE = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://qlqewlrzjlbwrybwrimt.supabase.co"
).origin;

/**
 * Nome de exibição a partir do metadata do usuário.
 *
 * O gatilho `handle_new_user` (migração 0005) lê `display_name`, que é o que o
 * nosso cadastro manda. O Google manda `full_name` e `name`, então um usuário
 * criado pelo login Google cairia no app com a saudação vazia.
 */
function nomeDoMetadata(user: User): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  for (const chave of ["display_name", "full_name", "name"] as const) {
    const valor = meta[chave];
    if (typeof valor === "string" && valor.trim().length > 0) return valor.trim();
  }
  const local = user.email?.split("@")[0]?.trim();
  return local && local.length > 0 ? local : null;
}

/**
 * Aceita só avatar servido pelo nosso Storage. O Google manda a URL do
 * googleusercontent.com, que a CSP (`img-src 'self' data: blob: <supabase>`)
 * barra, resultando em avatar quebrado. Descartar é melhor que abrir domínio
 * externo na CSP.
 */
function avatarAceito(url: unknown): boolean {
  if (typeof url !== "string" || url.length === 0) return false;
  try {
    return new URL(url).origin === ORIGEM_SUPABASE;
  } catch {
    return false;
  }
}

/**
 * Roda depois de trocar o código por sessão (login Google ou vinculação de
 * identidade). Idempotente: em conta já completa, não escreve nada. Nunca
 * lança, porque falhar aqui não pode impedir o login.
 */
export async function ensureProfile(
  supabase: SupabaseServerClient,
  user: User
): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("ensureProfile: leitura falhou:", error.message);
    return;
  }

  // Sem linha: o gatilho não rodou (ex.: migração 0005 ausente). Cria o mínimo.
  if (!data) {
    const { error: erroInsert } = await supabase
      .from("profiles")
      .insert({ id: user.id, display_name: nomeDoMetadata(user), avatar_url: null });
    if (erroInsert) console.error("ensureProfile: insert falhou:", erroInsert.message);
    return;
  }

  const patch: { display_name?: string; avatar_url?: null } = {};
  if (!data.display_name) {
    const nome = nomeDoMetadata(user);
    if (nome) patch.display_name = nome;
  }
  if (data.avatar_url && !avatarAceito(data.avatar_url)) patch.avatar_url = null;

  if (Object.keys(patch).length === 0) return;

  const { error: erroUpdate } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
  if (erroUpdate) console.error("ensureProfile: update falhou:", erroUpdate.message);
}
