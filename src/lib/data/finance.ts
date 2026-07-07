import { createClient } from "@/lib/supabase/server";
import { monthBounds } from "@/lib/dates";
import type {
  Bank,
  BankWithBalance,
  CreditCard,
  CardWithInvoice,
  Category,
  Transaction,
} from "@/types/finance";

const num = (v: unknown) => Number(v) || 0;

/**
 * Carrega tudo que a página de Finanças precisa para um mês e calcula
 * saldos de conta e faturas de cartão a partir do histórico completo.
 *
 * Invariantes (garantidas na escrita, ver actions/finance.ts):
 *  • Compra no cartão não afeta saldo do banco (bank_id fica NULL).
 *  • Pagamento de fatura (is_card_payment) abate a fatura e sai do banco.
 */
export async function getFinanceData(year: number, month: number) {
  const supabase = await createClient();
  const { start, end } = monthBounds(year, month);

  const [banksRes, cardsRes, catsRes, allTxRes, monthTxRes] = await Promise.all([
    supabase.from("banks").select("*").order("name"),
    supabase.from("credit_cards").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("transactions")
      .select("id,amount,type,bank_id,card_id,is_card_payment,occurred_on"),
    supabase
      .from("transactions")
      .select("*")
      .gte("occurred_on", start)
      .lte("occurred_on", end)
      .order("occurred_on", { ascending: false }),
  ]);

  const err =
    banksRes.error ||
    cardsRes.error ||
    catsRes.error ||
    allTxRes.error ||
    monthTxRes.error;
  if (err) throw new Error(err.message);

  const banksRaw = (banksRes.data ?? []) as Bank[];
  const cardsRaw = (cardsRes.data ?? []) as CreditCard[];
  const categories = (catsRes.data ?? []) as Category[];
  const allTx = (allTxRes.data ?? []) as Pick<
    Transaction,
    "id" | "amount" | "type" | "bank_id" | "card_id" | "is_card_payment" | "occurred_on"
  >[];
  const monthTransactions = (monthTxRes.data ?? []) as Transaction[];

  const banks: BankWithBalance[] = banksRaw.map((b) => {
    let balance = num(b.opening_balance);
    for (const t of allTx) {
      if (t.bank_id !== b.id) continue;
      balance += t.type === "income" ? num(t.amount) : -num(t.amount);
    }
    return { ...b, balance };
  });

  const curKey = year * 12 + (month - 1);
  const billingKey = (occurred_on: string) => {
    const [yy, mm] = occurred_on.split("-").map(Number);
    return yy * 12 + (mm - 1);
  };

  const cards: CardWithInvoice[] = cardsRaw.map((c) => {
    let utilizado = num(c.opening_invoice);
    let faturaMes = num(c.opening_invoice);
    for (const t of allTx) {
      if (t.card_id !== c.id || t.type !== "expense") continue;
      const delta = t.is_card_payment ? -num(t.amount) : num(t.amount);
      utilizado += delta;
      if (t.is_card_payment || billingKey(t.occurred_on) <= curKey) faturaMes += delta;
    }
    utilizado = Math.max(utilizado, 0);
    faturaMes = Math.max(faturaMes, 0);
    const em_aberto = Math.max(utilizado - faturaMes, 0);
    const disponivel = num(c.credit_limit) - utilizado;
    return {
      ...c,
      invoice: faturaMes,
      fatura_mes: faturaMes,
      em_aberto,
      utilizado_total: utilizado,
      disponivel,
    };
  });

  const income = monthTransactions
    .filter((t) => t.type === "income" && !t.is_transfer)
    .reduce((s, t) => s + num(t.amount), 0);
  // Compra no cartão CONTA como despesa do mês (visão de competência) e mantém
  // sua categoria. Pagamento de fatura NÃO é despesa nova — é quitação de dívida —
  // então fica de fora do total e da quebra por categoria (evita contar duas vezes).
  const expense = monthTransactions
    .filter((t) => t.type === "expense" && !t.is_card_payment && !t.is_transfer)
    .reduce((s, t) => s + num(t.amount), 0);

  return {
    banks,
    cards,
    categories,
    monthTransactions,
    totals: { income, expense, balance: income - expense },
  };
}

export type FinanceData = Awaited<ReturnType<typeof getFinanceData>>;

export type StatementEntry = Transaction & { balance: number };

/**
 * Extrato de uma conta: saldo de abertura do mês + lançamentos dia a dia
 * com saldo corrente. Só transações com bank_id = conta entram aqui
 * (compras no cartão têm bank_id NULL, então não aparecem — como deve ser).
 */
export async function getBankStatement(bankId: number, year: number, month: number) {
  const supabase = await createClient();
  const [bankRes, txRes] = await Promise.all([
    supabase.from("banks").select("*").eq("id", bankId).single(),
    supabase
      .from("transactions")
      .select("*")
      .eq("bank_id", bankId)
      .order("occurred_on", { ascending: true })
      .order("id", { ascending: true }),
  ]);
  if (bankRes.error) throw new Error(bankRes.error.message);
  if (txRes.error) throw new Error(txRes.error.message);

  const bank = bankRes.data as Bank;
  const tx = (txRes.data ?? []) as Transaction[];
  const { start, end } = monthBounds(year, month);
  const delta = (t: Transaction) =>
    t.type === "income" ? num(t.amount) : -num(t.amount);

  // saldo de abertura = saldo inicial + tudo antes do mês
  let opening = num(bank.opening_balance);
  for (const t of tx) if (t.occurred_on < start) opening += delta(t);

  // saldo corrente dentro do mês
  let running = opening;
  const byDay = new Map<string, StatementEntry[]>();
  for (const t of tx) {
    if (t.occurred_on < start || t.occurred_on > end) continue;
    running += delta(t);
    const arr = byDay.get(t.occurred_on) ?? [];
    arr.push({ ...t, balance: running });
    byDay.set(t.occurred_on, arr);
  }

  // agrupa por dia (mais recente primeiro; dentro do dia, mais recente em cima)
  const days = [...byDay.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ date, entries: [...byDay.get(date)!].reverse() }));

  let count = 0;
  for (const d of days) count += d.entries.length;

  return { bank, opening, closing: running, days, count };
}

export type BankStatement = Awaited<ReturnType<typeof getBankStatement>>;
