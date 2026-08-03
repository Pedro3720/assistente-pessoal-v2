import { cn } from "@/lib/utils";

/**
 * Linha de topo do painel: contexto à esquerda, abas no meio, ações à direita.
 * No desktop fica grudado no topo da área de scroll do painel (o AppFrame
 * não expõe um slot de cabeçalho fora do scroll para quem usa `header`;
 * como só esta página compõe um cabeçalho hoje, o mais simples é o próprio
 * PanelHeader se fixar por cima do conteúdo enquanto rola). No celular quebra
 * em duas linhas e rola na horizontal, sem virar menu, e não é sticky (a
 * página inteira rola ali, não há painel).
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
        "flex flex-wrap items-center gap-2 px-4 py-3 md:flex-nowrap md:sticky md:top-0 md:z-10 md:bg-panel md:px-6",
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
