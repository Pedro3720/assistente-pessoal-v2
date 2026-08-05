"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTransactionCategory } from "@/lib/actions/finance";
import { DataTable, DataTableRow } from "@/components/ui/data-table";
import { BrandAvatar } from "@/components/ui/brand-avatar";
import { CategoryChip } from "@/components/ui/category-chip";
import { Money } from "@/components/ui/money";
import { SelectMenu, type SelectOption } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";
import type { Category, Transaction } from "@/types/finance";

/** "DD/MM" a partir de um "YYYY-MM-DD", igual ao helper local de card-detail.tsx. */
function ddmm(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/**
 * Movimentações da fatura em foco na carteira de cartões (Onda 19, Task 9):
 * lista as compras que compõem `fatura_mes` do cartão aberto, com a categoria
 * editável na própria linha.
 *
 * A cor da categoria aqui é sempre `var(--muted-foreground)`, não a paleta de
 * `categoryColor` (chart-1..5): essa paleta deriva da posição no ranking de
 * gasto do mês (um conceito do donut, que não existe nesta lista) e o
 * comentário em `category-chart.ts` é explícito que ela nunca deve ser
 * ciclada para outra coisa. A tabela de Transações (Onda 18) já resolveu o
 * mesmo problema do mesmo jeito, em `transactions-section.tsx`; aqui repete a
 * decisão para as duas telas não discordarem sobre a cor de uma categoria.
 */
export function CardInvoiceRows({
  transactions,
  categories,
  janela,
}: {
  transactions: Transaction[];
  categories: Category[];
  janela: { start: string; end: string } | null;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  // categoria otimista por transação: mostra o valor novo assim que o
  // usuário escolhe, sem esperar o round-trip do servidor; desfaz sozinha se
  // a Server Action falhar.
  const [overrides, setOverrides] = useState<Record<number, number | null>>({});

  const catById = new Map(categories.map((c) => [c.id, c]));
  const options: SelectOption[] = [
    { value: "", label: "Sem categoria" },
    ...categories.map((c) => ({ value: String(c.id), label: c.name, icon: c.icon })),
  ];

  async function trocarCategoria(t: Transaction, novoId: number | null) {
    const anterior = overrides[t.id] !== undefined ? overrides[t.id] : t.category_id;
    setOverrides((o) => ({ ...o, [t.id]: novoId }));
    setSavingId(t.id);
    try {
      await updateTransactionCategory(t.id, novoId);
      router.refresh();
    } catch (e) {
      setOverrides((o) => ({ ...o, [t.id]: anterior }));
      toast.error(e instanceof Error ? e.message : "Erro ao salvar categoria");
    } finally {
      setSavingId(null);
      setEditingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <h3 className="text-sm font-semibold">Movimentações da fatura</h3>
        {janela ? (
          <span className="num text-xs text-muted-foreground">
            {ddmm(janela.start)} a {ddmm(janela.end)}
          </span>
        ) : (
          <span className="text-right text-xs text-muted-foreground">
            Sem fechamento e vencimento definidos, a fatura aparece acumulada. Defina as
            datas no cartão para ver por ciclo.
          </span>
        )}
      </div>

      {transactions.length === 0 ? (
        <p className="rounded-lg bg-card p-4 text-center text-sm text-muted-foreground">
          Nenhuma movimentação nesta fatura.
        </p>
      ) : (
        <DataTable>
          {transactions.map((t) => {
            const catId = overrides[t.id] !== undefined ? overrides[t.id] : t.category_id;
            const cat = catId ? (catById.get(catId) ?? null) : null;
            const salvando = savingId === t.id;
            const editando = editingId === t.id;

            return (
              <DataTableRow
                key={t.id}
                className={cn(salvando && "pointer-events-none opacity-50")}
              >
                <BrandAvatar name={t.description} size={28} />

                <span className="min-w-0 flex-1 truncate font-medium">{t.description}</span>

                {/* a coluna some abaixo de sm pela mesma regra da tabela de
                    Transações (transactions-section.tsx): a linha soma ~360px
                    de largura mínima e o DataTable é overflow-hidden, então
                    num aparelho de 375px o valor ficava cortado. */}
                <span className="hidden w-40 shrink-0 sm:block">
                  {editando ? (
                    <SelectMenu
                      value={catId ? String(catId) : ""}
                      options={options}
                      disabled={salvando}
                      placeholder="Sem categoria"
                      className="w-full"
                      autoOpen
                      onChange={(v) => trocarCategoria(t, v ? Number(v) : null)}
                      onClose={() => setEditingId(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingId(t.id)}
                      disabled={salvando}
                      className="flex w-full items-center rounded-lg px-1 py-1 text-left hover:bg-accent disabled:pointer-events-none"
                    >
                      {cat ? (
                        <CategoryChip name={cat.name} color="var(--muted-foreground)" icon={cat.icon} />
                      ) : (
                        <span className="text-xs text-subtle-foreground">Sem categoria</span>
                      )}
                    </button>
                  )}
                </span>

                <Money
                  value={-Number(t.amount)}
                  signed
                  colorize
                  className="w-28 shrink-0 text-right font-medium"
                />
              </DataTableRow>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
