"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, ArrowUpRight, ArrowDownLeft, Repeat, Edit3, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL, parseBRL } from "@/lib/money";
import { formatDateBR } from "@/lib/dates";
import {
  createTransaction, updateTransaction, deleteTransaction,
  ensureDefaultCategories, createInstallmentPurchase, deleteTransactionGroup,
  createTransfer, deleteTransferGroup,
} from "@/lib/actions/finance";
import { Modal } from "@/components/ui/modal";
import { DataTable, DataTableRow } from "@/components/ui/data-table";
import { BrandAvatar } from "@/components/ui/brand-avatar";
import { CategoryChip } from "@/components/ui/category-chip";
import { Money } from "@/components/ui/money";
import { MoneyInput } from "./money-input";
import { useAnimatedList } from "@/hooks/use-animated-list";
import { EmptyState } from "@/components/effects/empty-state";
import type {
  BankWithBalance, CardWithInvoice, Category, Transaction, TxType,
} from "@/types/finance";

type Filter = "all" | TxType;

export function TransactionsSection({
  transactions,
  categories,
  banks,
  cards,
  defaultDate,
  monthLabel,
}: {
  transactions: Transaction[];
  categories: Category[];
  banks: BankWithBalance[];
  cards: CardWithInvoice[];
  defaultDate: string;
  monthLabel: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const listRef = useAnimatedList();
  const fullListRef = useAnimatedList();

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
  const [date, setDate] = useState(defaultDate);
  const [categoryId, setCategoryId] = useState("");
  const [bankId, setBankId] = useState("");
  const [cardId, setCardId] = useState("");
  const [isCardPayment, setIsCardPayment] = useState(false);
  const [isTransfer, setIsTransfer] = useState(false);
  const [toBankId, setToBankId] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [saving, setSaving] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditingId(null);
      setOpen(true);
      router.replace("/financas");
    }
  }, [searchParams, router]);

  const kindCategories = categories.filter((c) => c.kind === type);
  const isPurchase = type === "expense" && !!cardId && !isCardPayment;

  function reset() {
    setEditingId(null);
    setType("expense");
    setDescription("");
    setAmount("");
    setDate(defaultDate);
    setCategoryId("");
    setBankId("");
    setCardId("");
    setIsCardPayment(false);
    setParcelas("1");
    setIsTransfer(false);
    setToBankId("");
  }

  function openNew() {
    reset();
    setOpen(true);
  }

  function openEdit(t: Transaction) {
    if (t.transfer_group) {
      toast.info("Para alterar uma transferência, exclua e recrie.");
      return;
    }
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
      if (editingId) {
        await updateTransaction(editingId, input);
      } else if (isTransfer) {
        if (!bankId || !toBankId) {
          toast.error("Escolha a conta de origem e a de destino.");
          setSaving(false);
          return;
        }
        await createTransfer({
          description: description.trim(),
          amount: value,
          from_bank_id: Number(bankId),
          to_bank_id: Number(toBankId),
          occurred_on: date,
        });
      } else if (isPurchase && Number(parcelas) > 1) {
        await createInstallmentPurchase({ ...input, installments: Number(parcelas) });
      } else {
        await createTransaction(input);
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

  async function remove(id: number) {
    const t = transactions.find((x) => x.id === id);
    try {
      if (t?.transfer_group) {
        if (!confirm("Excluir a transferência (os dois lançamentos)?")) return;
        await deleteTransferGroup(t.transfer_group);
      } else if (t?.purchase_group) {
        if (!confirm("Excluir a compra parcelada inteira (todas as parcelas)?")) return;
        await deleteTransactionGroup(t.purchase_group);
      } else {
        await deleteTransaction(id);
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  const filterTabs = (["all", "income", "expense"] as const).map((f) => (
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
  ));

  return (
    <div className="glass card-glow rounded-2xl border border-border p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold">Transações</h3>
        <div className="flex flex-wrap items-center gap-2">
          {filterTabs}
          <button
            onClick={() => setFullOpen(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
          >
            Ver todas
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Nova
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState lottie="/lottie/empty-transactions.lottie" className="mt-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            Nenhuma transação neste mês.
          </p>
        </EmptyState>
      ) : (
        // bg-transparent: esta instância já vive dentro do card da própria
        // seção (glass card-glow ... acima); sem isso o DataTable repetia
        // fundo (bg-card) e raio por cima do card que já existe, um dentro
        // do outro. A instância do modal "Ver todas" abaixo não repete: o
        // Modal usa bg-popover, não bg-card, então ali é mesmo outra
        // superfície e o fundo padrão do DataTable continua fazendo sentido.
        <DataTable ref={listRef} className="mt-4 bg-transparent">
          {shown.map((t) => (
            <TxRow
              key={t.id}
              t={t}
              cat={t.category_id ? catById.get(t.category_id) ?? null : null}
              onEdit={() => openEdit(t)}
              onRemove={() => remove(t.id)}
            />
          ))}
        </DataTable>
      )}

      {fullOpen && (
        <Modal size="full" title={`Transações de ${monthLabel}`} onClose={() => setFullOpen(false)}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {filterTabs}
            <button
              onClick={openNew}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> Nova
            </button>
          </div>
          {shown.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma transação neste mês.</p>
          ) : (
            <DataTable ref={fullListRef}>
              {shown.map((t) => (
                <TxRow
                  key={t.id}
                  t={t}
                  cat={t.category_id ? catById.get(t.category_id) ?? null : null}
                  onEdit={() => openEdit(t)}
                  onRemove={() => remove(t.id)}
                />
              ))}
            </DataTable>
          )}
        </Modal>
      )}

      {open && (
        <Modal onClose={() => setOpen(false)} title={`${editingId ? "Editar" : "Nova"} Transação`}>
          <div className="space-y-4">
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

            {isPurchase && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Parcelas</label>
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={parcelas}
                  onChange={(e) => setParcelas(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                />
                {Number(parcelas) > 1 && parseBRL(amount) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {parcelas}x de {formatBRL(parseBRL(amount) / Number(parcelas))} · 1ª parcela na fatura, o resto em aberto
                  </p>
                )}
              </div>
            )}

            {type === "expense" && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={isCardPayment}
                    onChange={(e) => {
                      setIsCardPayment(e.target.checked);
                      if (e.target.checked) {
                        setCategoryId("");
                        setIsTransfer(false);
                        setToBankId("");
                      }
                    }}
                    className="accent-primary"
                  />
                  Pagamento de fatura
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={isTransfer}
                    onChange={(e) => {
                      setIsTransfer(e.target.checked);
                      if (e.target.checked) {
                        setIsCardPayment(false);
                        setCategoryId("");
                        setCardId("");
                      } else {
                        setToBankId("");
                      }
                    }}
                    className="accent-primary"
                  />
                  Transferência entre contas
                </label>
              </div>
            )}

            {!isTransfer && (
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
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {type === "expense" && cards.length > 0 && !isTransfer && (
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
                      {isCardPayment ? ` (fatura ${formatBRL(c.invoice)})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">{isTransfer ? "Conta origem" : "Conta"}</label>
              <select
                value={isPurchase ? "" : bankId}
                disabled={isPurchase}
                onChange={(e) => setBankId(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">{isPurchase ? "compra vai para a fatura" : "Sem conta"}</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {isTransfer && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Conta destino</label>
                <select
                  value={toBankId}
                  onChange={(e) => setToBankId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                >
                  <option value="">Selecione a conta destino</option>
                  {banks
                    .filter((b) => String(b.id) !== bankId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

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
        </Modal>
      )}
    </div>
  );
}

function TxRow({
  t,
  cat,
  onEdit,
  onRemove,
}: {
  t: Transaction;
  cat: Category | null;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <DataTableRow>
      {t.is_transfer ? (
        <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      ) : t.type === "expense" ? (
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-negative" strokeWidth={1.5} />
      ) : (
        <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 text-positive" strokeWidth={1.5} />
      )}

      <BrandAvatar name={t.description} size={28} />

      <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.description}</span>

      <span className="hidden w-32 shrink-0 sm:block">
        {cat ? (
          // O modelo de categoria não guarda cor própria (só a home dela
          // no donut tem, via posição na lista ordenada por valor, um
          // conceito que essa seção não tem). Sem uma cor de verdade para
          // reusar, o marcador fica neutro em vez de inventar uma ordem só
          // para colorir.
          <CategoryChip name={cat.name} color="var(--muted-foreground)" icon={cat.icon} />
        ) : (
          <span className="text-xs text-subtle-foreground">Sem categoria</span>
        )}
      </span>

      <span className="hidden w-20 shrink-0 text-xs text-subtle-foreground md:block">
        {formatDateBR(t.occurred_on)}
      </span>

      <Money
        value={t.type === "expense" ? -Number(t.amount) : Number(t.amount)}
        signed
        colorize
        className="w-28 shrink-0 text-right text-sm font-medium"
      />

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          onClick={onEdit}
          aria-label="Editar transação"
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
        >
          <Edit3 className="h-4 w-4" />
        </button>
        <button
          onClick={onRemove}
          aria-label="Excluir transação"
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </DataTableRow>
  );
}
