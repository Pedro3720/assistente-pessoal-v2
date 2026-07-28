import { Link } from "next-view-transitions";
import Image from "next/image";
import { requestPasswordReset } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Reveal } from "@/components/effects/reveal";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function RecuperarSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass fixed right-5 top-5 z-50 rounded-full border border-border p-1 shadow-lg">
        <ThemeToggle />
      </div>
      <Reveal className="w-full max-w-sm">
        <div className="glass rounded-3xl border border-border p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Zênite" width={48} height={48} className="h-12 w-12 shrink-0 invert dark:invert-0" />
            <h1 className="text-gradient text-3xl font-extrabold tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
              Zênite
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Recuperar senha. Enviaremos um link para o seu e-mail.</p>

          {error && (
            <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}
          {message && (
            <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {message}
            </p>
          )}

          <form className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</label>
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required />
            </div>
            <button
              formAction={requestPasswordReset}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-[0_8px_30px_-8px_var(--primary)] transition-all hover:bg-primary/90"
            >
              Enviar link
            </button>
          </form>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Abra o link no mesmo dispositivo e navegador em que fez este pedido.
          </p>

          <Link href="/login" className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground hover:underline">
            Voltar para o login
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
