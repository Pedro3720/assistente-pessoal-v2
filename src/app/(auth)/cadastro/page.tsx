import { CadastroForm } from "@/components/auth/cadastro-form";
import { Reveal } from "@/components/effects/reveal";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass fixed right-5 top-5 z-50 rounded-full border border-border p-1 shadow-lg">
        <ThemeToggle />
      </div>
      <Reveal className="w-full max-w-sm">
        <div className="glass rounded-3xl border border-border p-8 shadow-2xl">
          <h1 className="text-gradient text-3xl font-extrabold tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
            Criar conta
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Configure como o assistente vai te tratar.</p>
          <CadastroForm error={error} />
        </div>
      </Reveal>
    </div>
  );
}
