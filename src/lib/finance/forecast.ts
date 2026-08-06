/**
 * Projeção das próximas faturas de um cartão (Onda 19, Task 11).
 *
 * Pura e sem acesso a banco, como billing-cycle.ts e installments.ts: os
 * dados de entrada (parcelas futuras e assinaturas do cartão) já chegam
 * prontos da página, que os carrega para outros usos desta mesma onda
 * (Task 9 lê as movimentações da fatura, Task 10 os parcelamentos em aberto,
 * a aba Recorrentes as assinaturas) e não precisa de uma consulta nova só
 * para esta projeção.
 *
 * A projeção é um PISO, não uma previsão: soma apenas o que já está lançado
 * no banco (parcelas futuras já criadas por `createInstallmentPurchase` e
 * assinaturas ativas). Gasto novo, ainda não lançado, não entra: e por isso
 * o texto que acompanha `CardForecast` na tela não é decorativo.
 */

import { shiftMonth, monthBounds, monthLabel } from "@/lib/dates";
import { cycleWindow } from "./billing-cycle";
import type { InstallmentRow } from "./installments";

export type ForecastSubscription = {
  amount: number;
  billing_day: number | null;
  card_id: number | null;
  active: boolean;
};

export type ForecastRow = { label: string; total: number };

/**
 * Mesma regra de resolução de data de cobrança usada em `getMonthlyPlan`
 * (src/lib/data/finance.ts): o dia da assinatura é travado no último dia do
 * mês em questão. Como a janela de um ciclo pode atravessar virada de mês
 * (cartão que fecha depois do dia de vencimento), os dois meses que a janela
 * toca (o do início e o do fim) são conferidos, não só um.
 */
function subscriptionFalls(
  billingDay: number | null,
  window: { start: string; end: string }
): boolean {
  const months = new Set([window.start.slice(0, 7), window.end.slice(0, 7)]);
  for (const ym of months) {
    const [y, m] = ym.split("-").map(Number);
    const lastDay = Number(monthBounds(y, m).end.slice(8, 10));
    const day = Math.min(billingDay ?? 1, lastDay);
    const date = `${ym}-${String(day).padStart(2, "0")}`;
    if (date >= window.start && date <= window.end) return true;
  }
  return false;
}

/**
 * Soma, para cada um dos `months` ciclos SEGUINTES ao visualizado (não inclui
 * o ciclo em foco, que já aparece no cabeçalho de `CardDetail`), as parcelas
 * futuras e as assinaturas ativas do cartão que caem na janela daquele ciclo.
 *
 * Cartão sem `closing_day`/`due_day` (`cycleWindow` devolve null): cai no
 * mês-calendário, mesmo fallback usado no resto da página de Finanças.
 */
export function buildCardForecast(
  cardId: number,
  closingDay: number | null,
  dueDay: number | null,
  installmentRows: InstallmentRow[],
  subscriptions: ForecastSubscription[],
  year: number,
  month: number,
  months = 6
): ForecastRow[] {
  const rows = installmentRows.filter((r) => r.card_id === cardId);
  const subs = subscriptions.filter((s) => s.card_id === cardId && s.active);

  const out: ForecastRow[] = [];
  for (let i = 1; i <= months; i++) {
    const target = shiftMonth(year, month, i);
    const janela = cycleWindow(closingDay, dueDay, target.year, target.month) ?? monthBounds(target.year, target.month);

    const parcelas = rows
      .filter((r) => r.occurred_on >= janela.start && r.occurred_on <= janela.end)
      .reduce((s, r) => s + Number(r.amount), 0);

    const assinaturas = subs
      .filter((s) => subscriptionFalls(s.billing_day, janela))
      .reduce((s, sub) => s + Number(sub.amount), 0);

    out.push({ label: monthLabel(target.year, target.month), total: parcelas + assinaturas });
  }
  return out;
}
