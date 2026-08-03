"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function MonthNav({ label, offset }: { label: string; offset: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const go = (o: number) => {
    const p = new URLSearchParams(params.toString());
    p.set("m", String(o));
    router.push(`/financas?${p.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => go(offset - 1)}
        className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[9rem] select-none text-center text-sm font-medium capitalize">
        {label}
      </span>
      <button
        onClick={() => go(offset + 1)}
        className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {offset !== 0 && (
        <button onClick={() => go(0)} className="ml-1 text-xs text-primary hover:underline">
          Mês atual
        </button>
      )}
    </div>
  );
}
