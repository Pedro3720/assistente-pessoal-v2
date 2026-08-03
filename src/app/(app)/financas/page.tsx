import { getFinanceData, getBankStatement, getSubscriptions, getMonthlyPlan } from "@/lib/data/finance";
import { getPluggyItems, getPendingCategorization } from "@/lib/data/pluggy";
import { CategorizationQueue } from "@/components/finance/categorization-queue";
import { currentYearMonth, shiftMonth, monthLabel, todayISO } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { MonthNav } from "@/components/finance/month-nav";
import { AccountsSummary } from "@/components/finance/accounts-summary";
import { CardManager } from "@/components/finance/card-manager";
import { CategoryManagerButton } from "@/components/finance/category-manager-button";
import { TransactionsSection } from "@/components/finance/transactions-section";
import { Statement } from "@/components/finance/statement";
import { SubscriptionsSection } from "@/components/finance/subscriptions-section";
import { PlanningSection } from "@/components/finance/planning-section";
import { ImportButton } from "@/components/finance/import-button";
import { CategoryDonut } from "@/components/finance/category-donut";
import { EntityIcon } from "@/components/ui/entity-icon";
import { pluggyConfigurada } from "@/lib/pluggy/client";
import { buildCategorySlices, categoryColor } from "@/lib/finance/category-chart";
import { Reveal } from "@/components/effects/reveal";
import { PanelHeader, PanelContext } from "@/components/ui/panel-header";
import { Segmented } from "@/components/ui/segmented";

export default async function FinancasPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; conta?: string; aba?: string }>;
}) {
  const { m, conta, aba: abaParam } = await searchParams;
  const aba = typeof abaParam === "string" ? abaParam : "visao";
  const offset = Number(m) || 0; // permite meses futuros (planejamento)

  const { year: cy, month: cm } = currentYearMonth();
  const { year, month } = shiftMonth(cy, cm, offset);

  const defaultDate =
    year === cy && month === cm
      ? todayISO()
      : `${year}-${String(month).padStart(2, "0")}-01`;

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
  const [statement, subs, plan, pluggyItems, paraCategorizar] = await Promise.all([
    selectedBankId ? getBankStatement(selectedBankId, year, month) : Promise.resolve(null),
    getSubscriptions(year, month).catch(() => ({
      subscriptions: [],
      candidates: [],
      monthlyTotal: 0,
    })),
    getMonthlyPlan(year, month).catch(() => ({
      items: [],
      suggestions: [],
      totals: { previstoReceber: 0, previstoPagar: 0, saldoPrevisto: 0, pendentes: 0 },
    })),
    getPluggyItems().catch(() => []),
    getPendingCategorization().catch(() => []),
  ]);

  const byCat = new Map<string, { icon: string; total: number }>();
  for (const t of monthTransactions) {
    if (t.type !== "expense" || t.is_card_payment || t.is_transfer) continue;
    const cat = categories.find((c) => c.id === t.category_id);
    const key = cat ? cat.name : "Sem categoria";
    const icon = cat?.icon ?? "tag";
    const prev = byCat.get(key);
    byCat.set(key, { icon, total: (prev?.total ?? 0) + Number(t.amount) });
  }
  const expenseByCat = [...byCat.entries()].sort((a, b) => b[1].total - a[1].total);
  const donut = buildCategorySlices(expenseByCat, totals.expense);

  return (
    <div className="space-y-6">
      <PanelHeader
        context={
          <PanelContext>
            <MonthNav label={monthLabel(year, month)} offset={offset} />
          </PanelContext>
        }
        tabs={
          <Segmented
            value={aba}
            hrefFor={(v) => `/financas?aba=${v}${offset ? `&m=${offset}` : ""}`}
            items={[
              { value: "visao", label: "Visão geral" },
              { value: "transacoes", label: "Transações" },
              { value: "cartoes", label: "Cartões" },
              { value: "agendadas", label: "Agendadas" },
              { value: "recorrentes", label: "Recorrentes" },
            ]}
          />
        }
        actions={<ImportButton banks={banks} cards={cards} categories={categories} />}
      />

      {/* o título só existe no celular: no desktop a sidebar e as abas já
          dizem onde você está */}
      <h1
        className="px-4 text-2xl font-bold tracking-tight md:hidden"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Finanças
      </h1>

      {aba === "visao" && (
        <>
          {/* resumo das contas (substitui os 4 cartões de indicador) */}
          <Reveal>
            <AccountsSummary
              banks={banks}
              income={totals.income}
              expense={totals.expense}
              invoicesTotal={invoicesTotal}
              podeConectar={pluggyConfigurada()}
              pluggyItems={pluggyItems}
            />
          </Reveal>

          {/* fila do que chegou sozinho e ainda não tem categoria */}
          {paraCategorizar.length > 0 && (
            <Reveal>
              <CategorizationQueue transactions={paraCategorizar} categories={categories} />
            </Reveal>
          )}

          {/* despesas por categoria + transações */}
          <Reveal className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="glass card-glow rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Despesas por categoria</h3>
                <CategoryManagerButton categories={categories} />
              </div>
              {expenseByCat.length === 0 ? (
                <p className="mt-4 text-center text-sm text-muted-foreground">Nenhuma despesa.</p>
              ) : (
                <>
                  <CategoryDonut slices={donut.slices} total={totals.expense} />
                  {donut.othersCount > 0 && (
                    <p className="mt-1 text-center text-[11px] text-muted-foreground">
                      A fatia &quot;Outras&quot; reúne {donut.othersCount} categorias menores.
                    </p>
                  )}
                  {/* a lista é a legenda do donut: mesma cor, com nome, valor e % */}
                  <div className="mt-4 space-y-4">
                    {expenseByCat.map(([name, { icon, total }], i) => {
                      const pct = totals.expense > 0 ? (total / totals.expense) * 100 : 0;
                      const color = categoryColor(i);
                      return (
                        <div key={name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                                aria-hidden
                              />
                              <EntityIcon value={icon} size={16} className="h-7 w-7 rounded-full bg-muted text-muted-foreground" />
                              <span className="truncate font-medium">{name}</span>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="num font-semibold">{formatBRL(total)}</p>
                              <p className="num text-xs text-muted-foreground">{pct.toFixed(0)}%</p>
                            </div>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                            <div
                              className="bar-grow h-1.5 rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="lg:col-span-2">
              <TransactionsSection
                transactions={monthTransactions}
                categories={categories}
                banks={banks}
                cards={cards}
                defaultDate={defaultDate}
                monthLabel={monthLabel(year, month)}
              />
            </div>
          </Reveal>
        </>
      )}

      {/* cartões */}
      {aba === "cartoes" && (
        <Reveal>
          <CardManager cards={cards} banks={banks} />
        </Reveal>
      )}

      {/* assinaturas recorrentes */}
      {aba === "recorrentes" && (
        <Reveal>
          <SubscriptionsSection
            subscriptions={subs.subscriptions}
            candidates={subs.candidates}
            monthlyTotal={subs.monthlyTotal}
            categories={categories}
            banks={banks}
            cards={cards}
          />
        </Reveal>
      )}

      {/* planejamento mensal */}
      {aba === "agendadas" && (
        <Reveal>
          <PlanningSection
            items={plan.items}
            suggestions={plan.suggestions}
            previstoReceber={plan.totals.previstoReceber}
            previstoPagar={plan.totals.previstoPagar}
            saldoPrevisto={plan.totals.saldoPrevisto}
            categories={categories}
            banks={banks}
            cards={cards}
            defaultDate={defaultDate}
          />
        </Reveal>
      )}

      {aba === "transacoes" && (
        <>
          <Reveal>
            <TransactionsSection
              transactions={monthTransactions}
              categories={categories}
              banks={banks}
              cards={cards}
              defaultDate={defaultDate}
              monthLabel={monthLabel(year, month)}
            />
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
        </>
      )}
    </div>
  );
}

function FinanceLoadError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1
        className="text-3xl md:text-4xl font-bold leading-none tracking-tighter"
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
