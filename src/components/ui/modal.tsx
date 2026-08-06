"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { fade, fadeScale } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Modal genérico renderizado via portal no <body>, para escapar de ancestrais
 * com transform/backdrop-filter (Reveal/glass) que prendem `position: fixed`.
 *
 * Abre e fecha animado (fade + scale via AnimatePresence) mantendo a API de
 * sempre: o pai renderiza condicionalmente e passa `onClose`. Fechamentos do
 * usuário (X, backdrop, Esc) tocam a saída antes de avisar o pai; se o pai
 * desmontar direto (ex.: após salvar), fecha sem animação, sem quebrar nada.
 */
export function Modal({
  onClose,
  title,
  children,
  size = "md",
}: {
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "md" | "full";
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);
  const reduce = useReducedMotion();

  // fecha animado: some da tela e só chama onClose no fim da saída
  const close = () => (reduce ? onClose() : setOpen(false));
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence initial={!reduce} onExitComplete={onClose}>
      {open && (
        <motion.div
          variants={fade}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          data-portal-root
          onClick={close}
        >
          <motion.div
            variants={fadeScale}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`overflow-y-auto rounded-2xl border border-border bg-popover p-6 shadow-xl ${
              size === "full" ? "max-h-[92vh] w-[95vw] max-w-4xl" : "max-h-[90vh] w-full max-w-md"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {title !== undefined && (
              <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button onClick={close} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
