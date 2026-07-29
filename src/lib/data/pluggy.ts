import { createClient } from "@/lib/supabase/server";
import type { PluggyItem } from "@/types/finance";

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
