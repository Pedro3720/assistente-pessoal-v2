"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Anima a entrada de um bloco quando ele entra na viewport.
 *
 * Usa IntersectionObserver (root: null) em vez de ScrollTrigger: o
 * ScrollTrigger observa por padrão o scroll da `window`, mas no desktop
 * quem rola é o painel interno do AppFrame (md:overflow-y-auto), não a
 * window. IntersectionObserver com root: null compara sempre com a
 * viewport e respeita o recorte de qualquer ancestral com overflow, então
 * funciona tanto no desktop (scroll dentro do painel) quanto no mobile
 * (scroll da página).
 */
export function Reveal({
  children,
  className,
  y = 22,
  delay = 0,
  stagger = false,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  stagger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const targets: gsap.TweenTarget = stagger ? Array.from(node.children) : node;

    if (prefersReducedMotion()) {
      // clearProps aqui pelo mesmo motivo do tween abaixo: sem ele o elemento
      // fica com transform de identidade e vira bloco de contenção.
      gsap.set(targets, { opacity: 1, y: 0, clearProps: "transform" });
      return;
    }

    // Estado inicial (equivalente ao que o gsap.from aplicava de imediato).
    gsap.set(targets, { opacity: 0, y });

    let done = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (done) return;
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        done = true;
        gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: "power3.out",
          delay,
          stagger: stagger ? 0.09 : 0,
          // Sem isto o GSAP deixa `transform: translate(0px, 0px)` inline ao
          // terminar. Transform de identidade ainda é transform: ele cria um
          // bloco de contenção e um sistema de coordenadas novo, e isso quebra
          // a projeção de layout do `motion` (layoutId mede posição de tela
          // com getBoundingClientRect). Foi o que impediu a animação do leque
          // de cartões de acontecer, já que a carteira vive dentro de um
          // Reveal. Vale para qualquer uso futuro de motion aqui dentro.
          clearProps: "transform",
        });
        observer.disconnect();
      },
      // Aproxima o antigo start: "top 88%" do ScrollTrigger: dispara quando
      // o elemento entra nos 88% superiores da viewport (root encolhido
      // 12% na base), animando uma vez só.
      { root: null, threshold: 0, rootMargin: "0px 0px -12% 0px" }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      gsap.killTweensOf(targets);
    };
  }, [y, delay, stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
