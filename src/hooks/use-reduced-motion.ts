"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Leitura imperativa (para GSAP/efeitos fora do ciclo do React).
 * Fonte única: substitui os matchMedia espalhados pelos componentes.
 */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * true quando o usuário pediu menos movimento no sistema. Reativo
 * (acompanha a mudança da preferência sem reload). No SSR assume false;
 * o primeiro paint é coberto pela regra global de CSS no globals.css.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}
