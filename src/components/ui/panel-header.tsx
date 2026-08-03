import { cn } from "@/lib/utils";

/**
 * Linha de topo do painel: contexto à esquerda, abas no meio, ações à direita.
 * Fica fora da área de scroll, então continua visível durante a leitura.
 * No celular quebra em duas linhas e rola na horizontal, sem virar menu.
 */
export function PanelHeader({
  context,
  tabs,
  actions,
  className,
}: {
  context?: React.ReactNode;
  tabs?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 px-4 py-3 md:flex-nowrap md:px-6",
        className
      )}
    >
      {context}
      {tabs ? <div className="min-w-0 overflow-x-auto">{tabs}</div> : null}
      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Chip de contexto do header (mês, data). */
export function PanelContext({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
      {children}
    </span>
  );
}
