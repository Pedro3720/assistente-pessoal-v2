/**
 * Regra única da fatura do cartão.
 *
 * Antes da correção final da Onda 19, quatro lugares decidiam sozinhos o que
 * compõe a fatura: `getFinanceData` somava um delta de saldo dentro da janela
 * do ciclo (e o pagamento da fatura anterior, que cai dentro dessa janela,
 * zerava o mês) e `financas/page.tsx` refazia o filtro por cima do
 * mês-calendário (perdendo a parte da janela que fica no mês anterior). Os dois
 * discordavam entre si e nenhum batia com o extrato do banco.
 *
 * Agora existe só esta função: ela devolve a janela, o total e as linhas, e
 * quem mostra o cabeçalho e quem mostra a lista consomem a MESMA saída.
 *
 * Regras que ela encapsula:
 *  • Com ciclo: a fatura é a soma das DESPESAS do cartão dentro da janela.
 *    Pagamento de fatura não entra no total nem nas linhas: ele quita o ciclo
 *    anterior, não pertence ao ciclo em que a data dele cai.
 *  • Sem ciclo (falta closing_day ou due_day): comportamento anterior à Onda 19,
 *    de saldo acumulado até o fim do mês visualizado, incluindo opening_invoice
 *    e com o pagamento abatendo.
 *  • `opening_invoice` fica fora do total do ciclo (senão reapareceria em todas
 *    as faturas) e dentro de `utilizado`, que é consumo de limite.
 *  • `utilizado` é o saldo de limite da vida toda do cartão: ali o pagamento
 *    abate mesmo, e o sinal do delta antigo está certo.
 */

import { monthBounds } from "@/lib/dates";
import { cycleWindow, type CycleWindow } from "./billing-cycle";

const num = (v: unknown) => Number(v) || 0;

/** O mínimo que uma transação precisa ter para entrar no cálculo. */
export type InvoiceTxLike = {
  amount: number;
  type: string;
  card_id: number | null;
  is_card_payment: boolean;
  occurred_on: string;
};

/** O mínimo que o cartão precisa ter. `CreditCard` satisfaz. */
export type InvoiceCardLike = {
  id: number;
  closing_day: number | null;
  due_day: number | null;
  opening_invoice: number;
};

export type CardInvoice<T> = {
  /** janela do ciclo desta fatura; null quando o cartão não tem ciclo definido */
  window: CycleWindow | null;
  /** valor da fatura em foco, nunca negativo */
  total: number;
  /** linhas que compõem a fatura, mais recentes primeiro */
  rows: T[];
  /** consumo de limite acumulado (histórico inteiro), nunca negativo */
  utilizado: number;
};

/**
 * Fatura do cartão no mês visualizado.
 *
 * @param card         cartão (dias do ciclo e fatura de abertura)
 * @param history      histórico do cartão para o consumo de limite. Pode ser a
 *                     lista de todos os cartões: a função filtra por `card.id`.
 *                     Só precisa das colunas de `InvoiceTxLike`.
 * @param cycleRows    transações completas numa janela que cubra o ciclo (ver
 *                     `getFinanceData`, que busca três meses). Viram as linhas
 *                     da fatura e, com ciclo, o total sai da soma delas: assim
 *                     cabeçalho e lista não têm como discordar.
 * @param year, month  mês visualizado (define a fatura em foco)
 */
export function buildCardInvoice<T extends InvoiceTxLike>(
  card: InvoiceCardLike,
  history: InvoiceTxLike[],
  cycleRows: T[],
  year: number,
  month: number
): CardInvoice<T> {
  const window = cycleWindow(card.closing_day, card.due_day, year, month);

  // Sem ciclo, a "janela" das linhas é o mês-calendário visualizado, que é o
  // recorte que a tela mostrava antes da Onda 19.
  const { start: mesStart, end: mesEnd } = monthBounds(year, month);
  const inicio = window?.start ?? mesStart;
  const fim = window?.end ?? mesEnd;

  const rows = cycleRows
    .filter(
      (t) =>
        t.card_id === card.id &&
        t.type === "expense" &&
        !t.is_card_payment &&
        t.occurred_on >= inicio &&
        t.occurred_on <= fim
    )
    .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));

  // consumo de limite: histórico inteiro, com o pagamento abatendo
  let utilizado = num(card.opening_invoice);
  for (const t of history) {
    if (t.card_id !== card.id || t.type !== "expense") continue;
    utilizado += t.is_card_payment ? -num(t.amount) : num(t.amount);
  }
  utilizado = Math.max(utilizado, 0);

  let total: number;
  if (window) {
    total = rows.reduce((s, t) => s + num(t.amount), 0);
  } else {
    // comportamento antigo: acumulado até o fim do mês visualizado
    total = num(card.opening_invoice);
    for (const t of history) {
      if (t.card_id !== card.id || t.type !== "expense") continue;
      if (t.occurred_on > mesEnd) continue;
      total += t.is_card_payment ? -num(t.amount) : num(t.amount);
    }
  }
  total = Math.max(total, 0);

  return { window, total, rows, utilizado };
}
