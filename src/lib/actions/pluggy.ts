"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { enforceRate } from "@/lib/ratelimit";
import { pluggy } from "@/lib/pluggy/client";
import { syncItem } from "@/lib/pluggy/sync";
import { BANKS } from "@/lib/finance/banks";

function revalidate() {
  revalidatePath("/financas");
  revalidatePath("/");
}

/**
 * Tenta casar o nome do conector da Pluggy com uma das logos que o app já tem
 * (Onda 15), para a conta nascer com a marca certa em vez de um ícone genérico.
 */
function iconePorConector(nomeConector: string): string {
  const alvo = nomeConector
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

  const achado = BANKS.find((b) => {
    const slug = b.slug.replace(/[^a-z0-9]/g, "");
    const nome = b.nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]/g, "");
    return alvo.includes(slug) || alvo.includes(nome);
  });

  return achado ? `bank:${achado.slug}` : "landmark";
}

/**
 * Registra no Zênite uma conexão criada pelo widget da Pluggy.
 *
 * SEGURANÇA: o `itemId` chega do navegador, então NÃO se confia nele. Antes de
 * qualquer escrita, o item é buscado na API e conferido: o `clientUserId` dele
 * precisa ser o usuário da sessão. Sem isso, alguém poderia enviar o itemId de
 * outra pessoa e passar a receber as contas e transações dela.
 */
export async function savePluggyItem(itemId: string) {
  const { supabase, userId } = await requireUser();
  await enforceRate("pluggyConnect", userId);

  if (!itemId || typeof itemId !== "string") {
    throw new Error("Conexão inválida.");
  }

  const client = pluggy();
  const item = await client.fetchItem(itemId);

  if (item.clientUserId !== userId) {
    // não revela nada sobre o item: só recusa
    throw new Error("Esta conexão não pertence à sua conta.");
  }

  // 1) registra a conexão
  const { error: itemErr } = await supabase.from("pluggy_items").upsert(
    {
      user_id: userId,
      item_id: item.id,
      connector_id: item.connector?.id ?? null,
      connector_name: item.connector?.name ?? null,
      connector_image: item.connector?.imageUrl ?? null,
      status: item.status ?? null,
    },
    { onConflict: "user_id,item_id" }
  );
  if (itemErr) throw new Error(`Não foi possível salvar a conexão: ${itemErr.message}`);

  // 2) cria uma conta do app para cada conta corrente/poupança
  //    (cartão de crédito é a Fase 6; aqui só contas BANK)
  const { results: contas } = await client.fetchAccounts(item.id, "BANK");
  const icone = iconePorConector(item.connector?.name ?? "");

  for (const conta of contas) {
    const { error } = await supabase.from("banks").upsert(
      {
        user_id: userId,
        name: conta.marketingName || conta.name || item.connector?.name || "Conta",
        icon: icone,
        // saldo inicial fica zero: o saldo real vem do histórico importado
        opening_balance: 0,
        pluggy_item_id: item.id,
        pluggy_account_id: conta.id,
        is_auto: true,
      },
      { onConflict: "user_id,pluggy_account_id" }
    );
    if (error) throw new Error(`Não foi possível criar a conta: ${error.message}`);
  }

  // 3) primeira carga de transações
  let inseridas = 0;
  try {
    const r = await syncItem(supabase, userId, item.id);
    inseridas = r.inseridas;
  } catch (e) {
    // a conexão já está salva; se a carga falhar, o cron tenta de novo depois
    console.error("[pluggy] sync inicial:", e instanceof Error ? e.message : e);
  }

  revalidate();
  return { contas: contas.length, transacoes: inseridas };
}

/** Sincroniza sob demanda (botão na UI), útil em dev onde o webhook não chega. */
export async function syncPluggyItem(itemId: string) {
  const { supabase, userId } = await requireUser();
  await enforceRate("pluggySync", userId);

  const { data: vinculo, error } = await supabase
    .from("pluggy_items")
    .select("item_id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!vinculo) throw new Error("Conexão não encontrada.");

  const r = await syncItem(supabase, userId, itemId, { dias: 30 });
  revalidate();
  return r;
}
