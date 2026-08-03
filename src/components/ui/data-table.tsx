import { cn } from "@/lib/utils";

/**
 * Casca de tabela do app: densidade de 54px, separação por hairline (não por
 * gap) e hover na linha inteira. Não sabe nada sobre o dado; as colunas são
 * montadas por quem usa.
 */
export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg bg-card", className)}>{children}</div>
  );
}

export function DataTableHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
      {children}
    </div>
  );
}

export function DataTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-[54px] items-center gap-3 border-t border-border px-3 text-sm transition-colors hover:bg-secondary first:border-t-0",
        className
      )}
    >
      {children}
    </div>
  );
}
