"use client";

import { CalendarCheck2, Link2, LogOut } from "lucide-react";
import { disconnectGoogle } from "@/lib/actions/google";

export function GoogleConnectButton({ connected, email }: { connected: boolean; email: string | null }) {
  if (connected) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs">
        <CalendarCheck2 className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="max-w-[160px] truncate text-emerald-700" title={email ?? ""}>
          {email ?? "Google conectado"}
        </span>
        <form action={disconnectGoogle}>
          <button type="submit" className="text-muted-foreground hover:text-red-600" title="Desconectar">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    );
  }
  return (
    <a
      href="/api/google/connect"
      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
    >
      <Link2 className="h-4 w-4" /> Conectar Google Agenda
    </a>
  );
}
