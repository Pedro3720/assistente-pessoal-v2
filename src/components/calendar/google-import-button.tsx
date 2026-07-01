"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DownloadCloud, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { importFromGoogle } from "@/lib/actions/calendar";

export function GoogleImportButton({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const n = await importFromGoogle(year, month);
      toast.success(n > 0 ? `${n} evento(s) importado(s) do Google` : "Nada novo para importar");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar do Google");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
    >
      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
      Importar do Google
    </button>
  );
}
