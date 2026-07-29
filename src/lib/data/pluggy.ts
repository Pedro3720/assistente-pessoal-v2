import { createClient } from "@/lib/supabase/server";
import type { PluggyItem, Transaction } from "@/types/finance";

/**
 * Conexões de Open Finance do usuário logado.
 *
 * Cai em lista vazia se a tabela ainda não existir (mesmo padrão das outras
 * leituras do projeto), para a página nunca quebrar antes da migração.
 */
export async function getPluggyItems(): Promise<PluggyItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pluggy_items")
    .select("id,item_id,connector_id,connector_name,connector_image,status,last_synced_at,created_at")
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as PluggyItem[];
}

/**
 * Fila "Para categorizar": o que chegou sozinho do banco e ainda não tem
 * categoria. É a única coisa que sobra para o usuário fazer, já que o
 * lançamento em si não precisa mais ser digitado.
 *
 * Sem recorte de mês de propósito: a fila é uma caixa de entrada, e uma
 * transação de outro mês não pode ficar escondida.
 */
export async function getPendingCategorization(): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("source", "pluggy")
    .is("category_id", null)
    .order("occurred_on", { ascending: false })
    .limit(200);

  if (error) return [];
  return (data ?? []) as Transaction[];
}
