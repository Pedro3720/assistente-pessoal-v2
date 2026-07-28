"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatBRL } from "@/lib/money";
import type { CategorySlice } from "@/lib/finance/category-chart";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** Altura do gráfico. Reservada também pelo esqueleto, para não pular layout. */
export const DONUT_HEIGHT = 192;

/**
 * Donut das despesas por categoria, com o total no centro.
 *
 * A identidade de cada categoria não depende só da cor: a lista ao lado
 * repete nome, valor e porcentagem com o mesmo marcador colorido, e as
 * fatias são separadas por um vão da cor do card.
 */
export function CategoryDonutChart({
  slices,
  total,
}: {
  slices: CategorySlice[];
  total: number;
}) {
  const reduce = useReducedMotion();
  const biggest = slices[0];

  return (
    <div
      className="relative"
      style={{ height: DONUT_HEIGHT }}
      role="img"
      aria-label={
        biggest
          ? `Despesas do mês: ${formatBRL(total)}. Maior categoria: ${biggest.name}, ${formatBRL(biggest.total)}, ${biggest.pct.toFixed(0)} por cento. Detalhes na lista abaixo.`
          : `Despesas do mês: ${formatBRL(total)}.`
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="total"
            nameKey="name"
            innerRadius="72%"
            outerRadius="92%"
            paddingAngle={2}
            minAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive={!reduce}
            animationDuration={700}
            animationEasing="ease-out"
          >
            {slices.map((s) => (
              <Cell key={s.name} fill={s.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const s = payload[0]?.payload as CategorySlice | undefined;
              if (!s) return null;
              return (
                <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-xl">
                  <p className="flex items-center gap-2 text-xs font-medium">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                      aria-hidden
                    />
                    {s.icon} {s.name}
                  </p>
                  <p className="num mt-0.5 text-sm font-semibold">{formatBRL(s.total)}</p>
                  <p className="num text-[11px] text-muted-foreground">
                    {s.pct.toFixed(0)}% das despesas
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* total no centro (as fatias ocupam o anel; o miolo é o dado principal).
          A fonte é contida para o valor caber no miolo mesmo na casa dos milhares. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Total do mês
        </span>
        <span className="num text-base font-bold leading-tight md:text-lg">{formatBRL(total)}</span>
      </div>
    </div>
  );
}
