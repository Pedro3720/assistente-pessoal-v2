/**
 * Parcelamentos em aberto do cartão (Onda 19, Task 10).
 *
 * `createInstallmentPurchase` (actions/finance.ts) já cria TODAS as linhas de
 * uma compra parcelada de uma vez, cada uma com seu `occurred_on` num mês
 * futuro. Por isso "quantas parcelas já foram lançadas" não é "quantas linhas
 * existem" (isso já seria `installments` inteiro desde o dia da compra): é
 * quantas já caíram dentro da janela da fatura em foco. Roda no servidor (a
 * página monta os grupos e passa prontos ao componente client), mesmo padrão
 * de `category-chart.ts` com o donut.
 */

export type InstallmentRow = {
  description: string;
  amount: number;
  card_id: number | null;
  purchase_group: string | null;
  installments: number;
  installment_no: number;
  occurred_on: string;
};

export type InstallmentGroup = {
  purchaseGroup: string;
  titulo: string;
  atual: number;
  total: number;
  valorParcela: number;
  falta: number;
};

/**
 * Remove o prefixo/sufixo de parcela do título, quando ele bate exatamente
 * com `installment_no`/`installments` desta linha:
 *  - sufixo "(3/10)" no fim, formato que a própria criação de parcelamento
 *    gera (`createInstallmentPurchase`);
 *  - prefixo "PARC 03/10 " (ou só "03/10 ") no início, formato comum de
 *    descrição importada de extrato.
 *
 * Conservador de propósito: se os números do texto não baterem com os da
 * própria linha (ou não houver padrão nenhum), devolve a descrição como
 * está. Estragar o título de todas as parcelas por um regex agressivo é
 * pior que mostrar o texto cru.
 */
function tituloSemParcela(description: string, atual: number, total: number): string {
  const bateNumeros = (a: string, b: string) => Number(a) === atual && Number(b) === total;

  const sufixo = description.match(/^(.*?)\s*\(\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\)\s*$/);
  if (sufixo && bateNumeros(sufixo[2], sufixo[3]) && sufixo[1].trim()) {
    return sufixo[1].trim();
  }

  const prefixo = description.match(
    /^\s*(?:parc(?:ela)?\.?\s*)?(\d{1,2})\s*\/\s*(\d{1,2})\s*[-:]?\s*(.*)$/i
  );
  if (prefixo && bateNumeros(prefixo[1], prefixo[2]) && prefixo[3].trim()) {
    return prefixo[3].trim();
  }

  return description.trim();
}

/**
 * Agrupa as parcelas de compras no cartão por `purchase_group` e devolve só
 * os parcelamentos ainda em aberto (a maior parcela já lançada dentro da
 * janela da fatura em foco é menor que o total de parcelas), indexados pelo
 * cartão.
 *
 * `cycleEndByCard` é o fim da janela da fatura em foco de cada cartão (fim do
 * ciclo quando o cartão tem fechamento/vencimento definidos; senão, quem
 * chama já resolve isso para o fim do mês-calendário visualizado, mesmo
 * fallback usado no resto da página para cartão sem ciclo).
 */
export function buildInstallmentGroups(
  rows: InstallmentRow[],
  cycleEndByCard: Record<number, string>
): Record<number, InstallmentGroup[]> {
  const porGrupo = new Map<string, InstallmentRow[]>();
  for (const r of rows) {
    if (!r.purchase_group || r.card_id == null) continue;
    const lista = porGrupo.get(r.purchase_group);
    if (lista) lista.push(r);
    else porGrupo.set(r.purchase_group, [r]);
  }

  const resultado: Record<number, InstallmentGroup[]> = {};
  for (const [purchaseGroup, parcelas] of porGrupo) {
    const cardId = parcelas[0].card_id;
    if (cardId == null) continue;

    const fimCiclo = cycleEndByCard[cardId];
    const lancadas = fimCiclo ? parcelas.filter((p) => p.occurred_on <= fimCiclo) : parcelas;
    if (lancadas.length === 0) continue;

    const atualRow = lancadas.reduce((a, b) => (b.installment_no > a.installment_no ? b : a));
    const atual = atualRow.installment_no;
    const total = atualRow.installments;
    if (atual >= total) continue; // já quitado: não é "em aberto"

    const falta = parcelas
      .filter((p) => p.installment_no > atual)
      .reduce((s, p) => s + Number(p.amount), 0);

    const grupo: InstallmentGroup = {
      purchaseGroup,
      titulo: tituloSemParcela(atualRow.description, atual, total),
      atual,
      total,
      valorParcela: Number(atualRow.amount),
      falta,
    };
    (resultado[cardId] ??= []).push(grupo);
  }

  // maior valor restante primeiro: é o que mais pesa no orçamento dos
  // próximos meses.
  for (const lista of Object.values(resultado)) {
    lista.sort((a, b) => b.falta - a.falta);
  }
  return resultado;
}
