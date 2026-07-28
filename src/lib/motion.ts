/**
 * Sistema central de animação do Zênite (Onda 13, Fase 0).
 * Direção de movimento: "calmo, físico e discreto" (fintech premium).
 *
 * Fonte única de duração/curvas/variantes para os dois runtimes:
 * - GSAP (useGSAP): timelines, scroll e hero (Reveal/CountUp já usam).
 * - motion (Fase 1+): entrada/saída de componentes (AnimatePresence),
 *   animação de layout e microgestos.
 *
 * Regra: todo consumidor deve respeitar prefers-reduced-motion
 * (hook/helper em src/hooks/use-reduced-motion.ts; animações CSS são
 * cobertas pela regra global no globals.css).
 */

/** Durações em segundos (GSAP e motion usam segundos). */
export const DUR = {
  /** hover/tap: resposta imediata */
  micro: 0.16,
  /** entrada de componentes */
  enter: 0.28,
  /** saída mais curta que a entrada (~65%) */
  exit: 0.18,
  /** transição de rota */
  page: 0.35,
} as const;

/** Curvas cubic-bezier (mesma família do .card-glow no globals.css). */
export const EASE = {
  out: [0.2, 0.8, 0.2, 1] as [number, number, number, number],
  in: [0.4, 0, 1, 1] as [number, number, number, number],
  inOut: [0.6, 0, 0.2, 1] as [number, number, number, number],
};

/** Equivalentes para GSAP (strings de ease). */
export const GSAP_EASE = {
  out: "power3.out",
  inOut: "power2.inOut",
} as const;

/** Equivalentes em string CSS (AutoAnimate, transitions inline). */
export const EASE_CSS = {
  out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
} as const;

/** Springs para microgestos (motion). Suaves, sem bounce exagerado. */
export const SPRING = {
  /** tap/hover de botões e cards */
  press: { type: "spring", stiffness: 500, damping: 32, mass: 0.8 },
  /** layout e reordenação */
  gentle: { type: "spring", stiffness: 300, damping: 30 },
} as const;

/* ── Variantes (motion) ──────────────────────────────────────────────
   Objetos puros: compilam sem a lib instalada; na Fase 1 entram direto
   em <motion.div variants={...}>. Estados: hidden / visible / exit. */

export const fade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.enter, ease: EASE.out } },
  exit: { opacity: 0, transition: { duration: DUR.exit, ease: EASE.in } },
};

/** Modal/popover: fade + scale a partir de 96% (sensação de brotar do gatilho). */
export const fadeScale = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: DUR.enter, ease: EASE.out } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: DUR.exit, ease: EASE.in } },
};

/** Folhas/bottom sheets: sobem de baixo. */
export const slideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: DUR.enter, ease: EASE.out } },
  exit: { opacity: 0, y: 16, transition: { duration: DUR.exit, ease: EASE.in } },
};

/** Item de lista (usar dentro de staggerContainer). */
export const listItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: DUR.enter, ease: EASE.out } },
  exit: { opacity: 0, transition: { duration: DUR.exit, ease: EASE.in } },
};

/** Container que cascateia os filhos (30-60ms por item). */
export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

/** Microgestos de hover/tap (whileHover/whileTap). */
export const pressable = {
  hover: { scale: 1.02 },
  tap: { scale: 0.97 },
};
