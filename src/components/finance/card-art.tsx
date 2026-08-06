import Image from "next/image";
import { issuerBySlug, issuerAsset } from "@/lib/finance/issuers";
import { cn } from "@/lib/utils";
import type { CreditCard } from "@/types/finance";

/** Tons por variante, aplicados sobre a cor de marca do emissor. */
const TIERS: Record<string, { claro: number; escuro: number; texto: "light" | "dark" }> = {
  standard: { claro: 18, escuro: -22, texto: "light" },
  gold: { claro: 34, escuro: -6, texto: "dark" },
  platinum: { claro: 10, escuro: -34, texto: "light" },
  black: { claro: -55, escuro: -80, texto: "light" },
};

/** Clareia (positivo) ou escurece (negativo) um hex em pontos percentuais. */
function shift(hex: string, pct: number): string {
  const n = hex.replace("#", "");
  const v = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  const out = v.map((c) => {
    const alvo = pct >= 0 ? 255 : 0;
    return Math.round(c + (alvo - c) * (Math.abs(pct) / 100));
  });
  return "#" + out.map((c) => c.toString(16).padStart(2, "0")).join("");
}

const SIZES = {
  stack: { pad: "p-4", selo: 32, num: "text-[13px]", radius: "rounded-2xl" },
  hero: { pad: "p-5", selo: 38, num: "text-[15px]", radius: "rounded-2xl" },
  mini: { pad: "p-2", selo: 22, num: "hidden", radius: "rounded-lg" },
} as const;

/** Bandeiras com SVG disponível em public/networks/. O spec prevê um selo por
 *  bandeira (Visa, Mastercard, Elo, Amex, Hipercard), mas os arquivos ainda
 *  não foram fornecidos pelo dono: a pasta public/networks/ não existe nesta
 *  onda. A lista começa vazia de propósito, não é código morto, e enquanto
 *  estiver vazia toda bandeira sai como rótulo de texto (comportamento
 *  correto). Acrescente o slug aqui quando o SVG correspondente chegar. */
const NETWORK_SVG: string[] = [];

/**
 * Arte do cartão, composta pelo app a partir do emissor.
 *
 * Não replica o cartão físico: usa a cor de marca do banco, o selo do emissor
 * e a variante para dar o tom. Um Inter Black e um Inter Gold convivem sem
 * exigir arte por produto.
 */
export function CardArt({
  card,
  bankSlug,
  size = "stack",
  className,
}: {
  card: CreditCard;
  /** slug do banco emissor; vem de banks.icon da conta vinculada */
  bankSlug: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const issuer = issuerBySlug(bankSlug);
  const base = issuer?.cor ?? card.color ?? "#3b82f6";
  const tier = TIERS[card.tier ?? "standard"] ?? TIERS.standard;
  const s = SIZES[size];
  const claro = tier.texto === "light";
  const temLogoBandeira = !!card.network && NETWORK_SVG.includes(card.network);

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden shadow-lg",
        s.radius,
        s.pad,
        claro ? "text-white" : "text-[#12151b]",
        className
      )}
      style={{
        aspectRatio: "1.586",
        background: `linear-gradient(135deg, ${shift(base, tier.claro)}, ${base} 46%, ${shift(base, tier.escuro)})`,
      }}
    >
      {/* brilho diagonal, em gradiente e sem imagem, para não pesar o bundle */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, rgba(255,255,255,.24) 0%, rgba(255,255,255,.05) 38%, rgba(0,0,0,.10) 70%, rgba(0,0,0,.24) 100%)",
        }}
      />

      <div className="relative flex items-start justify-between">
        {issuer ? (
          <span
            className="shrink-0 overflow-hidden rounded-full shadow"
            style={{ width: s.selo, height: s.selo }}
          >
            <Image
              src={issuerAsset(issuer)}
              alt={issuer.nome}
              width={s.selo}
              height={s.selo}
              className="h-full w-full"
              unoptimized
            />
          </span>
        ) : (
          <span className="text-xs font-bold tracking-tight">{card.name}</span>
        )}
        {card.tier ? (
          <span className="text-[8px] font-semibold uppercase tracking-[0.16em] opacity-85">
            {card.tier}
          </span>
        ) : null}
      </div>

      <div className={cn("num relative mt-auto tracking-[0.15em] opacity-95", s.num)}>
        {card.last4 ? `•••• ${card.last4}` : ""}
      </div>

      {size !== "mini" ? (
        <div className="relative mt-2 flex items-end justify-between gap-2">
          <span className="min-w-0">
            {card.holder ? (
              <span className="block truncate text-[9px] uppercase tracking-[0.12em] opacity-90">
                {card.holder}
              </span>
            ) : null}
          </span>
          {card.network ? (
            temLogoBandeira ? (
              <Image
                src={`/networks/${card.network}.svg`}
                alt={card.network}
                width={28}
                height={18}
                className="h-[18px] w-auto shrink-0 object-contain"
                unoptimized
              />
            ) : (
              <span className="shrink-0 text-[11px] font-bold italic opacity-95">
                {card.network.toUpperCase()}
              </span>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
