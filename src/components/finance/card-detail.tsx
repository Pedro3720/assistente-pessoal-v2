import { Meter } from "@/components/ui/meter";
import { Money } from "@/components/ui/money";
import { formatBRL } from "@/lib/money";
import { monthLabel, todayISO } from "@/lib/dates";
import { bestPurchaseDay } from "@/lib/finance/billing-cycle";
import { cn } from "@/lib/utils";
import type { CardWithInvoice, Transaction } from "@/types/finance";

type Estado = "aberta" | "fechada" | "paga";

const SELO: Record<Estado, string> = {
  aberta: "bg-positive/15 text-positive",
  paga: "bg-muted text-muted-foreground",
  fechada: "bg-negative/15 text-negative",
};

const ROTULO: Record<Estado, string> = {
  aberta: "Aberta",
  paga: "Paga",
  fechada: "Fechada",
};

/** Último dia do mês (mês 1-based), para travar o vencimento num mês curto.
 *  Duplicado de billing-cycle.ts: lastDayOfMonth/iso são privados lá (não
 *  exportados, servem só ao cálculo da janela) e o vencimento em si nunca
 *  chegou a ser calculado ali, só o fechamento. */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "DD/MM" a partir de um "YYYY-MM-DD". O ano fica de fora: a fatura em foco
 *  já deixa o ano implícito pelo mês selecionado na página. */
function ddmm(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/**
 * Estado da fatura, sem campo novo no banco:
 *
 * - Aberta: sem ciclo definido (não dá pra saber se fechou, é o menos errado
 *   dos três) ou hoje é anterior ao fechamento.
 * - Paga: existe ao menos um pagamento (`is_card_payment`) entre o fechamento
 *   e o vencimento, somando o valor da fatura ou mais.
 * - Fechada: o resto. Pagamento parcial mantém fechada; `pago` sai maior que
 *   zero e quem chama mostra quanto falta.
 *
 * `payments` já vem filtrado (is_card_payment e card_id deste cartão) por
 * quem monta o componente: Server Component lê dado, este arquivo só decide.
 */
function invoiceStatus(
  card: CardWithInvoice,
  year: number,
  month: number,
  payments: Transaction[]
): { estado: Estado; pago: number; vencimento: string | null } {
  const { cycle_end: cycleEnd, due_day: dueDay } = card;
  if (!cycleEnd || !dueDay) {
    return { estado: "aberta", pago: 0, vencimento: null };
  }

  const vencimento = isoDate(year, month, Math.min(dueDay, lastDayOfMonth(year, month)));
  const hoje = todayISO();

  if (hoje < cycleEnd) {
    return { estado: "aberta", pago: 0, vencimento };
  }

  const pagamentosNoCiclo = payments.filter(
    (t) => t.occurred_on >= cycleEnd && t.occurred_on <= vencimento
  );
  const pago = pagamentosNoCiclo.reduce((s, t) => s + Number(t.amount), 0);

  if (pagamentosNoCiclo.length > 0 && pago >= card.fatura_mes) {
    return { estado: "paga", pago, vencimento };
  }
  return { estado: "fechada", pago, vencimento };
}

/**
 * Cabeçalho do detalhe do cartão aberto na carteira: valor da fatura,
 * janela do ciclo, estado, limite e as três datas de referência. `children`
 * recebe os blocos seguintes (movimentações, parcelamentos, projeção,
 * gerenciar), que entram em tasks futuras da Onda 19.
 */
export function CardDetail({
  card,
  year,
  month,
  payments,
  children,
}: {
  card: CardWithInvoice;
  /** ano e mês visualizados na página: definem a fatura em foco e o vencimento. */
  year: number;
  month: number;
  /** transações de pagamento (is_card_payment) deste cartão, já filtradas. */
  payments: Transaction[];
  children?: React.ReactNode;
}) {
  const { estado, pago, vencimento } = invoiceStatus(card, year, month, payments);
  const falta = card.fatura_mes - pago;
  const pctLimite = card.credit_limit > 0 ? (card.utilizado_total / card.credit_limit) * 100 : 0;

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-border p-4">
      <div>
        <p className="text-xs text-muted-foreground">Fatura de {monthLabel(year, month)}</p>
        <Money value={card.fatura_mes} className="text-2xl font-bold leading-tight" />
      </div>

      <p className="text-xs text-muted-foreground">
        Fecha {card.cycle_end ? ddmm(card.cycle_end) : "-"}, vence{" "}
        {vencimento ? ddmm(vencimento) : "-"}
      </p>

      <div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
            SELO[estado]
          )}
        >
          {ROTULO[estado]}
        </span>
        {estado === "fechada" && pago > 0 && falta > 0 ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Falta pagar <Money value={falta} className="font-medium" />
          </p>
        ) : null}
      </div>

      {card.credit_limit > 0 ? (
        <Meter
          value={card.utilizado_total}
          max={card.credit_limit}
          leftLabel={`${pctLimite.toFixed(0)}% do limite`}
          rightLabel={`${formatBRL(card.disponivel)} disponível`}
        />
      ) : null}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[11px] text-muted-foreground">Melhor dia de compra</p>
          <p className="num mt-0.5 text-sm font-semibold">
            {card.closing_day ? bestPurchaseDay(card.closing_day) : "-"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Fechamento</p>
          <p className="num mt-0.5 text-sm font-semibold">{card.closing_day ?? "-"}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Vencimento</p>
          <p className="num mt-0.5 text-sm font-semibold">{card.due_day ?? "-"}</p>
        </div>
      </div>

      {children}
    </div>
  );
}
