import { Wallet, TrendingUp, TrendingDown, CreditCard } from "lucide-react";
import { getFinanceData, getBankStatement } from "@/lib/data/finance";
import { currentYearMonth, shiftMonth, monthLabel } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { MonthNav } from "@/components/finance/month-nav";
import { BankManager } from "@/components/finance/bank-manager";
import { CardManager } from "@/components/finance/card-manager";
import { CategoryManagerButton } from "@/components/finance/category-manager-button";
import { TransactionsSection } from "@/components/finance/transactions-section";
import { Statement } from "@/components/finance/statement";
import { ImportButton } from "@/components/finance/import-button";
import { Reveal } from "@/components/effects/reveal";
import { CountUp } from "@/components/effects/count-up";

export default async function FinancasPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; conta?: string }>;
}) {
  const { m, conta } = await searchParams;
  const offset = Math.min(0, Number(m) || 0); // não navega para o futuro

  const { year: cy, month: cm } = currentYearMonth();
  const { year, month } = shiftMonth(cy, cm, offset);

  let data: Awaited<ReturnType<typeof getFinanceData>>;
  try {
    data = await getFinanceData(year, month);
  } catch (e) {
    return (
      <FinanceLoadError message={e instanceof Error ? e.message : "Erro desconhecido"} />
    );
  }
  const { banks, cards, categories, monthTransactions, totals } = data;

  const invoicesTotal = cards.reduce((s, c) => s + c.invoice, 0);

  const selectedBankId =
    banks.find((b) => String(b.id) === conta)?.id ?? banks[0]?.id;
  const statement = selectedBankId
    ? await getBankStatement(selectedBankId, year, month)
    : null;

  const byCat = new Map<string, { icon: string; total: number }>();
  for (const t of monthTransactions) {
    if (t.type !== "expense" || t.is_card_payment) continue;
    const cat = categories.find((c) => c.id === t.category_id);
    const key = cat ? cat.name : "Sem categoria";
    const icon = cat?.icon ?? "📌";
    const prev = byCat.get(key);
    byCat.set(key, { icon, total: (prev?.total ?? 0) + Number(t.amount) });
  }
  const expenseByCat = [...byCat.entries()].sort((a, b) => b[1].total - a[1].total);

  const stats = [
    { label: "Saldo do mês", value: totals.balance, icon: Wallet, tone: totals.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400" },
    { label: "Entradas", value: totals.income, icon: TrendingUp, tone: "text-green-600 dark:text-green-400" },
    { label: "Despesas", value: totals.expense, icon: TrendingDown, tone: "text-red-600 dark:text-red-400" },
    { label: "Faturas abertas", value: invoicesTotal, icon: CreditCard, tone: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className="text-gradient text-4xl font-bold leading-none tracking-tighter"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Finanças
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Controle receitas, despesas, contas e faturas
          </p>
          <MonthNav label={monthLabel(year, month)} offset={offset} />
        </div>
        <ImportButton banks={banks} cards={cards} categories={categories} />
      </Reveal>

      {/* stat cards */}
      <Reveal stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="glass card-glow rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <CountUp value={value} currency className={`mt-1 block text-2xl font-semibold ${tone}`} />
              </div>
              <div className="rounded-full bg-muted p-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
        ))}
      </Reveal>

      {/* contas + cartões */}
      <Reveal stagger className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BankManager banks={banks} />
        <CardManager cards={cards} banks={banks} />
      </Reveal>

      {/* despesas por categoria + transações */}
      <Reveal className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass card-glow rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Despesas por categoria</h3>
            <CategoryManagerButton categories={categories} />
          </div>
          <div className="mt-4 space-y-4">
            {expenseByCat.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">Nenhuma despesa.</p>
            ) : (
              expenseByCat.map(([name, { icon, total }]) => {
                const pct = totals.expense > 0 ? (total / totals.expense) * 100 : 0;
                return (
                  <div key={name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <span className="font-medium">{name}</span>
                      </div>
                      <div className="text-right">
                        <p className="num font-semibold">{formatBRL(total)}</p>
                        <p className="num text-xs text-muted-foreground">{pct.toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                      <div className="bar-grow h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <TransactionsSection
            transactions={monthTransactions}
            categories={categories}
            banks={banks}
            cards={cards}
          />
        </div>
      </Reveal>

      {/* extrato bancário */}
      {statement && (
        <Reveal>
          <Statement
            statement={statement}
            banks={banks}
            selectedId={statement.bank.id}
            categories={categories}
            monthLabel={monthLabel(year, month)}
          />
        </Reveal>
      )}
    </div>
  );
}

function FinanceLoadError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1
        className="text-4xl font-bold leading-none tracking-tighter"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Finanças
      </h1>
      <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-300/40 dark:bg-amber-500/10 dark:text-amber-300">
        <p className="font-semibold">Não foi possível carregar os dados.</p>
        <p className="mt-1 font-mono text-xs text-amber-800 dark:text-amber-200/80">{message}</p>
        <p className="mt-3">
          Se as tabelas ainda não existem, rode{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">
            supabase/migrations/20260701000000_finance.sql
          </code>{" "}
          no SQL Editor do Supabase e recarregue a página.
        </p>
      </div>
    </div>
  );
}
