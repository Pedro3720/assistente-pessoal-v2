"use client";

import dynamic from "next/dynamic";
import type { CategorySlice } from "@/lib/finance/category-chart";
import { DONUT_HEIGHT } from "./category-donut-chart";

/**
 * Carrega o donut sob demanda: o recharts é a maior dependência de UI do
 * app e só é baixado por quem abre /financas com despesas no mês. O espaço
 * é reservado durante o carregamento para a página não pular.
 */
const Chart = dynamic(
  () => import("./category-donut-chart").then((m) => m.CategoryDonutChart),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center"
        style={{ height: DONUT_HEIGHT }}
        aria-hidden
      >
        <div className="h-32 w-32 rounded-full border-[14px] border-accent" />
      </div>
    ),
  }
);

export function CategoryDonut({ slices, total }: { slices: CategorySlice[]; total: number }) {
  return <Chart slices={slices} total={total} />;
}
