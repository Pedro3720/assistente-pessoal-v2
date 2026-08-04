"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTransaction } from "@/lib/actions/finance";
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
 * SelectMenu abre o painel só ao clicar no próprio botão; aqui a entrada em
 * modo de edição já É o clique do usuário na categoria, então o primeiro
 * clique dispara os dois: troca o chip pelo SelectMenu E abre o painel dele,
 * em vez de exigir um segundo clique só para abrir. O `useEffect` roda uma
 * vez por montagem (o componente é remontado a cada linha que entra em
 * edição), e dispara um clique real no botão que o próprio SelectMenu
 * renderiza, imitando o que o usuário faria em seguida.
 */
function AutoOpenSelect(props: React.ComponentProps<typeof SelectMenu>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    wrapRef.current?.querySelector("button")?.click();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={wrapRef}>
      <SelectMenu {...props} />
    </div>
  );
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
      // updateTransaction valida o objeto inteiro (não há Server Action de
      // atualizar só a categoria, ver relatório da Task 9), então a chamada
      // reenvia a transação como está e troca apenas category_id.
      await updateTransaction(t.id, {
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        category_id: novoId,
        bank_id: t.bank_id,
        card_id: t.card_id,
        is_card_payment: t.is_card_payment,
        occurred_on: t.occurred_on,
      });
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
      <div className="flex items-center justify-between px-1 pb-2">
        <h3 className="text-sm font-semibold">Movimentações da fatura</h3>
        {janela && (
          <span className="num text-xs text-muted-foreground">
            {ddmm(janela.start)} a {ddmm(janela.end)}
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
            const Select = editando ? AutoOpenSelect : null;

            return (
              <DataTableRow
                key={t.id}
                className={cn(salvando && "pointer-events-none opacity-50")}
              >
                <BrandAvatar name={t.description} size={28} />

                <span className="min-w-0 flex-1 truncate font-medium">{t.description}</span>

                <span className="w-40 shrink-0">
                  {Select ? (
                    <Select
                      value={catId ? String(catId) : ""}
                      options={options}
                      disabled={salvando}
                      placeholder="Sem categoria"
                      className="w-full"
                      onChange={(v) => trocarCategoria(t, v ? Number(v) : null)}
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
