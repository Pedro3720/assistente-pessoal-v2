"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Undo2, Edit3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, parseBRL } from "@/lib/money";
import { formatDateBR } from "@/lib/dates";
import {
  createPlannedItem,
  updatePlannedItem,
  deletePlannedItem,
  realizePlannedItem,
  unrealizePlannedItem,
} from "@/lib/actions/finance";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "./money-input";
import type {
  BankWithBalance,
  CardWithInvoice,
  Category,
  PlannedItem,
  PlanSuggestion,
  TxType,
} from "@/types/finance";

// meio de pagamento num único <select>: "bank:<id>" | "card:<id>" | ""
function payValue(bankId: number | null, cardId: number | null): string {
  if (bankId) return `bank:${bankId}`;
  if (cardId) return `card:${cardId}`;
  return "";
}
function parsePay(v: string): { bank_id: number | null; card_id: number | null } {
  if (v.startsWith("bank:")) return { bank_id: Number(v.slice(5)), card_id: null };
  if (v.startsWith("card:")) return { card_id: Number(v.slice(5)), bank_id: null };
  return { bank_id: null, card_id: null };
}

export function PlanningSection({
  items,
  suggestions,
  previstoReceber,
  previstoPagar,
  saldoPrevisto,
  categories,
  banks,
  cards,
  defaultDate,
}: {
  items: PlannedItem[];
  suggestions: PlanSuggestion[];
  previstoReceber: number;
  previstoPagar: number;
  saldoPrevisto: number;
  categories: Category[];
  banks: BankWithBalance[];
  cards: CardWithInvoice[];
  defaultDate: string;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [type, setType] = useState<TxType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(defaultDate);
  const [categoryId, setCategoryId] = useState("");
  const [pay, setPay] = useState("");
  const [saving, setSaving] = useState(false);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const bankById = new Map(banks.map((b) => [b.id, b]));
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const typeCats = categories.filter((c) => c.kind === type);

  const pending = items.filter((i) => i.transaction_id === null);
  const done = items.filter((i) => i.transaction_id !== null);

  function reset() {
    setEditingId(null);
    setType("expense");
    setDescription("");
    setAmount("");
    setDueDate(defaultDate);
    setCategoryId("");
    setPay("");
  }
  function openNew() {
    reset();
    setOpen(true);
  }
  function openEdit(i: PlannedItem) {
    setEditingId(i.id);
    setType(i.type);
    setDescription(i.description);
    setAmount(String(i.amount).replace(".", ","));
    setDueDate(i.due_date);
    setCategoryId(i.category_id ? String(i.category_id) : "");
    setPay(payValue(i.bank_id, i.card_id));
    setOpen(true);
  }
  function openFromSuggestion(s: PlanSuggestion) {
    reset();
    setType("expense");
    setDescription(s.name);
    setAmount(String(s.amount).replace(".", ","));
    setDueDate(s.due_date);
    setCategoryId(s.category_id ? String(s.category_id) : "");
    setPay(payValue(s.bank_id, s.card_id));
    setOpen(true);
  }

  async function save() {
    const value = parseBRL(amount);
    if (!description.trim() || !value || value <= 0) {
      toast.error("Preencha descrição e um valor válido.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      toast.error("Informe a data prevista.");
      return;
    }
    setSaving(true);
    const base = {
      description: description.trim(),
      amount: value,
      type,
      due_date: dueDate,
      category_id: categoryId ? Number(categoryId) : null,
      ...parsePay(pay),
    };
    try {
      if (editingId) {
        await updatePlannedItem(editingId, base);
      } else {
        await createPlannedItem(base);
      }
      setOpen(false);
      reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function realize(i: PlannedItem) {
    try {
      await realizePlannedItem(i.id);
      toast.success("Lançado em Finanças.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao realizar");
    }
  }

  async function unrealize(i: PlannedItem) {
    if (!confirm(`Desfazer "${i.description}"? A transação lançada será removida.`)) return;
    try {
      await unrealizePlannedItem(i.id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao desfazer");
    }
  }

  async function remove(i: PlannedItem) {
    if (!confirm(`Excluir o item "${i.description}" do planejamento?`)) return;
    try {
      await deletePlannedItem(i.id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  function payLabel(i: PlannedItem): string | null {
    if (i.bank_id) {
      const b = bankById.get(i.bank_id);
      return b ? `${b.icon} ${b.name}` : null;
    }
    if (i.card_id) {
      const c = cardById.get(i.card_id);
      return c ? `💳 ${c.name}` : null;
    }
    return null;
  }

  const empty = items.length === 0 && suggestions.length === 0;

  return (
    <div className="glass card-glow rounded-2xl border border-border p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">Planejamento do mês</h3>
          <p className="text-sm text-muted-foreground">
            A receber{" "}
            <span className="num font-semibold text-green-600 dark:text-green-400">
              {formatBRL(previstoReceber)}
            </span>
            {" · "}A pagar{" "}
            <span className="num font-semibold text-red-600 dark:text-red-400">
              {formatBRL(previstoPagar)}
            </span>
            {" · "}Saldo{" "}
            <span
              className={`num font-semibold ${
                saldoPrevisto >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatBRL(saldoPrevisto)}
            </span>
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1 self-start rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Novo
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Suas assinaturas ainda não previstas neste mês:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.key}
                onClick={() => openFromSuggestion(s)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary/50 hover:bg-accent"
                title="Adicionar ao planejamento"
              >
                <span className="font-medium">{s.name}</span>
                <span className="num text-muted-foreground">{formatBRL(s.amount)}</span>
                <Plus className="h-3 w-3 text-primary" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {empty ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nada previsto para este mês.
          </p>
        ) : (
          <>
            {pending.length > 0 && (
              <p className="text-xs font-medium text-muted-foreground">A realizar</p>
            )}
            {pending.map((i) => (
              <PlanRow
                key={i.id}
                i={i}
                cat={i.category_id ? catById.get(i.category_id) ?? null : null}
                payLabel={payLabel(i)}
                onRealize={() => realize(i)}
                onEdit={() => openEdit(i)}
                onRemove={() => remove(i)}
              />
            ))}
            {done.length > 0 && (
              <p className="pt-2 text-xs font-medium text-muted-foreground">Realizados</p>
            )}
            {done.map((i) => (
              <PlanRow
                key={i.id}
                i={i}
                cat={i.category_id ? catById.get(i.category_id) ?? null : null}
                payLabel={payLabel(i)}
                onUnrealize={() => unrealize(i)}
                onRemove={() => remove(i)}
                done
              />
            ))}
          </>
        )}
      </div>

      {open && (
        <Modal onClose={() => setOpen(false)} title={`${editingId ? "Editar" : "Novo"} item previsto`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType("expense");
                  setCategoryId("");
                }}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  type === "expense"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("income");
                  setCategoryId("");
                }}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  type === "income"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                Receita
              </button>
            </div>

            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
              placeholder="Descrição (ex: Aluguel)"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            />

            <div className="space-y-1">
              <label className="text-sm font-medium">Valor (R$)</label>
              <MoneyInput value={amount} onChange={setAmount} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Data prevista</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Categoria</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              >
                <option value="">Sem categoria</option>
                {typeCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Meio de pagamento (opcional)</label>
              <select
                value={pay}
                onChange={(e) => setPay(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              >
                <option value="">Nenhum</option>
                {banks.length > 0 && (
                  <optgroup label="Contas">
                    {banks.map((b) => (
                      <option key={`b${b.id}`} value={`bank:${b.id}`}>
                        {b.icon} {b.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {cards.length > 0 && (
                  <optgroup label="Cartões">
                    {cards.map((c) => (
                      <option key={`c${c.id}`} value={`card:${c.id}`}>
                        💳 {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="mt-2 w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar item"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PlanRow({
  i,
  cat,
  payLabel,
  onRealize,
  onUnrealize,
  onEdit,
  onRemove,
  done = false,
}: {
  i: PlannedItem;
  cat: Category | null;
  payLabel: string | null;
  onRealize?: () => void;
  onUnrealize?: () => void;
  onEdit?: () => void;
  onRemove: () => void;
  done?: boolean;
}) {
  const sub: string[] = [];
  if (cat) sub.push(`${cat.icon} ${cat.name}`);
  if (payLabel) sub.push(payLabel);
  sub.push(formatDateBR(i.due_date));

  const sign = i.type === "income" ? "+" : "−";
  const tone =
    i.type === "income"
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div
      className={`flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-accent/30 ${
        done ? "opacity-60" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {i.description}
            {done && (
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                lançado
              </span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">{sub.join(" · ")}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`num font-semibold ${tone}`}>
          {sign} {formatBRL(Number(i.amount))}
        </span>
        {onRealize && (
          <button
            onClick={onRealize}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
            title="Realizar (lançar em Finanças)"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
        {onUnrealize && (
          <button
            onClick={onUnrealize}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
            title="Desfazer (remover transação)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
            title="Editar"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onRemove}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          title="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
