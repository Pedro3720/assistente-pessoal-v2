"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import type { UserIdentity } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Vincular a conta Google à conta ATUAL (não é login, é linkIdentity).
 *
 * Por que existe: todos os dados do app são por `user_id`. Se o login Google
 * criasse um usuário novo, o app abriria vazio. Vinculando a identidade aqui,
 * o "Entrar com Google" passa a cair sempre no mesmo usuário.
 *
 * Exige "Manual linking" ligado no painel do Supabase (Authentication).
 */
export function GoogleIdentity() {
  const [carregando, setCarregando] = useState(true);
  const [busy, setBusy] = useState(false);
  const [identidades, setIdentidades] = useState<UserIdentity[]>([]);

  const carregar = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUserIdentities();
    if (error) {
      toast.error(error.message);
      setCarregando(false);
      return;
    }
    setIdentidades(data?.identities ?? []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const google = identidades.find((i) => i.provider === "google");

  async function vincular() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/perfil`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        toast.error(error.message);
        setBusy(false);
      }
      // Sucesso: sai da página para o Google.
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o Google");
      setBusy(false);
    }
  }

  async function desvincular() {
    if (!google) return;
    // Trava de segurança: sem outra identidade, desvincular tranca o dono fora.
    if (identidades.length < 2) {
      toast.error("Esta é a única forma de entrar na conta. Defina uma senha antes de desvincular.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.unlinkIdentity(google);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Conta Google desvinculada.");
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível desvincular");
    } finally {
      setBusy(false);
    }
  }

  if (carregando) return null;

  if (google) {
    const email =
      typeof google.identity_data?.email === "string" ? google.identity_data.email : "conta Google";
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground">
          Vinculada: <span className="font-medium">{email}</span>
        </p>
        <button
          onClick={desvincular}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
        >
          <Unlink className="h-4 w-4" /> {busy ? "Desvinculando..." : "Desvincular"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={vincular}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      <Link2 className="h-4 w-4" /> {busy ? "Abrindo o Google..." : "Vincular conta Google"}
    </button>
  );
}
