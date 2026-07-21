"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { pushSupported, subscribeToPush, unsubscribeFromPush, hasPushSubscription } from "@/lib/push/client";

type UiState = "loading" | "unsupported" | "denied" | "on" | "off";

export function NotificationsSetup({ onChange }: { onChange?: () => void }) {
  const [state, setState] = useState<UiState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!pushSupported()) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      if (Notification.permission === "granted" && (await hasPushSubscription())) return setState("on");
      setState("off");
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await subscribeToPush();
      if (perm === "granted") {
        setState("on");
        toast.success("Notificações ativadas neste dispositivo.");
      } else if (perm === "denied") {
        setState("denied");
      }
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ativar notificações");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setState("off");
      toast.success("Notificações desativadas neste dispositivo.");
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao desativar");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;
  if (state === "unsupported")
    return <p className="text-sm text-muted-foreground">Este navegador não suporta notificações push.</p>;
  if (state === "denied")
    return (
      <p className="text-sm text-muted-foreground">
        Notificações bloqueadas neste navegador. Reative no cadeado ao lado do endereço.
      </p>
    );
  if (state === "on")
    return (
      <button
        onClick={disable}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
      >
        <BellOff className="h-4 w-4" /> Desativar notificações neste dispositivo
      </button>
    );
  return (
    <button
      onClick={enable}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      <Bell className="h-4 w-4" /> {busy ? "Ativando..." : "Ativar notificações neste dispositivo"}
    </button>
  );
}
