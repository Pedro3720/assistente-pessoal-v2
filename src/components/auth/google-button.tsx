"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * "Entrar com Google" (Supabase Auth, provider Google).
 *
 * IMPORTANTE: tem que ser navegação do cliente, NÃO Server Action com redirect.
 * A CSP do projeto tem `form-action 'self'`, e o Chrome aplica essa diretiva à
 * cadeia de redirect depois de um submit de formulário, então um redirect para
 * accounts.google.com saindo de action seria bloqueado pelo navegador.
 * Por isso este botão fica FORA do <form> do login (dentro dele, um clique
 * submeteria o login por senha).
 */
export function GoogleButton() {
  const [busy, setBusy] = useState(false);

  async function entrar() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        toast.error(error.message);
        setBusy(false);
      }
      // Sucesso: o navegador sai da página. Não mexe no estado.
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o login do Google");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={entrar}
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
    >
      <GoogleG />
      {busy ? "Abrindo o Google..." : "Entrar com Google"}
    </button>
  );
}

/** G do Google nas 4 cores oficiais. Inline, porque a CSP não permite SVG externo. */
function GoogleG() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
