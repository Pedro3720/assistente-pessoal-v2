"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, parseBRL } from "@/lib/money";
import { createCard, updateCard } from "@/lib/actions/finance";
import { CARD_COLORS } from "@/lib/finance/defaults";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "./money-input";
import { SelectMenu, type SelectOption } from "@/components/ui/select-menu";
import type { BankWithBalance, CardWithInvoice } from "@/types/finance";

const NETWORK_OPTIONS: SelectOption[] = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "elo", label: "Elo" },
  { value: "amex", label: "Amex" },
  { value: "hipercard", label: "Hipercard" },
];

const TIER_OPTIONS: SelectOption[] = [
  { value: "standard", label: "Padrão" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
  { value: "black", label: "Black" },
];

/**
 * Formulário de cartão (criar e editar), num modal. Antes vivia dentro do
 * `CardManager` (que também listava e resumia os cartões); a Task 12 da
 * Onda 19 moveu criar e editar para dentro da carteira (`CardWallet` e
 * `CardDetail`) e este arquivo ficou só com o formulário, reaproveitado nos
 * dois lugares. Sem `card`, cria um novo; com `card`, edita o existente.
 */
export function CardForm({
  banks,
  card,
  onClose,
}: {
  banks: BankWithBalance[];
  card?: CardWithInvoice;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(card?.name ?? "");
  const [bankId, setBankId] = useState<string>(card?.bank_id ? String(card.bank_id) : "");
  const [limit, setLimit] = useState(
    card?.credit_limit ? formatBRL(card.credit_limit).replace("R$", "").trim() : ""
  );
  const [opening, setOpening] = useState(
    card?.opening_invoice ? formatBRL(card.opening_invoice).replace("R$", "").trim() : ""
  );
  const [closing, setClosing] = useState(card?.closing_day ? String(card.closing_day) : "");
  const [due, setDue] = useState(card?.due_day ? String(card.due_day) : "");
  const [color, setColor] = useState(card?.color ?? CARD_COLORS[0]);
  const [network, setNetwork] = useState(card?.network ?? "");
  const [holder, setHolder] = useState(card?.holder ?? "");
  const [last4, setLast4] = useState(card?.last4 ?? "");
  const [tier, setTier] = useState(card?.tier ?? "");

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const input = {
      name: name.trim(),
      bank_id: bankId ? Number(bankId) : null,
      credit_limit: parseBRL(limit) || 0,
      opening_invoice: parseBRL(opening) || 0,
      closing_day: closing ? Number(closing) : null,
      due_day: due ? Number(due) : null,
      color,
      network: network || null,
      holder: holder.trim() || null,
      last4: last4 || null,
      tier: tier || null,
    };
    try {
      if (card) await updateCard(card.id, input);
      else await createCard(input);
      router.refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar cartão");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} title={card ? "Editar cartão" : "Novo cartão"}>
      <div className="space-y-3">
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
              {b.name}
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
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Bandeira</label>
            <SelectMenu
              value={network}
              options={NETWORK_OPTIONS}
              onChange={setNetwork}
              placeholder="Selecionar"
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Variante</label>
            <SelectMenu
              value={tier}
              options={TIER_OPTIONS}
              onChange={setTier}
              placeholder="Selecionar"
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Titular</label>
            <input
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="Nome impresso no cartão"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Quatro últimos dígitos</label>
            <input
              inputMode="numeric"
              maxLength={4}
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
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
            {saving ? "Salvando..." : card ? "Salvar alterações" : "Criar cartão"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
