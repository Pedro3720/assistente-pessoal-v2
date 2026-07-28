"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { BankWithBalance } from "@/types/finance";

export function StatementAccountSelect({
  banks,
  selectedId,
}: {
  banks: BankWithBalance[];
  selectedId: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function change(id: string) {
    const p = new URLSearchParams(params.toString());
    p.set("conta", id);
    router.push(`/financas?${p.toString()}`);
  }

  return (
    <div className="relative">
      <select
        value={selectedId}
        onChange={(e) => change(e.target.value)}
        className="w-full appearance-none rounded-lg border border-border bg-muted px-3 py-2 pr-10 text-sm sm:w-56"
      >
        {banks.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
