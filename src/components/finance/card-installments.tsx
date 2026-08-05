"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { renameInstallmentGroup } from "@/lib/actions/finance";
import { DataTable, DataTableRow } from "@/components/ui/data-table";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import type { InstallmentGroup } from "@/lib/finance/installments";

/**
 * Parcelamentos em aberto do cartão aberto na carteira (Onda 19, Task 10):
 * cada linha mostra o título (editável clicando nele), "parcela X de Y" e o
 * valor da parcela corrente; abaixo, o total que ainda falta pagar nos meses
 * seguintes.
 *
 * `groups` já vem pronto do servidor (financas/page.tsx), agrupado por
 * `purchase_group` via `buildInstallmentGroups`.
 */
export function CardInstallments({ groups }: { groups: InstallmentGroup[] }) {
  const router = useRouter();
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [savingGroup, setSavingGroup] = useState<string | null>(null);

  // sem parcelamento em aberto, o card inteiro não aparece
  if (groups.length === 0) return null;

  const totalFalta = groups.reduce((s, g) => s + g.falta, 0);

  function iniciarEdicao(g: InstallmentGroup) {
    setEditingGroup(g.purchaseGroup);
    setTitulo(g.titulo);
  }

  async function salvar(g: InstallmentGroup) {
    const novoTitulo = titulo.trim();
    setEditingGroup(null);
    if (!novoTitulo || novoTitulo === g.titulo) return;
    setSavingGroup(g.purchaseGroup);
    try {
      await renameInstallmentGroup(g.purchaseGroup, novoTitulo);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao renomear parcelamento");
    } finally {
      setSavingGroup(null);
    }
  }

  return (
    <div>
      <h3 className="px-1 pb-2 text-sm font-semibold">Parcelamentos em aberto</h3>

      <DataTable>
        {groups.map((g) => {
          const editando = editingGroup === g.purchaseGroup;
          const salvando = savingGroup === g.purchaseGroup;

          return (
            <DataTableRow
              key={g.purchaseGroup}
              className={cn(salvando && "pointer-events-none opacity-50")}
            >
              <div className="min-w-0 flex-1">
                {editando ? (
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    onBlur={() => salvar(g)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      } else if (e.key === "Escape") {
                        setEditingGroup(null);
                      }
                    }}
                    autoFocus
                    maxLength={120}
                    className="w-full rounded-lg border border-border bg-muted px-2 py-1 text-sm"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => iniciarEdicao(g)}
                    disabled={salvando}
                    className="block w-full truncate text-left font-medium hover:underline disabled:pointer-events-none"
                  >
                    {g.titulo}
                  </button>
                )}
                <p className="text-xs text-muted-foreground">
                  parcela {g.atual} de {g.total}
                </p>
              </div>

              <Money value={g.valorParcela} className="w-28 shrink-0 text-right font-medium" />
            </DataTableRow>
          );
        })}
      </DataTable>

      <p className="mt-2 px-1 text-xs text-muted-foreground">
        Falta pagar <Money value={totalFalta} className="font-medium" /> nas próximas faturas.
      </p>
    </div>
  );
}
