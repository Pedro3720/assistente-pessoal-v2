import { login, signup } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Reveal } from "@/components/effects/reveal";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Reveal className="w-full max-w-sm">
        <div className="glass rounded-3xl border border-border p-8 shadow-2xl">
          <h1
            className="text-gradient text-3xl font-extrabold tracking-tighter"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Assistente Pessoal
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre para acessar seu painel.</p>

          {error && (
            <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          {message && (
            <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {message}
            </p>
          )}

          <form className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                E-mail
              </label>
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha
              </label>
              <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                formAction={login}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-[0_8px_30px_-8px_var(--primary)] transition-all hover:bg-primary/90 hover:shadow-[0_10px_40px_-8px_var(--primary)]"
              >
                Entrar
              </button>
              <button
                formAction={signup}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Criar conta
              </button>
            </div>
          </form>
        </div>
      </Reveal>
    </div>
  );
}
