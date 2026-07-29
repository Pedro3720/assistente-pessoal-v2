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
 * Espera o item terminar de coletar os dados.
 *
 * O widget chama `onSuccess` assim que o login dá certo, mas nesse momento a
 * Pluggy ainda está em `UPDATING` (ACCOUNTS_IN_PROGRESS, TRANSACTIONS_IN_PROGRESS
 * e afins) e `fetchAccounts` volta vazio. Sem esta espera, a conexão era criada
 * sem nenhuma conta.
 *
 * Não falha se estourar o tempo: em produção o webhook completa depois, e a UI
 * oferece "Sincronizar agora".
 */
async function aguardarItemPronto(itemId: string) {
  const client = pluggy();
  let item = await client.fetchItem(itemId);
  const limite = Date.now() + 25_000; // teto curto: Server Action não pode demorar
  while (item.status === "UPDATING" && Date.now() < limite) {
    await new Promise((r) => setTimeout(r, 2500));
    item = await client.fetchItem(itemId);
  }
  return item;
}

/**
 * Vincula as contas do item e importa as transações. Idempotente: pode rodar de
 * novo à vontade (upsert por `pluggy_account_id` e dedupe por `external_id`),
 * o que é justamente o que permite consertar uma conexão que ficou incompleta.
 */
async function vincularEImportar(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  itemId: string,
  connectorName: string | null
) {
  const client = pluggy();
  // cartão de crédito é a Fase 6; aqui só conta corrente e poupança
  const { results: contas } = await client.fetchAccounts(itemId, "BANK");
  const icone = iconePorConector(connectorName ?? "");

  for (const conta of contas) {
    const { error } = await supabase.from("banks").upsert(
      {
        user_id: userId,
        name: conta.marketingName || conta.name || connectorName || "Conta",
        icon: icone,
        // saldo inicial zero: o saldo real vem do histórico importado
        opening_balance: 0,
        pluggy_item_id: itemId,
        pluggy_account_id: conta.id,
        is_auto: true,
      },
      { onConflict: "user_id,pluggy_account_id" }
    );
    if (error) throw new Error(`Não foi possível criar a conta: ${error.message}`);
  }

  let inseridas = 0;
  if (contas.length > 0) {
    const r = await syncItem(supabase, userId, itemId);
    inseridas = r.inseridas;
  }
  return { contas: contas.length, transacoes: inseridas };
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

  const item = await aguardarItemPronto(itemId);

  if (item.clientUserId !== userId) {
    // não revela nada sobre o item: só recusa
    throw new Error("Esta conexão não pertence à sua conta.");
  }

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

  try {
    const r = await vincularEImportar(supabase, userId, item.id, item.connector?.name ?? null);
    revalidate();
    return r;
  } catch (e) {
    // a conexão já está salva: o botão Sincronizar (ou o cron) completa depois
    console.error("[pluggy] carga inicial:", e instanceof Error ? e.message : e);
    revalidate();
    return { contas: 0, transacoes: 0 };
  }
}

/**
 * Sincroniza sob demanda (botão na UI). Também RE-VINCULA as contas, então
 * resolve o caso de uma conexão que ficou sem contas porque a Pluggy ainda
 * estava coletando. É o caminho usado em desenvolvimento, onde o webhook não
 * chega em localhost.
 */
export async function syncPluggyItem(itemId: string) {
  const { supabase, userId } = await requireUser();
  await enforceRate("pluggySync", userId);

  const { data: vinculo, error } = await supabase
    .from("pluggy_items")
    .select("item_id,connector_name")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!vinculo) throw new Error("Conexão não encontrada.");

  const item = await aguardarItemPronto(itemId);
  if (item.clientUserId !== userId) throw new Error("Esta conexão não pertence à sua conta.");

  await supabase
    .from("pluggy_items")
    .update({ status: item.status ?? null })
    .eq("user_id", userId)
    .eq("item_id", itemId);

  const r = await vincularEImportar(supabase, userId, itemId, vinculo.connector_name);
  revalidate();
  return r;
}
