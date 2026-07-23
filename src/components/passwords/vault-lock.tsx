"use client";

import { useState } from "react";
import { Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { unlockWithBiometric, disableVaultProtection } from "@/lib/passwords/biometric";

export function VaultLock({
  onUnlock,
  onDisable,
}: {
  onUnlock: () => void;
  onDisable: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  async function unlock() {
    setBusy(true);
    try {
      await unlockWithBiometric();
      onUnlock();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível desbloquear");
      setShowHelp(true);
    } finally {
      setBusy(false);
    }
  }

  function disable() {
    disableVaultProtection();
    onDisable();
    toast.success("Proteção desativada");
  }

  return (
    <div className="glass flex flex-col items-center justify-center gap-4 rounded-2xl border border-border py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Fingerprint className="h-7 w-7 text-primary" />
      </div>
      <div>
        <p className="text-base font-semibold">Cofre bloqueado</p>
        <p className="mt-1 text-sm text-muted-foreground">Use o Face ID para ver suas senhas.</p>
      </div>
      <button
        onClick={unlock}
        disabled={busy}
        className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {busy ? "Aguardando..." : "Desbloquear com Face ID"}
      </button>

      {!showHelp ? (
        <button
          onClick={() => setShowHelp(true)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Problemas com o Face ID?
        </button>
      ) : (
        <div className="max-w-xs space-y-2">
          <p className="text-xs text-muted-foreground">
            Se a biometria não funcionar neste dispositivo, você pode desativar a proteção do cofre.
          </p>
          <button
            onClick={disable}
            className="text-xs font-medium text-red-500 underline underline-offset-2"
          >
            Desativar proteção
          </button>
        </div>
      )}
    </div>
  );
}
