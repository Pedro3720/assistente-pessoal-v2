"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, LayoutGrid } from "lucide-react";
import { motion, LayoutGroup } from "motion/react";
import { CardArt } from "./card-art";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { CardWithInvoice } from "@/types/finance";

type Estado = "fan" | "grid" | "open";

/** Deslocamento e inclinação de cada posição do leque. Quatro no máximo:
 *  além disso a pilha fica alta demais e o botão de ver todos assume. */
const LEQUE = [
  { y: 0, rot: -2 },
  { y: 38, rot: 1.5 },
  { y: 76, rot: -1 },
  { y: 114, rot: 2 },
];

/** Largura fixa do cartão no leque, em px. Determina a altura da pilha
 *  junto com a proporção 1.586 (a mesma do CardArt). */
const LARGURA_LEQUE = 256;
const ALTURA_CARTAO_LEQUE = LARGURA_LEQUE / 1.586;

/** z-index base de cada posição do leque, como classes literais (não
 *  `z-[${i}]` dinâmico: o Tailwind só gera a classe que aparece como texto
 *  completo no código-fonte, um template interpolado não é encontrado pelo
 *  scanner). O de baixo (índice mais alto) já nasce na frente; o hover soma
 *  `hover:z-40`, que tem mais especificidade que qualquer z-* sem pseudo-classe
 *  e por isso vence mesmo sendo o último a ser aplicado. */
const Z_LEQUE = ["z-0", "z-10", "z-20", "z-30"];

export function CardWallet({
  cards,
  bankSlugById,
  renderDetail,
}: {
  cards: CardWithInvoice[];
  bankSlugById: Record<number, string | null>;
  /**
   * Detalhe de cada cartão, indexado por id, já pronto como ReactNode.
   *
   * Não é uma função `(card) => ReactNode`: quem monta este componente é
   * `financas/page.tsx`, um Server Component, e este arquivo é "use client".
   * React Server Components não podem passar função como prop para um
   * Client Component (só Server Action ou valor serializável, e ReactNode
   * já renderizado é serializável; função pura não é). Por isso o servidor
   * pré-renderiza o bloco de cada cartão e entrega o mapa pronto; o cliente
   * só escolhe qual mostrar pelo id do cartão ativo.
   */
  renderDetail: Record<number, React.ReactNode>;
}) {
  const [estado, setEstado] = useState<Estado>("fan");
  const [ativoId, setAtivoId] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const filaRef = useRef<HTMLDivElement>(null);
  const reduzido = useReducedMotion();

  useOutsideClick(ref, () => setEstado("fan"));

  const mola = reduzido
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 160, damping: 18, mass: 1 };

  const ativo = cards.find((c) => c.id === ativoId) ?? null;
  const noLeque = cards.slice(0, LEQUE.length);
  const restantes = cards.length - noLeque.length;

  function abrir(id: number) {
    setAtivoId(id);
    setEstado("open");
  }

  // no estado aberto, o ativo é trazido para o centro visível da fileira,
  // tanto ao abrir quanto ao trocar de cartão clicando na própria fileira
  useEffect(() => {
    if (estado !== "open" || ativoId == null) return;
    const el = filaRef.current?.querySelector<HTMLElement>(`[data-card-id="${ativoId}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [estado, ativoId]);

  if (cards.length === 0) {
    return (
      <div className="glass card-glow rounded-2xl border border-border p-5">
        <p className="text-center text-sm text-muted-foreground">Nenhum cartão cadastrado.</p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      onKeyDown={(e) => e.key === "Escape" && setEstado("fan")}
      className="glass card-glow rounded-2xl border border-border p-5"
    >
      <LayoutGroup>
        {estado === "fan" && (
          <div>
            {/* pilha: cartões absolutos dentro de uma área com altura fixa,
                calculada para caber a última posição do leque */}
            <div
              className="relative mx-auto"
              style={{
                width: LARGURA_LEQUE,
                height: LEQUE[noLeque.length - 1].y + ALTURA_CARTAO_LEQUE,
              }}
            >
              {noLeque.map((card, i) => {
                const pos = LEQUE[i];
                return (
                  <motion.button
                    key={card.id}
                    layoutId={`card-${card.id}`}
                    transition={mola}
                    aria-pressed={card.id === ativoId}
                    onClick={() => abrir(card.id)}
                    initial={false}
                    animate={{ y: pos.y, rotate: pos.rot }}
                    whileHover={reduzido ? undefined : { y: pos.y - 12 }}
                    whileFocus={reduzido ? undefined : { y: pos.y - 12 }}
                    className={`absolute inset-x-0 top-0 block text-left ${Z_LEQUE[i]} hover:z-40 focus-visible:z-40`}
                  >
                    <CardArt card={card} bankSlug={bankSlugById[card.id] ?? null} size="stack" />
                  </motion.button>
                );
              })}
            </div>

            {/* botão em fluxo normal, abaixo da pilha: nunca sobre ela.
                No protótipo esse botão ficava sobre a área do quarto
                cartão e o z-index do hover passava por cima, deixando-o
                inclicável. Aqui ele é irmão de bloco da pilha, não filho
                posicionado dentro dela. */}
            {restantes > 0 && (
              <button
                type="button"
                onClick={() => setEstado("grid")}
                className="mx-auto mt-4 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Ver todos os {cards.length} cartões
              </button>
            )}
          </div>
        )}

        {estado === "grid" && (
          <div>
            <button
              type="button"
              onClick={() => setEstado("fan")}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Voltar ao leque
            </button>

            <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-4">
              {cards.map((card) => (
                <motion.button
                  key={card.id}
                  layoutId={`card-${card.id}`}
                  transition={mola}
                  aria-pressed={card.id === ativoId}
                  onClick={() => abrir(card.id)}
                  className="block w-full text-left"
                >
                  <CardArt card={card} bankSlug={bankSlugById[card.id] ?? null} size="stack" />
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {estado === "open" && ativo && (
          <div>
            <motion.button
              layoutId={`card-${ativo.id}`}
              transition={mola}
              aria-pressed
              onClick={() => abrir(ativo.id)}
              className="mx-auto block w-full max-w-[280px] text-left"
            >
              <CardArt card={ativo} bankSlug={bankSlugById[ativo.id] ?? null} size="hero" />
            </motion.button>

            {/* fileira sem sobreposição: cartões inteiros, lado a lado,
                overflow-x com overscroll contido para não puxar o scroll
                vertical da página no app instalado (Capacitor) */}
            <div
              ref={filaRef}
              className="mt-4 flex gap-2 overflow-x-auto pb-1"
              style={{ overscrollBehaviorX: "contain" }}
            >
              {cards.map((card) => (
                <motion.button
                  key={card.id}
                  data-card-id={card.id}
                  layoutId={`card-${card.id}`}
                  transition={mola}
                  aria-pressed={card.id === ativo.id}
                  onClick={() => abrir(card.id)}
                  className={`block w-16 shrink-0 rounded-lg text-left ${
                    card.id === ativo.id ? "outline outline-2 outline-offset-2 outline-primary" : ""
                  }`}
                >
                  <CardArt card={card} bankSlug={bankSlugById[card.id] ?? null} size="mini" />
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </LayoutGroup>

      {estado === "open" && ativo ? <div className="mt-4">{renderDetail[ativo.id]}</div> : null}
    </div>
  );
}
