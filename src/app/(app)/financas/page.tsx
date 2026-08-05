import {
  getFinanceData,
  getBankStatement,
  getSubscriptions,
  getMonthlyPlan,
  getMonthlyExpenseSeries,
  getCardPayments,
  getInstallmentRows,
} from "@/lib/data/finance";
import { getPluggyItems, getPendingCategorization } from "@/lib/data/pluggy";
import { CategorizationQueue } from "@/components/finance/categorization-queue";
import { currentYearMonth, shiftMonth, monthLabel, monthBounds, todayISO } from "@/lib/dates";
import { MonthNav } from "@/components/finance/month-nav";
import { AccountsSummary } from "@/components/finance/accounts-summary";
import { AccountsCard } from "@/components/finance/accounts-card";
import { CardsCard } from "@/components/finance/cards-card";
import { CardWallet } from "@/components/finance/card-wallet";
import { CardDetail } from "@/components/finance/card-detail";
import { CardInvoiceRows } from "@/components/finance/card-invoice-rows";
import { CardInstallments } from "@/components/finance/card-installments";
import { CategoryManagerButton } from "@/components/finance/category-manager-button";
import { TransactionsSection } from "@/components/finance/transactions-section";
import { Statement } from "@/components/finance/statement";
import { SubscriptionsSection } from "@/components/finance/subscriptions-section";
import { PlanningSection } from "@/components/finance/planning-section";
import { ImportButton } from "@/components/finance/import-button";
import { CategoryDonut } from "@/components/finance/category-donut";
import { CategoryLegend } from "@/components/finance/category-legend";
import { MonthlyExpenseChart } from "@/components/finance/monthly-expense-chart";
import { pluggyConfigurada } from "@/lib/pluggy/client";
import { buildCategorySlices } from "@/lib/finance/category-chart";
import { buildInstallmentGroups } from "@/lib/finance/installments";
import { Reveal } from "@/components/effects/reveal";
import { PanelHeader, PanelContext } from "@/components/ui/panel-header";
import { Segmented } from "@/components/ui/segmented";

/**
 * Fonte única das abas: Segmented (rótulos) e a validação da URL (Aba,
 * isAba) derivam daqui, para nunca ficarem fora de sincronia.
 */
const TAB_ITEMS = [
  { value: "visao", label: "Visão geral" },
  { value: "transacoes", label: "Transações" },
  { value: "contas", label: "Contas" },
  { value: "cartoes", label: "Cartões" },
  { value: "agendadas", label: "Agendadas" },
  { value: "recorrentes", label: "Recorrentes" },
] satisfies { value: string; label: string }[];

type Aba = (typeof TAB_ITEMS)[number]["value"];
const TAB_VALUES: readonly string[] = TAB_ITEMS.map((t) => t.value);

function isAba(value: string | undefined): value is Aba {
  return !!value && TAB_VALUES.includes(value);
}

export default async function FinancasPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; conta?: string; aba?: string }>;
}) {
  const { m, conta, aba: abaParam } = await searchParams;
  // aba=lixo (valor desconhecido na URL) não pode cair numa página em branco:
  // valida contra a lista conhecida e volta para "visao" quando não bater.
  const aba: Aba = isAba(abaParam) ? abaParam : "visao";
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

  // banks.icon segue o mesmo formato que EntityIcon já resolve para marca de
  // banco: "bank:<slug>". Fora desse formato (ícone do catálogo ou emoji
  // legado), o cartão cai no fallback de cor do CardArt.
  const bankSlugById: Record<number, string | null> = Object.fromEntries(
    banks.map((b) => [b.id, b.icon.startsWith("bank:") ? b.icon.slice(5) : null])
  );

  const selectedBankId =
    banks.find((b) => String(b.id) === conta)?.id ?? banks[0]?.id;
  const [
    statement,
    subs,
    plan,
    pluggyItems,
    paraCategorizar,
    monthlyExpenseSeries,
    cardPayments,
    installmentRows,
  ] = await Promise.all([
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
    getMonthlyExpenseSeries(year, month).catch(() => []),
    getCardPayments(year, month).catch(() => []),
    getInstallmentRows().catch(() => []),
  ]);

  // Parcelamentos em aberto de cada cartão (Task 10, Onda 19): a "parcela
  // atual" é a maior já lançada dentro da janela da fatura em foco, não a
  // maior linha que existe (createInstallmentPurchase já cria todas de uma
  // vez, com occurred_on em meses futuros). Cartão sem ciclo definido cai no
  // mês-calendário visualizado, mesmo fallback do resto da página.
  const monthEnd = monthBounds(year, month).end;
  const cycleEndByCard: Record<number, string> = Object.fromEntries(
    cards.map((c) => [c.id, c.cycle_end ?? monthEnd])
  );
  const installmentGroupsByCard = buildInstallmentGroups(installmentRows, cycleEndByCard);

  // Movimentações da fatura de cada cartão (Task 9, Onda 19): mesmo critério
  // de fatura_mes em getFinanceData (card_id, type "expense", dentro da
  // janela do ciclo), para o total da lista bater com o valor mostrado no
  // CardDetail. Sem ciclo definido (cartão sem closing_day), cai no
  // mês-calendário inteiro, que já é o que monthTransactions cobre; nesse
  // caso o total pode não bater com fatura_mes, que ali é cumulativo desde a
  // abertura do cartão (comportamento antigo mantido por getFinanceData,
  // não algo que esta task tenta resolver).
  const invoiceRowsByCardId: Record<number, typeof monthTransactions> = Object.fromEntries(
    cards.map((c) => [
      c.id,
      monthTransactions.filter((t) => {
        if (t.card_id !== c.id || t.type !== "expense") return false;
        if (c.cycle_start && c.cycle_end) {
          return t.occurred_on >= c.cycle_start && t.occurred_on <= c.cycle_end;
        }
        return true;
      }),
    ])
  );

  // Detalhe do estado aberto da carteira: cabeçalho da fatura, limite e
  // datas (Task 8), com as movimentações da fatura (Task 9) e os
  // parcelamentos em aberto (Task 10) como children. Os blocos seguintes
  // (projeção, gerenciar) entram em tasks futuras da Onda 19. Pré-renderizado
  // aqui (Server Component) e entregue como ReactNode por cartão, porque o
  // CardWallet é "use client" e não pode receber função como prop. Pagamentos
  // vêm de getCardPayments (janela mês anterior + atual), não de
  // monthTransactions: o ciclo pode começar no mês anterior ao vencimento
  // quando o cartão fecha depois do dia de vencimento.
  const cardDetailById: Record<number, React.ReactNode> = Object.fromEntries(
    cards.map((c) => [
      c.id,
      <CardDetail
        key={c.id}
        card={c}
        year={year}
        month={month}
        payments={cardPayments.filter((t) => t.card_id === c.id)}
      >
        <CardInvoiceRows
          transactions={invoiceRowsByCardId[c.id] ?? []}
          categories={categories}
          janela={c.cycle_start && c.cycle_end ? { start: c.cycle_start, end: c.cycle_end } : null}
        />
        <CardInstallments groups={installmentGroupsByCard[c.id] ?? []} />
      </CardDetail>,
    ])
  );

  const byCat = new Map<string, { icon: string; total: number; limit: number | null }>();
  for (const t of monthTransactions) {
    if (t.type !== "expense" || t.is_card_payment || t.is_transfer) continue;
    const cat = categories.find((c) => c.id === t.category_id);
    const key = cat ? cat.name : "Sem categoria";
    const icon = cat?.icon ?? "tag";
    const prev = byCat.get(key);
    byCat.set(key, {
      icon,
      total: (prev?.total ?? 0) + Number(t.amount),
      limit: cat?.monthly_limit ?? null,
    });
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
            items={TAB_ITEMS.map((t) => ({
              ...t,
              href: `/financas?aba=${t.value}${offset ? `&m=${offset}` : ""}`,
            }))}
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
          {/* fila do que chegou sozinho e ainda não tem categoria */}
          {paraCategorizar.length > 0 && (
            <Reveal>
              <CategorizationQueue transactions={paraCategorizar} categories={categories} />
            </Reveal>
          )}

          {/* conteúdo principal à esquerda, rail (contas e cartões) à direita;
              uma coluna só no celular */}
          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            {/* coluna principal: série mensal em cima, categorias embaixo */}
            <div className="space-y-6">
              <Reveal>
                <MonthlyExpenseChart data={monthlyExpenseSeries} />
              </Reveal>

              {/* despesas por categoria */}
              <Reveal>
                <div className="rounded-lg bg-card p-4">
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
                      <CategoryLegend slices={donut.slices} />
                    </>
                  )}
                </div>
              </Reveal>
            </div>

            {/* rail: contas e cartões são entidades separadas no modelo, uma
                diz quanto você tem, a outra quanto você deve */}
            <div className="space-y-6">
              <Reveal>
                <AccountsCard banks={banks} />
              </Reveal>
              <Reveal>
                <CardsCard cards={cards} />
              </Reveal>
            </div>
          </div>
        </>
      )}

      {/* contas bancárias: criar e excluir conta */}
      {aba === "contas" && (
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
      )}

      {/* carteira de cartões de crédito */}
      {aba === "cartoes" && (
        <Reveal>
          <CardWallet cards={cards} bankSlugById={bankSlugById} renderDetail={cardDetailById} />
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
