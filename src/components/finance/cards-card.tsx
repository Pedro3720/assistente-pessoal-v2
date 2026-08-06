import { Link } from "next-view-transitions";
import { Meter } from "@/components/ui/meter";
import { Money } from "@/components/ui/money";
import { formatBRL } from "@/lib/money";
import { CardArt } from "./card-art";
import type { CardWithInvoice } from "@/types/finance";

/**
 * Cartão de crédito responde outra pergunta: quanto devo (fatura) e quanto
 * sobra de limite. Por isso vive separado das contas, e não soma junto ao
 * total delas no rail.
 *
 * `bankSlugById` e `offset` vêm prontos do servidor (financas/page.tsx), que
 * já monta o mapa de slugs e conhece o mês em foco. O componente só consome:
 * recalcular o slug aqui criaria uma segunda regra de resolução de marca, e
 * montar a URL sem o offset perderia o mês ao clicar.
 */
export function CardsCard({
  cards,
  bankSlugById,
  offset = 0,
}: {
  cards: CardWithInvoice[];
  bankSlugById: Record<number, string | null>;
  offset?: number;
}) {
  const href = `/financas?aba=cartoes${offset ? `&m=${offset}` : ""}`;

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
            <Link
              key={card.id}
              href={href}
              className="block border-t border-border py-3 first:border-t-0 first:pt-0"
            >
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0">
                  <CardArt
                    card={card}
                    bankSlug={card.bank_id != null ? bankSlugById[card.bank_id] ?? null : null}
                    size="mini"
                  />
                </span>
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
            </Link>
          );
        })
      )}
    </div>
  );
}
