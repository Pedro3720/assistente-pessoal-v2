import { DataTable, DataTableRow } from "@/components/ui/data-table";
import { Money } from "@/components/ui/money";
import type { ForecastRow } from "@/lib/finance/forecast";

/**
 * Projeção das próximas faturas do cartão aberto na carteira (Onda 19,
 * Task 11): uma linha por ciclo futuro, com o mês à esquerda e o total à
 * direita. `rows` já vem pronto do servidor (financas/page.tsx), montado por
 * `buildCardForecast`.
 *
 * O texto abaixo da lista não é decorativo: a soma só enxerga o que já está
 * lançado no banco (parcelas futuras e assinaturas ativas), não é uma
 * previsão de gasto. Sem ele, um número que parece completo sem ser passa a
 * impressão errada.
 */
export function CardForecast({ rows }: { rows: ForecastRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div>
      <h3 className="px-1 pb-2 text-sm font-semibold">Próximas faturas</h3>

      <DataTable>
        {rows.map((r, i) => (
          <DataTableRow key={i}>
            <span className="min-w-0 flex-1 capitalize">{r.label}</span>
            <Money value={r.total} className="w-28 shrink-0 text-right font-medium" />
          </DataTableRow>
        ))}
      </DataTable>

      <p className="mt-2 px-1 text-xs text-muted-foreground">
        Só considera o que já está lançado: parcelas e assinaturas. Não estima gasto novo.
      </p>
    </div>
  );
}
