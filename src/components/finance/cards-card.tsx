import { Meter } from "@/components/ui/meter";
import { Money } from "@/components/ui/money";
import { formatBRL } from "@/lib/money";
import type { CardWithInvoice } from "@/types/finance";

/**
 * Calcula a luminância relativa WCAG de uma cor hex.
 * Retorna um valor de 0 (preto) a 1 (branco).
 */
function getLuminance(hexColor: string): number {
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return 0.5; // fallback seguro

  try {
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    // Correção de gama WCAG
    const lum = (value: number) =>
      value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);

    return 0.2126 * lum(r) + 0.7152 * lum(g) + 0.0722 * lum(b);
  } catch {
    return 0.5; // fallback seguro em caso de erro
  }
}

/**
 * O cartão não tem campo de ícone (só `color`, escolhida pela própria pessoa
 * ao criar ou editar o cartão no formulário do `CardForm`). Em vez do
 * BrandAvatar, que cai numa inicial com tom cinza calculado por hash do nome
 * (BRANDS nasce vazio de propósito em lib/finance/brands.ts), usamos a cor
 * real do cartão: é identidade que já existe e o `CardArt` já mostra na
 * carteira de cartões.
 */
function CardAvatar({ name, color, size = 28 }: { name: string; color: string; size?: number }) {
  const word = name.trim().split(/\s+/)[0] ?? "";
  const initials = word.slice(0, 2).toUpperCase() || "?";

  // Escolhe a cor do texto baseado na luminância do fundo
  const luminance = getLuminance(color);
  const textColor = luminance > 0.3 ? "#1c2430" : "#ffffff";

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        color: textColor,
        fontSize: Math.round(size * 0.36)
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

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
                <CardAvatar name={card.name} color={card.color} size={28} />
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
