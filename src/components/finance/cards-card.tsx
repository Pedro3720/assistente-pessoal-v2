import { BrandAvatar } from "@/components/ui/brand-avatar";
import { Meter } from "@/components/ui/meter";
import { Money } from "@/components/ui/money";
import { formatBRL } from "@/lib/money";
import type { CardWithInvoice } from "@/types/finance";

/**
 * Cartão de crédito responde outra pergunta: quanto devo (fatura) e quanto
 * sobra de limite. Por isso vive separado das contas, e não soma junto ao
 * total delas no rail.
 */
export function CardsCard({ cards }: { cards: CardWithInvoice[] }) {
  return (
    <div className="rounded-lg bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Cartões</h3>
        <span className="text-[11px] text-subtle-foreground">Fatura do mês</span>
      </div>

      {cards.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum cartão cadastrado.</p>
      ) : (
        cards.map((card) => {
          const pct = card.credit_limit > 0 ? (card.utilizado_total / card.credit_limit) * 100 : 0;
          return (
            <div key={card.id} className="border-t border-border py-3 first:border-t-0 first:pt-0">
              <div className="flex items-center gap-3">
                <BrandAvatar name={card.name} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{card.name}</span>
                  <span className="block text-[11px] text-subtle-foreground">
                    {card.closing_day && card.due_day
                      ? `Fecha dia ${card.closing_day}, vence dia ${card.due_day}`
                      : "Sem datas definidas"}
                  </span>
                </span>
                <Money value={card.fatura_mes} className="text-sm font-semibold" />
              </div>
              {card.credit_limit > 0 && (
                <Meter
                  className="mt-2"
                  value={card.utilizado_total}
                  max={card.credit_limit}
                  leftLabel={`${pct.toFixed(0)}% do limite`}
                  rightLabel={`${formatBRL(card.disponivel)} disponível`}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
