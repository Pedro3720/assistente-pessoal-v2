"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { ImportModal } from "./import-modal";
import type { BankWithBalance, CardWithInvoice, Category } from "@/types/finance";

export function ImportButton({
  banks,
  cards,
  categories,
}: {
  banks: BankWithBalance[];
  cards: CardWithInvoice[];
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
      >
        <Download className="h-4 w-4 rotate-180" />
        Importar Extrato
      </button>
      {open && (
        <ImportModal
          banks={banks}
          cards={cards}
          categories={categories}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
