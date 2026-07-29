"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { syncPluggyItem } from "@/lib/actions/pluggy";
import { formatDateBR } from "@/lib/dates";
import type { PluggyItem } from "@/types/finance";

/**
 * Conexões de Open Finance dentro do card de contas.
 *
 * O botão de sincronizar é o caminho de desenvolvimento: como o webhook da
 * Pluggy não alcança localhost, é ele que traz as novidades. Em produção o
 * webhook e o cron fazem isso sozinhos, e o botão vira apenas um atalho.
 */
export function PluggyConnections({ items }: { items: PluggyItem[] }) {
  const router = useRouter();
  const [sincronizando, setSincronizando] = useState<string | null>(null);

  if (items.length === 0) return null;

  async function sincronizar(itemId: string) {
    setSincronizando(itemId);
    const aviso = toast.loading("Buscando novidades no banco...");
    try {
      const r = await syncPluggyItem(itemId);
      if (r.contas === 0) {
        toast.warning(
          "O banco ainda está preparando os dados. Tente de novo em alguns instantes.",
          { id: aviso }
        );
      } else {
        toast.success(
          `${r.contas} ${r.contas === 1 ? "conta" : "contas"} e ${r.transacoes} ${
            r.transacoes === 1 ? "transação nova" : "transações novas"
          }.`,
          { id: aviso }
        );
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao sincronizar.", { id: aviso });
    } finally {
      setSincronizando(null);
    }
  }

  return (
    <div className="mt-4 space-y-1.5 border-t border-border pt-3">
      <p className="text-xs font-medium text-muted-foreground">Bancos conectados</p>
      {items.map((it) => (
        <div key={it.item_id} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm">
            {it.connector_name ?? "Banco"}
            <span className="ml-2 text-xs text-muted-foreground">
              {it.last_synced_at
                ? `sincronizado em ${formatDateBR(it.last_synced_at.slice(0, 10))}`
                : "ainda não sincronizado"}
            </span>
          </span>
          <button
            onClick={() => sincronizar(it.item_id)}
            disabled={sincronizando !== null}
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${sincronizando === it.item_id ? "animate-spin" : ""}`} />
            {sincronizando === it.item_id ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      ))}
    </div>
  );
}
