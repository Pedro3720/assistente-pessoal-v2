import { CategoryChip } from "@/components/ui/category-chip";
import { Meter } from "@/components/ui/meter";
import { Money } from "@/components/ui/money";
import { formatBRL } from "@/lib/money";
import type { CategorySlice } from "@/lib/finance/category-chart";

/**
 * Legenda do donut. Cada linha responde duas perguntas em contextos
 * separados: a fatia diz participação no gasto, a barra diz consumo do
 * limite. Assim a categoria aparece uma vez só, sem dois percentuais
 * concorrentes lado a lado.
 */
export function CategoryLegend({ slices }: { slices: CategorySlice[] }) {
  return (
    <div className="mt-4">
      {slices.map((slice) => {
        const over = slice.limit !== null && slice.limit > 0 && slice.total > slice.limit;
        const pct = slice.limit && slice.limit > 0 ? (slice.total / slice.limit) * 100 : 0;

        return (
          <div key={slice.name} className="border-t border-border py-3 first:border-t-0 first:pt-0">
            <div className="flex items-center gap-2">
              <CategoryChip
                name={slice.name}
                color={slice.color}
                icon={slice.icon}
                className="min-w-0 flex-1 text-sm font-medium"
              />
              <Money value={slice.total} className="text-xs text-muted-foreground" />
            </div>

            {slice.limit !== null && slice.limit > 0 ? (
              <Meter
                className="mt-2"
                value={slice.total}
                max={slice.limit}
                leftLabel={`${pct.toFixed(0)}% do limite`}
                rightLabel={
                  over ? `${formatBRL(0)} restante` : `${formatBRL(slice.limit - slice.total)} restante`
                }
              />
            ) : (
              <p className="mt-1.5 text-[11px] text-subtle-foreground">Sem limite definido</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
