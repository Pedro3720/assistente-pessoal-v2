/**
 * Ciclo de fatura do cartão.
 *
 * Até a Onda 19, closing_day e due_day eram guardados mas nenhum cálculo os
 * usava: eram texto na tela. Estas funções são puras e sem acesso a banco, o
 * que permite conferir os casos reais no olho.
 */

export type CycleWindow = { start: string; end: string };

/** Último dia do mês (mês 1-based), para travar dia maior que o mês comporta. */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Soma dias a uma data ISO, montando a data por componentes para não pegar fuso. */
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return iso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

/**
 * Janela de compras da fatura que VENCE em (year, month).
 *
 * A fatura fecha no dia `closingDay` do próprio mês do vencimento quando o
 * fechamento vem antes do vencimento; quando vem depois, fecha no mês anterior.
 * A janela vai do dia seguinte ao fechamento anterior até o fechamento atual,
 * inclusive nas duas pontas.
 *
 * Devolve null quando o cartão não tem os dois dias definidos: nesse caso quem
 * chama cai no mês-calendário, que é o comportamento anterior à Onda 19.
 */
export function cycleWindow(
  closingDay: number | null,
  dueDay: number | null,
  year: number,
  month: number
): CycleWindow | null {
  if (!closingDay || !dueDay) return null;

  // mês em que esta fatura fecha
  let cy = year;
  let cm = month;
  if (closingDay >= dueDay) {
    cm -= 1;
    if (cm === 0) {
      cm = 12;
      cy -= 1;
    }
  }

  const end = iso(cy, cm, Math.min(closingDay, lastDayOfMonth(cy, cm)));

  // fechamento do ciclo anterior
  let py = cy;
  let pm = cm - 1;
  if (pm === 0) {
    pm = 12;
    py -= 1;
  }
  const prevEnd = iso(py, pm, Math.min(closingDay, lastDayOfMonth(py, pm)));

  return { start: addDays(prevEnd, 1), end };
}

/**
 * Melhor dia de compra: o dia seguinte ao fechamento, que é quando a compra
 * cai na fatura mais distante e ganha o prazo máximo. É orientação geral, não
 * data de um mês específico.
 */
export function bestPurchaseDay(closingDay: number): number {
  return closingDay >= 31 ? 1 : closingDay + 1;
}
