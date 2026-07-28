"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { SPRING } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Microgestos de hover/tap (spring suave, sem bounce) num wrapper
 * reutilizável. Envolve o elemento interativo sem mudar sua API; filhos
 * server-rendered continuam server (só o wrapper é client).
 *
 * - Botões: hover 1.02 + tap 0.97 (padrão).
 * - Cards que já têm hover próprio (.card-glow): passar `hoverScale={1}`
 *   para manter só o feedback de tap e não somar dois efeitos.
 */
export function Pressable({
  children,
  className,
  hoverScale = 1.02,
  tapScale = 0.97,
}: {
  children: ReactNode;
  className?: string;
  hoverScale?: number;
  tapScale?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      whileHover={hoverScale !== 1 ? { scale: hoverScale } : undefined}
      whileTap={tapScale !== 1 ? { scale: tapScale } : undefined}
      transition={SPRING.press}
    >
      {children}
    </motion.div>
  );
}
