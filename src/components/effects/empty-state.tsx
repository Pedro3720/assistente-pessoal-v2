"use client";

import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

// Player dotLottie só entra no bundle quando um estado vazio renderiza (lazy).
const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  { ssr: false }
);

/**
 * Estado vazio com animação Lottie opcional.
 *
 * O arquivo `.lottie` vem de `public/lottie/` (asset escolhido pelo dono).
 * Enquanto o arquivo não existir (ou falhar), renderiza SÓ o texto, sem
 * reservar espaço: comportamento idêntico ao de antes, zero layout quebrado.
 * Com prefers-reduced-motion, a animação fica parada no primeiro quadro.
 */
export function EmptyState({
  lottie,
  children,
  className,
}: {
  /** caminho público do asset, ex.: "/lottie/empty-tasks.lottie" */
  lottie: string;
  /** o texto/conteúdo do estado vazio (igual ao que existia) */
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className={`flex flex-col items-center justify-center gap-1 ${className ?? ""}`}>
      {!failed && (
        <div className={loaded ? "h-28 w-28" : "h-0 w-0 overflow-hidden"} aria-hidden>
          <DotLottieReact
            src={lottie}
            loop
            autoplay={!reduce}
            dotLottieRefCallback={(instance) => {
              instance?.addEventListener("load", () => setLoaded(true));
              instance?.addEventListener("loadError", () => setFailed(true));
            }}
          />
        </div>
      )}
      {children}
    </div>
  );
}
