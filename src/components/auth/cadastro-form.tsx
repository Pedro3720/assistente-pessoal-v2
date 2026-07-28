"use client";

import { Link } from "next-view-transitions";
import { Input } from "@/components/ui/input";
import { AvatarPicker } from "@/components/profile/avatar-picker";
import { signupWithProfile } from "@/lib/actions/auth";

export function CadastroForm({ error }: { error?: string }) {
  return (
    <form action={signupWithProfile} className="mt-6 space-y-4">
      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="display_name" className="text-sm font-medium">Como o assistente vai te chamar</label>
        <Input id="display_name" name="display_name" placeholder="Seu nome" required />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">E-mail</label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">Senha</label>
        <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="••••••••" required />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium">Telefone (opcional)</label>
        <Input id="phone" name="phone" placeholder="(00) 00000-0000" />
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">Foto / avatar</span>
        <AvatarPicker name="cadastro" initialUrl={null} />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-[0_8px_30px_-8px_var(--primary)] transition-all hover:bg-primary/90"
      >
        Criar conta
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary hover:underline">Entrar</Link>
      </p>
    </form>
  );
}
