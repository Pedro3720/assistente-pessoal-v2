import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pluggy, mapearValor } from "./client";

/**
 * Sincronização de transações da Pluggy para o Zênite.
 *
 * Usada em três gatilhos: sync inicial ao conectar (Fase 2), webhook e cron
 * (Fase 3). A função é a mesma nos três para não haver duas verdades sobre
 * como um lançamento entra no app.
 *
 * Invariantes de segurança:
 * - Toda escrita é escopada por `userId`, inclusive quando roda com
 *   service_role (webhook/cron): o dono vem sempre do mapeamento em
 *   `pluggy_items`, nunca do corpo do webhook.
 * - Idempotência por `external_id` + índice único (user_id, external_id):
 *   webhook e cron podem rodar juntos sem duplicar.
 */

/** URL pública do app, usada como webhookUrl da Pluggy. */
export function appUrl(): string | null {
  const explicita = process.env.APP_URL;
  if (explicita) return explicita.replace(/\/$/, "");
  // a Vercel injeta VERCEL_URL (sem protocolo) automaticamente
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return null;
}

/** Janela padrão do sync: 90 dias para trás cobre o histórico inicial. */
const DIAS_PADRAO = 90;

function desde(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

type ContaMapeada = { bankId: number; pluggyAccountId: string };

/**
 * Importa as transações das contas informadas.
 * Retorna quantas foram inseridas de fato (as repetidas são ignoradas).
 */
export async function syncContas(
  db: SupabaseClient,
  userId: string,
  contas: ContaMapeada[],
  opcoes: { dias?: number } = {}
): Promise<{ inseridas: number; lidas: number }> {
  const client = pluggy();
  const dateFrom = desde(opcoes.dias ?? DIAS_PADRAO);
  let inseridas = 0;
  let lidas = 0;

  for (const conta of contas) {
    // fetchAllTransactions varre todas as páginas (fetchTransactions está deprecated)
    const transacoes = await client.fetchAllTransactions(conta.pluggyAccountId, { dateFrom });
    lidas += transacoes.length;
    if (transacoes.length === 0) continue;

    const linhas = transacoes.map((t) => {
      const { type, amount } = mapearValor(t.type, t.amount);
      return {
        user_id: userId,
        description: t.description || "Lançamento",
        amount,
        type,
        // chega sem categoria de propósito: quem categoriza é o usuário
        category_id: null,
        bank_id: conta.bankId,
        card_id: null,
        is_card_payment: false,
        occurred_on: new Date(t.date).toISOString().slice(0, 10),
        external_id: t.id,
        source: "pluggy",
      };
    });

    // upsert com ignoreDuplicates: o índice único (user_id, external_id) é
    // quem garante que reentrega de webhook ou cron sobreposto não duplique
    const { data, error } = await db
      .from("transactions")
      .upsert(linhas, { onConflict: "user_id,external_id", ignoreDuplicates: true })
      .select("id");

    if (error) throw new Error(`Falha ao gravar transações: ${error.message}`);
    inseridas += data?.length ?? 0;
  }

  return { inseridas, lidas };
}

/** Contas automáticas de um item, já mapeadas para os bancos do app. */
export async function contasDoItem(
  db: SupabaseClient,
  userId: string,
  itemId: string
): Promise<ContaMapeada[]> {
  const { data, error } = await db
    .from("banks")
    .select("id,pluggy_account_id")
    .eq("user_id", userId)
    .eq("pluggy_item_id", itemId)
    .not("pluggy_account_id", "is", null);

  if (error) throw new Error(error.message);
  return (data ?? []).map((b) => ({
    bankId: b.id as number,
    pluggyAccountId: b.pluggy_account_id as string,
  }));
}

/** Marca o item e as contas como sincronizados agora. */
export async function marcarSincronizado(
  db: SupabaseClient,
  userId: string,
  itemId: string
): Promise<void> {
  const agora = new Date().toISOString();
  await db
    .from("pluggy_items")
    .update({ last_synced_at: agora })
    .eq("user_id", userId)
    .eq("item_id", itemId);
  await db
    .from("banks")
    .update({ last_synced_at: agora })
    .eq("user_id", userId)
    .eq("pluggy_item_id", itemId);
}

/** Sync completo de um item: descobre as contas e importa as transações. */
export async function syncItem(
  db: SupabaseClient,
  userId: string,
  itemId: string,
  opcoes: { dias?: number } = {}
): Promise<{ inseridas: number; lidas: number }> {
  const contas = await contasDoItem(db, userId, itemId);
  if (contas.length === 0) return { inseridas: 0, lidas: 0 };
  const r = await syncContas(db, userId, contas, opcoes);
  await marcarSincronizado(db, userId, itemId);
  return r;
}
