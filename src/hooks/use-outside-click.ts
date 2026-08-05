"use client";

import { useEffect, type RefObject } from "react";

/**
 * Chama `onOutside` quando o clique acontece fora do elemento.
 * Usa mousedown e touchstart para responder antes do clique completar,
 * que é o que evita o fechamento parecer atrasado no celular.
 *
 * Ignora cliques dentro de um `Modal` (marcado com `data-modal-root`): o
 * modal é renderizado via portal direto em `document.body` (para escapar de
 * ancestrais com transform/backdrop-filter), então fica fora da árvore do
 * elemento observado mesmo estando visualmente "dentro" dele. Sem essa
 * checagem, abrir um formulário em modal a partir de um componente com esse
 * hook (ex.: editar cartão de dentro da carteira) fecharia o componente no
 * primeiro clique dentro do próprio modal.
 */
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void
) {
  useEffect(() => {
    function handle(e: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      if ((e.target as HTMLElement)?.closest?.("[data-modal-root]")) return;
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
