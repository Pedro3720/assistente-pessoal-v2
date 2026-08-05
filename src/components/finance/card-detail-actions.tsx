"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCard } from "@/lib/actions/finance";
import { CardForm } from "./card-manager";
import type { BankWithBalance, CardWithInvoice } from "@/types/finance";

/**
 * Rodapé do detalhe do cartão aberto na carteira (Task 12, Onda 19): editar
 * reabre o mesmo formulário do `CardManager` (agora `CardForm`) num modal,
 * já preenchido; excluir pede confirmação antes, mesmo padrão de
 * `accounts-summary.tsx` (confirm() do navegador, sem componente próprio).
 *
 * Client component à parte porque `CardDetail` é Server Component (o
 * cabeçalho da fatura só lê dado, não precisa de estado) e os dois botões
 * aqui precisam de onClick.
 */
export function CardDetailActions({
  card,
  banks,
}: {
  card: CardWithInvoice;
  banks: BankWithBalance[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!confirm(`Excluir o cartão "${card.name}"? Essa ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      await deleteCard(card.id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir cartão");
      setDeleting(false);
    }
  }

  return (
    <div className="flex gap-2 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
      >
        <Pencil className="h-3.5 w-3.5" /> Editar cartão
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={deleting}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:border-negative/40 hover:text-negative disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" /> {deleting ? "Excluindo..." : "Excluir cartão"}
      </button>

      {editing && <CardForm banks={banks} card={card} onClose={() => setEditing(false)} />}
    </div>
  );
}
