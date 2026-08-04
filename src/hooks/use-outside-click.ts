"use client";

import { useEffect, type RefObject } from "react";

/**
 * Chama `onOutside` quando o clique acontece fora do elemento.
 * Usa mousedown e touchstart para responder antes do clique completar,
 * que é o que evita o fechamento parecer atrasado no celular.
 */
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void
) {
  useEffect(() => {
    function handle(e: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      onOutside();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [ref, onOutside]);
}
