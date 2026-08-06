"use client";

import { useEffect, type RefObject } from "react";

/**
 * Chama `onOutside` quando o clique acontece fora do elemento.
 * Usa mousedown e touchstart para responder antes do clique completar,
 * que é o que evita o fechamento parecer atrasado no celular.
 *
 * Ignora cliques dentro de qualquer portal do projeto (marcado com
 * `data-portal-root`): modal, painel do SelectMenu, painel do IconPicker e o
 * modal de importação são renderizados via portal direto em `document.body`
 * (para escapar de ancestrais com transform/backdrop-filter), então ficam fora
 * da árvore do elemento observado mesmo estando visualmente "dentro" dele. Sem
 * essa checagem, abrir um formulário em modal ou um seletor a partir de um
 * componente com esse hook (ex.: a carteira de cartões) fecharia o componente
 * no primeiro clique dentro do portal, e o clique se perderia junto: o
 * mousedown desmonta o painel antes de o onClick da opção chegar a disparar.
 *
 * Marcador novo em portal novo: quem usar `createPortal` precisa marcar a raiz
 * com `data-portal-root`, senão volta a cair nesta armadilha.
 */
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void
) {
  useEffect(() => {
    function handle(e: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      if ((e.target as HTMLElement)?.closest?.("[data-portal-root]")) return;
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
