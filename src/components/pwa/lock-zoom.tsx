"use client";

import { useEffect } from "react";

/**
 * Bloqueia o pinch-zoom no iOS (eventos `gesture*`, específicos do Safari), reforçando
 * o `maximum-scale=1` do viewport. O iOS às vezes ignora o meta em PWA instalado, então
 * este bloqueio em JS garante que o app não fique preso em zoom. Não afeta scroll nem toque.
 * (O double-tap-to-zoom é tratado por `touch-action: manipulation` no body, em globals.css.)
 */
export function LockZoom() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", prevent);
    document.addEventListener("gesturechange", prevent);
    document.addEventListener("gestureend", prevent);
    return () => {
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("gesturechange", prevent);
      document.removeEventListener("gestureend", prevent);
    };
  }, []);
  return null;
}
