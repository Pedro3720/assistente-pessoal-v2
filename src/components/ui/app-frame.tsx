import { cn } from "@/lib/utils";

/**
 * Moldura do app. No desktop o conteudo vive num painel arredondado que
 * flutua sobre o fundo e rola por dentro, o que mantem o cabecalho sempre
 * visivel. No celular nao ha moldura: a pagina rola normalmente e a
 * navegacao continua sendo a barra inferior.
 */
export function AppFrame({
  header,
  children,
  className,
}: {
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="md:h-screen md:p-3 md:pl-0">
      <div
        className={cn(
          "flex min-h-0 flex-col md:h-full md:overflow-hidden md:rounded-xl md:bg-panel",
          className
        )}
      >
        {header ? <div className="shrink-0">{header}</div> : null}
        <div className="min-h-0 flex-1 md:overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
