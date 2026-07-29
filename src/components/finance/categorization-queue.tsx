"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Inbox, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/money";
import { formatDateBR } from "@/lib/dates";
import { categorizeTransactions } from "@/lib/actions/pluggy";
import { CategorySelect } from "./category-select";
import { useAnimatedList } from "@/hooks/use-animated-list";
import type { Category, Transaction } from "@/types/finance";

/**
 * Fila "Para categorizar": tudo que chegou sozinho do banco e ainda não tem
 * categoria.
 *
 * É o único trabalho que sobra para o usuário depois da integração: o
 * lançamento já entrou, com data, valor e descrição. Dá para categorizar uma a
 * uma pelo seletor da linha, ou marcar várias e aplicar a mesma categoria de
 * uma vez, que é o caminho rápido quando chega um lote do banco.
 */
export function CategorizationQueue({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: Category[];
}) {
  const router = useRouter();
  const listRef = useAnimatedList();
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set());
  const [salvando, setSalvando] = useState(false);

  if (transactions.length === 0) return null;

  function alternar(id: number) {
    setSelecionadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }

  function alternarTodas() {
    setSelecionadas((atual) =>
      atual.size === transactions.length ? new Set() : new Set(transactions.map((t) => t.id))
    );
  }

  async function aplicar(ids: number[], categoryId: number) {
    setSalvando(true);
    try {
      await categorizeTransactions(ids, categoryId);
      setSelecionadas(new Set());
      toast.success(
        ids.length === 1 ? "Transação categorizada." : `${ids.length} transações categorizadas.`
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao categorizar.");
    } finally {
      setSalvando(false);
    }
  }

  const marcadas = [...selecionadas];

  return (
    <div className="glass card-glow rounded-2xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Para categorizar</h3>
          <span className="num rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {transactions.length}
          </span>
        </div>
        <button
          onClick={alternarTodas}
          className="text-xs font-medium text-primary hover:underline"
        >
          {selecionadas.size === transactions.length ? "Limpar seleção" : "Selecionar todas"}
        </button>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        Chegaram do seu banco automaticamente. Escolha a categoria de cada uma, ou marque várias e
        aplique de uma vez.
      </p>

      {marcadas.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-medium">
            {marcadas.length} {marcadas.length === 1 ? "selecionada" : "selecionadas"}
          </span>
          <span className="text-sm text-muted-foreground">aplicar categoria:</span>
          <CategorySelect
            value={null}
            categories={categories.filter(
              (c) => c.kind === (transactions.find((t) => t.id === marcadas[0])?.type ?? "expense")
            )}
            kind={transactions.find((t) => t.id === marcadas[0])?.type ?? "expense"}
            disabled={salvando}
            onChange={(id) => id && aplicar(marcadas, id)}
          />
        </div>
      )}

      <div ref={listRef} className="mt-3 divide-y divide-border">
        {transactions.map((t) => {
          const marcada = selecionadas.has(t.id);
          return (
            <div
              key={t.id}
              className={`flex flex-wrap items-center gap-3 py-2.5 transition-colors ${
                marcada ? "bg-primary/5" : ""
              }`}
            >
              <button
                onClick={() => alternar(t.id)}
                aria-label={marcada ? "Desmarcar" : "Marcar"}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  marcada ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {marcada && <Check className="h-3 w-3" />}
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.description}</p>
                <p className="num text-xs text-muted-foreground">{formatDateBR(t.occurred_on)}</p>
              </div>

              <span
                className={`num shrink-0 text-sm font-semibold ${
                  t.type === "income" ? "text-positive" : "text-negative"
                }`}
              >
                {t.type === "income" ? "+" : "-"}
                {formatBRL(Number(t.amount))}
              </span>

              <CategorySelect
                value={t.category_id}
                categories={categories.filter((c) => c.kind === t.type)}
                kind={t.type}
                disabled={salvando}
                onChange={(id) => id && aplicar([t.id], id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
