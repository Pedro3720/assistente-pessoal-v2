import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Saídas por mês, sem eixo e sem grade. O mês atual não muda de cor: ganha um
 * bloco de fundo atrás da coluna. Cor aqui significaria categoria, e não é
 * disso que o gráfico fala.
 */
export function MonthlyExpenseChart({
  data,
}: {
  data: { label: string; total: number; current: boolean }[];
}) {
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="rounded-lg bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">Saídas por mês</h3>
      <div className="flex items-end gap-1.5 overflow-x-auto">
        {data.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex min-w-[46px] flex-1 flex-col items-center rounded-lg px-1 pb-1.5",
              item.current && "bg-foreground/[0.055]"
            )}
          >
            <div className="flex h-[104px] w-full items-end justify-center">
              <div
                className={cn(
                  "w-full max-w-[26px] rounded-t-md",
                  item.current ? "bg-muted-foreground" : "bg-muted-foreground/70"
                )}
                style={{ height: `${Math.max((item.total / max) * 100, 2)}%` }}
              />
            </div>
            <span
              className={cn(
                "mt-1.5 text-[10px] capitalize",
                item.current ? "text-foreground" : "text-subtle-foreground"
              )}
            >
              {item.label}
            </span>
            <span
              className={cn(
                "num text-[10px]",
                item.current ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {formatBRL(item.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
