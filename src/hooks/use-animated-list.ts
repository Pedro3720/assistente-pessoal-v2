"use client";

import { useEffect } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useReducedMotion } from "./use-reduced-motion";
import { DUR, EASE_CSS } from "@/lib/motion";

/**
 * Anima adicionar/remover/reordenar itens de uma lista (AutoAnimate),
 * no tom da direção de design e respeitando prefers-reduced-motion.
 *
 * Uso: `const listRef = useAnimatedList();` e `<div ref={listRef}>` no
 * PAI direto dos itens.
 *
 * NÃO usar em listas sortable do @dnd-kit (ex.: tasks-view): os dois
 * brigam pelos transforms. Nessas, animar pelo próprio dnd-kit.
 */
export function useAnimatedList<T extends HTMLElement = HTMLDivElement>() {
  const reduce = useReducedMotion();
  const [ref, enable] = useAutoAnimate<T>({
    duration: DUR.enter * 1000,
    easing: EASE_CSS.out,
  });
  useEffect(() => {
    enable(!reduce);
  }, [reduce, enable]);
  return ref;
}
