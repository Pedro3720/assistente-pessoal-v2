"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, parseBRL } from "@/lib/money";
import { createCard, deleteCard } from "@/lib/actions/finance";
import { CARD_COLORS } from "@/lib/finance/defaults";
import { MoneyInput } from "./money-input";
import type { BankWithBalance, CardWithInvoice } from "@/types/finance";

export function CardManager({
  cards,
  banks,
}: {
  cards: CardWithInvoice[];
  banks: BankWithBalance[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [bankId, setBankId] = useState<string>("");
  const [limit, setLimit] = useState("");
  const [opening, setOpening] = useState("");
  const [closing, setClosing] = useState("");
  const [due, setDue] = useState("");
  const [color, setColor] = useState(CARD_COLORS[0]);

  function reset() {
    setName(""); setBankId(""); setLimit(""); setOpening("");
    setClosing(""); setDue(""); setColor(CARD_COLORS[0]); setAdding(false);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createCard({
        name: name.trim(),
        bank_id: bankId ? Number(bankId) : null,
        credit_limit: parseBRL(limit) || 0,
        opening_invoice: parseBRL(opening) || 0,
        closing_day: closing ? Number(closing) : null,
        due_day: due ? Number(due) : null,
        color,
      });
      reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar cartão");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir este cartão permanentemente?")) return;
    try {
      await deleteCard(id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir cartão");
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Cartões de Crédito</h3>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
        >
          <Plus className="h-3 w-3" /> Adicionar
        </button>
      </div>

      {adding && (
        <div className="mb-4 space-y-3 rounded-lg border border-dashed border-border p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Nome do cartão"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
          />
          <select
            value={bankId}
            onChange={(e) => setBankId(e.target.value)}
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
          >
            <option value="">Sem conta vinculada</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.icon} {b.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Limite</label>
              <MoneyInput value={limit} onChange={setLimit} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fatura atual</label>
              <MoneyInput value={opening} onChange={setOpening} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fecha (dia)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={closing}
                onChange={(e) => setClosing(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Vence (dia)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {CARD_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full border-2 transition-all ${
                  color === c ? "scale-110 border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving || !name.trim()}
              className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Criar cartão"}
            </button>
            <button
              onClick={reset}
              className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {cards.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
        ) : (
          cards.map((card) => {
            const usePct = card.credit_limit
              ? Math.min((card.invoice / card.credit_limit) * 100, 100)
              : 0;
            return (
              <div key={card.id} className="space-y-2 border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: card.color }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{card.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Fecha dia {card.closing_day ?? "-"} · Vence dia {card.due_day ?? "-"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => remove(card.id)}
                    className="rounded p-1.5 text-muted-foreground hover:text-red-500"
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fatura aberta</span>
                  <span className={`font-semibold ${card.invoice > 0 ? "text-amber-500" : "text-green-500"}`}>
                    {formatBRL(card.invoice)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-accent">
                  <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${usePct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{usePct.toFixed(0)}% utilizado</span>
                  <span>Limite: {formatBRL(card.credit_limit)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
