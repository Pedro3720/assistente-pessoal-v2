import { cn } from "@/lib/utils";

/**
 * Moldura do app. No desktop o conteudo vive num painel arredondado que
 * flutua sobre o fundo e rola por dentro. No celular nao ha moldura: a
 * pagina rola normalmente e a navegacao continua sendo a barra inferior.
 *
 * Não expõe slot de cabeçalho fora da área de scroll: nenhuma rota usava
 * (cada uma sabe o que quer no próprio cabeçalho), então quem precisa de
 * cabeçalho fixo no desktop aplica sticky no próprio componente (ver
 * PanelHeader).
 */
export function AppFrame({
  children,
  className,
}: {
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
        <div className="min-h-0 flex-1 md:overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
