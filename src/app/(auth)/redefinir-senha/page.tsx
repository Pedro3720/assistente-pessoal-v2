import Image from "next/image";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { Reveal } from "@/components/effects/reveal";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RedefinirSenhaPage() {
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
          <p className="mt-1 text-sm text-muted-foreground">Defina sua nova senha de acesso.</p>
          <div className="mt-6">
            <NewPasswordForm mode="reset" />
          </div>
        </div>
      </Reveal>
    </div>
  );
}
