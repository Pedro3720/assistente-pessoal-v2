import { createClient } from "@/lib/supabase/server";
import { monthBounds, shiftMonth } from "@/lib/dates";
import { dueDate } from "@/lib/finance/billing-cycle";
import { buildCardInvoice } from "@/lib/finance/invoice";
import type { InstallmentRow } from "@/lib/finance/installments";
import type {
  Bank,
  BankWithBalance,
  CreditCard,
  CardWithInvoice,
  Category,
  Transaction,
  Subscription,
  SubscriptionCandidate,
  PlannedItem,
  PlanSuggestion,
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

  // Folga para as linhas da fatura: a janela do ciclo pode começar dois meses
  // antes do vencimento (cartão que fecha 25 e vence 10 tem a fatura de agosto
  // indo de 26/06 a 25/07), então três meses cobrem qualquer configuração.
  // É a mesma ideia da folga de getCardPayments, com um mês a mais porque ali
  // só interessa o pagamento, que acontece entre o fechamento e o vencimento.
  const cicloFrom = shiftMonth(year, month, -2);
  const { start: cycleFetchStart } = monthBounds(cicloFrom.year, cicloFrom.month);

  const [banksRes, cardsRes, catsRes, allTxRes, monthTxRes, cardTxRes] = await Promise.all([
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
    supabase
      .from("transactions")
      .select("*")
      .not("card_id", "is", null)
      .gte("occurred_on", cycleFetchStart)
      .lte("occurred_on", end)
      .order("occurred_on", { ascending: false }),
  ]);

  const err =
    banksRes.error ||
    cardsRes.error ||
    catsRes.error ||
    allTxRes.error ||
    monthTxRes.error ||
    cardTxRes.error;
  if (err) throw new Error(err.message);

  const banksRaw = (banksRes.data ?? []) as Bank[];
  const cardsRaw = (cardsRes.data ?? []) as CreditCard[];
  const categories = (catsRes.data ?? []) as Category[];
  const allTx = (allTxRes.data ?? []) as Pick<
    Transaction,
    "id" | "amount" | "type" | "bank_id" | "card_id" | "is_card_payment" | "occurred_on"
  >[];
  const monthTransactions = (monthTxRes.data ?? []) as Transaction[];
  // transações de cartão numa janela larga o bastante para o ciclo inteiro
  const cardTransactions = (cardTxRes.data ?? []) as Transaction[];

  const banks: BankWithBalance[] = banksRaw.map((b) => {
    let balance = num(b.opening_balance);
    for (const t of allTx) {
      if (t.bank_id !== b.id) continue;
      balance += t.type === "income" ? num(t.amount) : -num(t.amount);
    }
    return { ...b, balance };
  });

  // Fatura de cada cartão: valor, janela e linhas saem todos de buildCardInvoice
  // (lib/finance/invoice.ts). O mapa de linhas viaja junto com os cartões para
  // que a lista de movimentações da carteira mostre exatamente o que compõe o
  // valor do cabeçalho, em vez de refazer o filtro por conta própria.
  const invoiceRowsByCardId: Record<number, Transaction[]> = {};

  const cards: CardWithInvoice[] = cardsRaw.map((c) => {
    const fatura = buildCardInvoice(c, allTx, cardTransactions, year, month);
    invoiceRowsByCardId[c.id] = fatura.rows;

    const em_aberto = Math.max(fatura.utilizado - fatura.total, 0);
    const disponivel = num(c.credit_limit) - fatura.utilizado;

    return {
      ...c,
      invoice: fatura.total,
      fatura_mes: fatura.total,
      em_aberto,
      utilizado_total: fatura.utilizado,
      disponivel,
      cycle_start: fatura.window?.start ?? null,
      cycle_end: fatura.window?.end ?? null,
      cycle_due: dueDate(c.due_day, year, month),
    };
  });

  const income = monthTransactions
    .filter((t) => t.type === "income" && !t.is_transfer)
    .reduce((s, t) => s + num(t.amount), 0);
  // Compra no cartão CONTA como despesa do mês (visão de competência) e mantém
  // sua categoria. Pagamento de fatura entra no total de despesas (Onda 20,
  // decisão do dono): o mesmo gasto é contado na compra e no pagamento. O
  // cálculo da fatura, em lib/finance/invoice.ts, continua tratando pagamento
  // à parte.
  const expense = monthTransactions
    .filter((t) => t.type === "expense" && !t.is_transfer)
    .reduce((s, t) => s + num(t.amount), 0);

  return {
    banks,
    cards,
    categories,
    monthTransactions,
    invoiceRowsByCardId,
    totals: { income, expense, balance: income - expense },
  };
}

export type FinanceData = Awaited<ReturnType<typeof getFinanceData>>;

/**
 * Pagamentos de fatura de cartão numa janela ampla o bastante para cobrir o
 * ciclo, que pode começar no mês anterior ao vencimento quando o cartão fecha
 * depois do dia de vencimento. Sem essa folga, uma fatura já paga apareceria
 * como fechada (ver invoiceStatus em components/finance/card-detail.tsx).
 */
export async function getCardPayments(year: number, month: number): Promise<Transaction[]> {
  const supabase = await createClient();
  const prev = shiftMonth(year, month, -1);
  const { start } = monthBounds(prev.year, prev.month);
  const { end } = monthBounds(year, month);

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("is_card_payment", true)
    .not("card_id", "is", null)
    .gte("occurred_on", start)
    .lte("occurred_on", end);

  if (error) throw new Error(error.message);
  return (data ?? []) as Transaction[];
}

/**
 * Todas as parcelas de compras parceladas no cartão (Task 10, Onda 19), sem
 * filtro de mês: para saber qual é a parcela atual de cada parcelamento e
 * quanto ainda falta, é preciso ver as parcelas futuras também, que não estão
 * em `monthTransactions` (esse só cobre o mês visualizado). Só as colunas
 * necessárias e só linhas de cartão com `purchase_group` preenchido, não a
 * tabela inteira.
 */
export async function getInstallmentRows(): Promise<InstallmentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("description,amount,card_id,purchase_group,installments,installment_no,occurred_on")
    .not("purchase_group", "is", null)
    .not("card_id", "is", null);
  if (error) throw new Error(error.message);
  return (data ?? []) as InstallmentRow[];
}

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

// ─── Assinaturas ──────────────────────────────────────────

/** Normaliza a descrição para agrupar cobranças iguais. */
function normalizeDesc(desc: string): string {
  return desc
    .trim()
    .toLowerCase()
    .replace(/\s*\(\d+\/\d+\)\s*$/, "") // remove sufixo de parcela "(1/12)"
    .replace(/\s+/g, " ");
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Valor que mais se repete (usado para o dia de cobrança). */
function mode(nums: number[]): number {
  const counts = new Map<number, number>();
  let best = nums[0];
  let bestCount = 0;
  for (const n of nums) {
    const c = (counts.get(n) ?? 0) + 1;
    counts.set(n, c);
    if (c > bestCount) {
      bestCount = c;
      best = n;
    }
  }
  return best;
}

type TxSlim = Pick<
  Transaction,
  "description" | "amount" | "occurred_on" | "category_id" | "bank_id" | "card_id"
>;

/** Deriva candidatos a assinatura a partir do histórico de despesas. */
function detectCandidates(txs: TxSlim[], existing: Subscription[]): SubscriptionCandidate[] {
  const existingKeys = new Set(existing.map((s) => normalizeDesc(s.name)));

  type Group = {
    key: string;
    latestName: string;
    latestDate: string;
    latestAmount: number;
    latestCategory: number | null;
    latestBank: number | null;
    latestCard: number | null;
    months: Set<string>;
    days: number[];
    amounts: number[];
  };
  const groups = new Map<string, Group>();

  for (const t of txs) {
    const key = normalizeDesc(t.description);
    if (!key) continue;
    const amount = num(t.amount);
    const monthKey = t.occurred_on.slice(0, 7); // YYYY-MM
    const day = Number(t.occurred_on.slice(8, 10));
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        latestName: t.description.trim(),
        latestDate: t.occurred_on,
        latestAmount: amount,
        latestCategory: t.category_id,
        latestBank: t.bank_id,
        latestCard: t.card_id,
        months: new Set(),
        days: [],
        amounts: [],
      };
      groups.set(key, g);
    }
    g.months.add(monthKey);
    g.days.push(day);
    g.amounts.push(amount);
    if (t.occurred_on >= g.latestDate) {
      g.latestName = t.description.trim();
      g.latestDate = t.occurred_on;
      g.latestAmount = amount;
      g.latestCategory = t.category_id;
      g.latestBank = t.bank_id;
      g.latestCard = t.card_id;
    }
  }

  const out: SubscriptionCandidate[] = [];
  for (const g of groups.values()) {
    if (existingKeys.has(g.key)) continue;
    if (g.months.size < 3) continue;
    const med = median(g.amounts);
    const spread = Math.max(...g.amounts) - Math.min(...g.amounts);
    if (med <= 0 || spread > 0.15 * med) continue;
    out.push({
      key: g.key,
      name: g.latestName,
      amount: g.latestAmount,
      billing_day: mode(g.days),
      months: g.months.size,
      category_id: g.latestCategory,
      bank_id: g.latestBank,
      card_id: g.latestCard,
    });
  }
  out.sort((a, b) => b.months - a.months || b.amount - a.amount);
  return out.slice(0, 5);
}

/**
 * Assinaturas do usuário + candidatos detectados nos últimos 6 meses de despesas
 * (exclui pagamento de fatura e transferência) + total mensal das ativas.
 */
export async function getSubscriptions(year: number, month: number) {
  const supabase = await createClient();
  const from = shiftMonth(year, month, -5); // janela de 6 meses (inclui o atual)
  const { start } = monthBounds(from.year, from.month);
  const { end } = monthBounds(year, month);

  const [subsRes, txRes] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .order("active", { ascending: false })
      .order("amount", { ascending: false }),
    supabase
      .from("transactions")
      .select("description,amount,occurred_on,category_id,bank_id,card_id")
      .eq("type", "expense")
      .eq("is_card_payment", false)
      .eq("is_transfer", false)
      .eq("installments", 1)
      .gte("occurred_on", start)
      .lte("occurred_on", end)
      .order("occurred_on", { ascending: true })
      .order("id", { ascending: true }),
  ]);
  if (subsRes.error) throw new Error(subsRes.error.message);
  if (txRes.error) throw new Error(txRes.error.message);

  const subscriptions = (subsRes.data ?? []) as Subscription[];
  const txs = (txRes.data ?? []) as TxSlim[];

  const monthlyTotal = subscriptions
    .filter((s) => s.active)
    .reduce((sum, s) => sum + num(s.amount), 0);

  return { subscriptions, candidates: detectCandidates(txs, subscriptions), monthlyTotal };
}

export type SubscriptionsData = Awaited<ReturnType<typeof getSubscriptions>>;

// ─── Planejamento mensal ──────────────────────────────────

/**
 * Itens previstos do mês (due_date no mês) + sugestões vindas das assinaturas
 * ativas ainda não previstas neste mês + totais previstos.
 * Reusa normalizeDesc (seção Assinaturas) para deduplicar as sugestões.
 * Fallback vazio se a tabela `planned_items` ainda não existir (não quebra a página).
 */
export async function getMonthlyPlan(year: number, month: number) {
  const supabase = await createClient();
  const { start, end } = monthBounds(year, month);

  const [itemsRes, subsRes] = await Promise.all([
    supabase
      .from("planned_items")
      .select("*")
      .gte("due_date", start)
      .lte("due_date", end)
      .order("transaction_id", { ascending: true, nullsFirst: true })
      .order("due_date", { ascending: true }),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("active", true)
      .order("amount", { ascending: false }),
  ]);

  const emptyTotals = { previstoReceber: 0, previstoPagar: 0, saldoPrevisto: 0, pendentes: 0 };
  if (itemsRes.error) {
    return { items: [] as PlannedItem[], suggestions: [] as PlanSuggestion[], totals: emptyTotals };
  }

  const items = (itemsRes.data ?? []) as PlannedItem[];
  const subs = subsRes.error ? [] : ((subsRes.data ?? []) as Subscription[]);

  // dedupe: assinatura cujo nome já existe como item previsto neste mês não vira sugestão;
  // e duas assinaturas com o mesmo nome normalizado geram só uma sugestão (evita key duplicada).
  const seen = new Set(items.map((i) => normalizeDesc(i.description)));
  const lastDay = Number(end.slice(8, 10));
  const suggestions: PlanSuggestion[] = [];
  for (const s of subs) {
    const key = normalizeDesc(s.name);
    if (seen.has(key)) continue;
    seen.add(key);
    const day = Math.min(s.billing_day ?? 1, lastDay);
    const due_date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    suggestions.push({
      key,
      name: s.name,
      amount: num(s.amount),
      due_date,
      category_id: s.category_id,
      bank_id: s.bank_id,
      card_id: s.card_id,
    });
  }

  let previstoReceber = 0;
  let previstoPagar = 0;
  let pendentes = 0;
  for (const i of items) {
    if (i.type === "income") previstoReceber += num(i.amount);
    else previstoPagar += num(i.amount);
    if (i.transaction_id === null) pendentes += 1;
  }

  return {
    items,
    suggestions,
    totals: {
      previstoReceber,
      previstoPagar,
      saldoPrevisto: previstoReceber - previstoPagar,
      pendentes,
    },
  };
}

export type MonthlyPlanData = Awaited<ReturnType<typeof getMonthlyPlan>>;

// ─── Série mensal de saídas ───────────────────────────────

/**
 * Saídas somadas por mês, terminando três meses depois do mês visto, para o
 * gráfico dar contexto de passado e de compromissos já lançados à frente.
 * Exclui transferência. Pagamento de fatura conta como despesa (Onda 20,
 * decisão do dono), pela mesma regra do donut e de totals.expense (ver byCat
 * em app/(app)/financas/page.tsx).
 */
export async function getMonthlyExpenseSeries(
  year: number,
  month: number,
  months = 9
): Promise<{ label: string; total: number; current: boolean }[]> {
  const supabase = await createClient();

  const first = shiftMonth(year, month, 4 - months);
  const last = shiftMonth(year, month, 3);
  const { start } = monthBounds(first.year, first.month);
  const { end } = monthBounds(last.year, last.month);

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, occurred_on, type, is_transfer")
    .gte("occurred_on", start)
    .lte("occurred_on", end);

  if (error || !data) return [];

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const { year: by, month: bm } = shiftMonth(first.year, first.month, i);
    buckets.set(`${by}-${bm - 1}`, 0);
  }

  for (const t of data) {
    // Mesmo critério do donut e de totals.expense: os três precisam
    // concordar, senão a mesma tela mostra dois valores para a mesma coisa.
    if (t.type !== "expense" || t.is_transfer) continue;
    const [y, m] = t.occurred_on.split("-").map(Number);
    const key = `${y}-${m - 1}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + Number(t.amount));
  }

  return [...buckets.entries()].map(([key, total]) => {
    const [y, m] = key.split("-").map(Number);
    return {
      label: new Date(Date.UTC(y, m, 1)).toLocaleDateString("pt-BR", {
        month: "short",
        timeZone: "UTC",
      }),
      total,
      current: y === year && m === month - 1,
    };
  });
}
