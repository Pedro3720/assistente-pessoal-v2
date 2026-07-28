/**
 * Dados do gráfico de despesas por categoria (donut de /financas).
 *
 * Roda no servidor (a página monta as fatias e passa prontas ao componente
 * client), mantendo regra de negócio fora do JSX.
 */

/**
 * Cores de identidade das categorias: tokens `--chart-1..5`, em ordem fixa.
 * A ordem é o que garante a separação entre vizinhas (inclusive para
 * daltonismo), então ela nunca muda e a paleta NUNCA é ciclada: da sexta
 * categoria em diante a cor é a neutra de "Outras".
 */
const CATEGORY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Cor da fatia agregada "Outras": neutra, fora da paleta categórica. */
const OTHERS_COLOR = "var(--muted-foreground)";

/** Quantas categorias ganham fatia própria antes de agregar em "Outras". */
export const MAX_SLICES = CATEGORY_COLORS.length;

export type CategorySlice = {
  name: string;
  icon: string;
  total: number;
  /** participação no total de despesas, em porcentagem */
  pct: number;
  color: string;
};

/** Cor de uma categoria pela posição na lista ordenada (desc por valor). */
export function categoryColor(index: number): string {
  return index < MAX_SLICES ? CATEGORY_COLORS[index] : OTHERS_COLOR;
}

/**
 * Monta as fatias do donut a partir das despesas por categoria já ordenadas
 * do maior para o menor. As `MAX_SLICES` maiores viram fatias próprias e o
 * restante é somado em uma fatia "Outras" (donut com muitas fatias fica
 * ilegível, e ciclar cor quebraria a identidade).
 */
export function buildCategorySlices(
  entries: [string, { icon: string; total: number }][],
  expenseTotal: number
): { slices: CategorySlice[]; othersCount: number } {
  const pctOf = (v: number) => (expenseTotal > 0 ? (v / expenseTotal) * 100 : 0);

  const head = entries.slice(0, MAX_SLICES).map(([name, { icon, total }], i) => ({
    name,
    icon,
    total,
    pct: pctOf(total),
    color: categoryColor(i),
  }));

  const rest = entries.slice(MAX_SLICES);
  if (rest.length === 0) return { slices: head, othersCount: 0 };

  const othersTotal = rest.reduce((s, [, { total }]) => s + total, 0);
  return {
    slices: [
      ...head,
      {
        name: "Outras",
        icon: "•",
        total: othersTotal,
        pct: pctOf(othersTotal),
        color: OTHERS_COLOR,
      },
    ],
    othersCount: rest.length,
  };
}
