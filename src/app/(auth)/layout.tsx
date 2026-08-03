/**
 * As telas de entrada mantêm os efeitos decorativos (grão, gradiente animado)
 * que saíram do app: ali eles vendem o produto e não atrapalham leitura de dado.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div className="grain-overlay" aria-hidden />
    </>
  );
}
