"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Modal genérico renderizado via portal no <body>, para escapar de ancestrais
 * com transform/backdrop-filter (Reveal/glass) que prendem `position: fixed`.
 */
export function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-popover p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
