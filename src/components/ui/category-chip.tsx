import { EntityIcon } from "@/components/ui/entity-icon";
import { cn } from "@/lib/utils";

/**
 * Identidade de categoria: marcador de cor e nome, sem fundo. Dezenas de
 * badges preenchidos poluiriam a tabela, então a cor vive no marcador e no
 * texto. O ícone repete a identidade para quem não distingue a cor.
 */
export function CategoryChip({
  name,
  color,
  icon,
  className,
}: {
  name: string;
  /** valor de cor pronto, normalmente "var(--chart-N)" */
  color: string;
  icon?: string;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5 text-xs", className)}>
      <span
        className="h-2 w-2 shrink-0 rounded-[3px]"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {icon ? <EntityIcon value={icon} size={13} className="h-3.5 w-3.5 shrink-0" /> : null}
      <span className="truncate" style={{ color }}>
        {name}
      </span>
    </span>
  );
}
