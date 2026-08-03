import { cn } from "@/lib/utils";

/**
 * Barra de progresso com rótulos. A barra trava em 100% mesmo quando o
 * consumo passa do limite, e o número real continua aparecendo no rótulo:
 * uma barra de 700% de largura não cabe na tela e não diz nada a mais.
 */
export function Meter({
  value,
  max,
  leftLabel,
  rightLabel,
  className,
}: {
  value: number;
  max: number;
  leftLabel: React.ReactNode;
  rightLabel: React.ReactNode;
  className?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const over = pct > 100;
  const width = Math.min(Math.max(pct, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">{leftLabel}</span>
        <span className={over ? "text-negative" : "text-muted-foreground"}>{rightLabel}</span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("bar-grow h-1 rounded-full", over ? "bg-negative" : "bg-foreground")}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
