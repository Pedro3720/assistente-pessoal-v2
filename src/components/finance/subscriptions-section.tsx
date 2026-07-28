"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit3, Trash2, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, parseBRL } from "@/lib/money";
import { formatDateBR, todayISO, shiftMonth } from "@/lib/dates";
import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from "@/lib/actions/finance";
import { Modal } from "@/components/ui/modal";
import { EntityIcon } from "@/components/ui/entity-icon";
import { IconPicker } from "@/components/ui/icon-picker";
import { MoneyInput } from "./money-input";
import { useAnimatedList } from "@/hooks/use-animated-list";
import type {
  BankWithBalance,
  CardWithInvoice,
  Category,
  Subscription,
  SubscriptionCandidate,
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

/** Próximo dia `day` a partir de hoje (fuso SP), como YYYY-MM-DD. */
function nextCharge(day: number): string {
  const [y, m, d] = todayISO().split("-").map(Number);
  const clamp = (yy: number, mm: number) =>
    Math.min(day, new Date(Date.UTC(yy, mm, 0)).getUTCDate());
  if (day >= d) {
    return `${y}-${String(m).padStart(2, "0")}-${String(clamp(y, m)).padStart(2, "0")}`;
  }
  const nx = shiftMonth(y, m, 1);
  return `${nx.year}-${String(nx.month).padStart(2, "0")}-${String(clamp(nx.year, nx.month)).padStart(2, "0")}`;
}

export function SubscriptionsSection({
  subscriptions,
  candidates,
  monthlyTotal,
  categories,
  banks,
  cards,
}: {
  subscriptions: Subscription[];
  candidates: SubscriptionCandidate[];
  monthlyTotal: number;
  categories: Category[];
  banks: BankWithBalance[];
  cards: CardWithInvoice[];
}) {
  const router = useRouter();
  const listRef = useAnimatedList();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("repeat");
  const [amount, setAmount] = useState("");
  const [billingDay, setBillingDay] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [pay, setPay] = useState("");
  const [saving, setSaving] = useState(false);

  const expenseCats = categories.filter((c) => c.kind === "expense");
  const catById = new Map(categories.map((c) => [c.id, c]));
  const bankById = new Map(banks.map((b) => [b.id, b]));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  const active = subscriptions.filter((s) => s.active);
  const paused = subscriptions.filter((s) => !s.active);

  function reset() {
    setEditingId(null);
    setName("");
    setIcon("repeat");
    setAmount("");
    setBillingDay("");
    setCategoryId("");
    setPay("");
  }
  function openNew() {
    reset();
    setOpen(true);
  }
  function openEdit(s: Subscription) {
    setEditingId(s.id);
    setName(s.name);
    setIcon(s.icon);
    setAmount(String(s.amount).replace(".", ","));
    setBillingDay(s.billing_day ? String(s.billing_day) : "");
    setCategoryId(s.category_id ? String(s.category_id) : "");
    setPay(payValue(s.bank_id, s.card_id));
    setOpen(true);
  }
  function openFromCandidate(c: SubscriptionCandidate) {
    reset();
    setName(c.name);
    setAmount(String(c.amount).replace(".", ","));
    setBillingDay(String(c.billing_day));
    setCategoryId(c.category_id ? String(c.category_id) : "");
    setPay(payValue(c.bank_id, c.card_id));
    setOpen(true);
  }

  async function save() {
    const value = parseBRL(amount);
    if (!name.trim() || !value || value <= 0) {
      toast.error("Preencha nome e um valor válido.");
      return;
    }
    const day = billingDay ? Number(billingDay) : null;
    if (day !== null && (day < 1 || day > 31)) {
      toast.error("Dia da cobrança deve ser entre 1 e 31.");
      return;
    }
    setSaving(true);
    const base = {
      name: name.trim(),
      icon: icon.trim() || "repeat",
      amount: value,
      billing_day: day,
      category_id: categoryId ? Number(categoryId) : null,
      ...parsePay(pay),
    };
    try {
      if (editingId) {
        await updateSubscription(editingId, base);
      } else {
        await createSubscription({ ...base, active: true });
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

  async function toggle(s: Subscription) {
    try {
      await updateSubscription(s.id, { active: !s.active });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  }

  async function remove(s: Subscription) {
    if (!confirm(`Excluir a assinatura "${s.name}"?`)) return;
    try {
      await deleteSubscription(s.id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  // texto secundário: só o nome, porque o ícone agora é um componente e não
  // pode ser concatenado numa string
  function payLabel(s: Subscription): string | null {
    if (s.bank_id) return bankById.get(s.bank_id)?.name ?? null;
    if (s.card_id) return cardById.get(s.card_id)?.name ?? null;
    return null;
  }

  const empty = subscriptions.length === 0 && candidates.length === 0;

  return (
    <div className="glass card-glow rounded-2xl border border-border p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">Assinaturas</h3>
          <p className="text-sm text-muted-foreground">
            {active.length} ativa{active.length === 1 ? "" : "s"} ·{" "}
            <span className="num font-semibold text-foreground">{formatBRL(monthlyTotal)}</span> / mês
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1 self-start rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Nova
        </button>
      </div>

      {candidates.length > 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Detectamos cobranças recorrentes no seu histórico:
          </p>
          <div className="flex flex-wrap gap-2">
            {candidates.map((c) => (
              <button
                key={c.key}
                onClick={() => openFromCandidate(c)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary/50 hover:bg-accent"
                title="Adicionar como assinatura"
              >
                <span className="font-medium">{c.name}</span>
                <span className="num text-muted-foreground">{formatBRL(c.amount)}</span>
                <Plus className="h-3 w-3 text-primary" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div ref={listRef} className="mt-4 space-y-2">
        {empty ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma assinatura cadastrada.
          </p>
        ) : (
          <>
            {active.map((s) => (
              <SubRow
                key={s.id}
                s={s}
                cat={s.category_id ? catById.get(s.category_id) ?? null : null}
                payLabel={payLabel(s)}
                onToggle={() => toggle(s)}
                onEdit={() => openEdit(s)}
                onRemove={() => remove(s)}
              />
            ))}
            {paused.length > 0 && (
              <p className="pt-2 text-xs font-medium text-muted-foreground">Pausadas</p>
            )}
            {paused.map((s) => (
              <SubRow
                key={s.id}
                s={s}
                cat={s.category_id ? catById.get(s.category_id) ?? null : null}
                payLabel={payLabel(s)}
                onToggle={() => toggle(s)}
                onEdit={() => openEdit(s)}
                onRemove={() => remove(s)}
                muted
              />
            ))}
          </>
        )}
      </div>

      {open && (
        <Modal onClose={() => setOpen(false)} title={`${editingId ? "Editar" : "Nova"} Assinatura`}>
          <div className="space-y-4">
            <div className="flex gap-2">
              <IconPicker value={icon} onChange={setIcon} fallback="subscription" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="Nome (ex: Netflix)"
                className="min-w-0 flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Valor mensal (R$)</label>
              <MoneyInput value={amount} onChange={setAmount} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Dia da cobrança (opcional)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                placeholder="ex: 15"
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
                {expenseCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
                        {b.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {cards.length > 0 && (
                  <optgroup label="Cartões">
                    {cards.map((c) => (
                      <option key={`c${c.id}`} value={`card:${c.id}`}>
                        {c.name}
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
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar assinatura"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SubRow({
  s,
  cat,
  payLabel,
  onToggle,
  onEdit,
  onRemove,
  muted = false,
}: {
  s: Subscription;
  cat: Category | null;
  payLabel: string | null;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  muted?: boolean;
}) {
  const sub: string[] = [];
  if (cat) sub.push(cat.name);
  if (payLabel) sub.push(payLabel);
  if (s.billing_day) sub.push(`todo dia ${s.billing_day} · próx. ${formatDateBR(nextCharge(s.billing_day))}`);

  return (
    <div
      className={`flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-accent/30 ${
        muted ? "opacity-50" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <EntityIcon
          value={s.icon}
          fallback="subscription"
          size={18}
          className="h-9 w-9 rounded-full bg-muted text-muted-foreground"
        />
        <div className="min-w-0">
          <p className="truncate font-medium">{s.name}</p>
          <p className="truncate text-xs text-muted-foreground">{sub.join(" · ") || "Sem detalhes"}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="num font-semibold">{formatBRL(Number(s.amount))}</span>
        <button
          onClick={onToggle}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          title={s.active ? "Pausar" : "Reativar"}
        >
          {s.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button onClick={onEdit} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
          <Edit3 className="h-4 w-4" />
        </button>
        <button onClick={onRemove} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
