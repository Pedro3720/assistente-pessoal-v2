"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { pushSupported } from "@/lib/push/client";
import { NotificationsSetup } from "./notifications-setup";

export function NotificationBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    if (Notification.permission !== "default") return; // já concedeu/bloqueou
    if (localStorage.getItem("notif-banner-dismissed") === "1") return;
    setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem("notif-banner-dismissed", "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="glass mb-4 flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Ative as notificações para receber lembretes dos seus eventos e tarefas, mesmo com o app fechado.
      </p>
      <div className="flex items-center gap-2">
        <NotificationsSetup onChange={dismiss} />
        <button onClick={dismiss} aria-label="Dispensar" className="rounded-lg p-2 text-muted-foreground hover:bg-accent" title="Dispensar">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
