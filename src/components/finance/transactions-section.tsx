"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, ArrowUpRight, ArrowDownRight, Edit3, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL, parseBRL } from "@/lib/money";
import { todayISO, formatDateBR } from "@/lib/dates";
import {
  createTransaction, updateTransaction, deleteTransaction,
  ensureDefaultCategories,
} from "@/lib/actions/finance";
import { MoneyInput } from "./money-input";
import type {
  BankWithBalance, CardWithInvoice, Category, Transaction, TxType,
} from "@/types/finance";

type Filter = "all" | TxType;

export function TransactionsSection({
  transactions,
  categories,
  banks,
  cards,
}: {
  transactions: Transaction[];
  categories: Category[];
  banks: BankWithBalance[];
  cards: CardWithInvoice[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  // Semeia as categorias padrão no primeiro acesso do usuário.
  useEffect(() => {
    if (categories.length === 0) {
      ensureDefaultCategories()
        .then(() => router.refresh())
        .catch(() => {});
    }
  }, [categories.length, router]);

  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const shown = useMemo(
    () => (filter === "all" ? transactions : transactions.filter((t) => t.type === filter)),
    [transactions, filter]
  );

  // ── modal ──
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [type, setType] = useState<TxType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState("");
  const [bankId, setBankId] = useState("");
  const [cardId, setCardId] = useState("");
  const [isCardPayment, setIsCardPayment] = useState(false);
  const [saving, setSaving] = useState(false);

  const kindCategories = categories.filter((c) => c.kind === type);
  const isPurchase = type === "expense" && !!cardId && !isCardPayment;

  function reset() {
    setEditingId(null);
    setType("expense");
    setDescription("");
    setAmount("");
    setDate(todayISO());
    setCategoryId("");
    setBankId("");
    setCardId("");
    setIsCardPayment(false);
  }

  function openNew() {
    reset();
    setOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditingId(t.id);
    setType(t.type);
    setDescription(t.description);
    setAmount(String(t.amount).replace(".", ","));
    setDate(t.occurred_on);
    setCategoryId(t.category_id ? String(t.category_id) : "");
    setBankId(t.bank_id ? String(t.bank_id) : "");
    setCardId(t.card_id ? String(t.card_id) : "");
    setIsCardPayment(t.is_card_payment);
    setOpen(true);
  }

  async function save() {
    const value = parseBRL(amount);
    if (!description.trim() || !value || value <= 0) {
      toast.error("Preencha descrição e um valor válido.");
      return;
    }
    if (isCardPayment && !cardId) {
      toast.error("Escolha o cartão cuja fatura será paga.");
      return;
    }
    setSaving(true);
    const input = {
      description: description.trim(),
      amount: value,
      type,
      category_id: categoryId ? Number(categoryId) : null,
      bank_id: bankId ? Number(bankId) : null,
      card_id: cardId ? Number(cardId) : null,
      is_card_payment: type === "expense" ? isCardPayment : false,
      occurred_on: date,
    };
    try {
      if (editingId) await updateTransaction(editingId, input);
      else await createTransaction(input);
      setOpen(false);
      reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteTransaction(id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <div className="glass card-glow rounded-2xl border border-border p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold">Transações</h3>
        <div className="flex items-center gap-2">
          {(["all", "income", "expense"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground hover:bg-accent/80"
              }`}
            >
              {f === "all" ? "Todas" : f === "income" ? "Receitas" : "Despesas"}
            </button>
          ))}
          <button
            onClick={openNew}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Nova
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma transação neste mês.
          </p>
        ) : (
          shown.map((t) => {
            const cat = t.category_id ? catById.get(t.category_id) : null;
            return (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-accent/30"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`shrink-0 rounded-full p-2 ${t.type === "income" ? "bg-green-100" : "bg-red-100"}`}>
                    {t.type === "income" ? (
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat ? `${cat.icon} ${cat.name}` : "Sem categoria"}
                      {t.is_card_payment ? " · 💳 pagamento" : ""} · {formatDateBR(t.occurred_on)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`num font-semibold ${t.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {t.type === "income" ? "+" : "-"}
                    {formatBRL(Number(t.amount))}
                  </span>
                  <button onClick={() => openEdit(t)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(t.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-popover p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold">{editingId ? "Editar" : "Nova"} Transação</h2>
              <div className="w-9" />
            </div>

            <div className="mt-6 space-y-4">
              {/* tipo */}
              <div className="grid grid-cols-2 gap-2">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setType(t);
                      setCategoryId("");
                      if (t === "income") {
                        setCardId("");
                        setIsCardPayment(false);
                      }
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      type === t
                        ? t === "expense"
                          ? "border border-red-300 bg-red-50 text-red-600"
                          : "border border-green-300 bg-green-50 text-green-700"
                        : "border border-border bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {t === "expense" ? "Despesa" : "Receita"}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Descrição</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Mercado do mês"
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Valor (R$)</label>
                <MoneyInput value={amount} onChange={setAmount} />
              </div>

              {/* pagamento de fatura */}
              {type === "expense" && (
                <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={isCardPayment}
                    onChange={(e) => {
                      setIsCardPayment(e.target.checked);
                      if (e.target.checked) setCategoryId("");
                    }}
                    className="accent-primary"
                  />
                  É pagamento de fatura de cartão
                </label>
              )}

              {/* categoria (some em pagamento de fatura) */}
              {!isCardPayment && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Categoria</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                  >
                    <option value="">Sem categoria</option>
                    {kindCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* cartão: compra (despesa) ou fatura paga */}
              {type === "expense" && cards.length > 0 && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    {isCardPayment ? "Cartão pago" : "Cartão (compra)"}
                  </label>
                  <select
                    value={cardId}
                    onChange={(e) => setCardId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                  >
                    <option value="">{isCardPayment ? "Selecione o cartão" : "Sem cartão"}</option>
                    {cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {isCardPayment ? ` — fatura ${formatBRL(c.invoice)}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* conta bancária (desabilitada em compra no cartão) */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Conta</label>
                <select
                  value={isPurchase ? "" : bankId}
                  disabled={isPurchase}
                  onChange={(e) => setBankId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">{isPurchase ? "— compra vai para a fatura —" : "Sem conta"}</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.icon} {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                />
              </div>

              <button
                onClick={save}
                disabled={saving}
                className="mt-2 w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar transação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
