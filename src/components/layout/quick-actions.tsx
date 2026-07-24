"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Wallet, ListChecks, Calendar, X } from "lucide-react";

const ACTIONS = [
  { label: "Nova transação", href: "/financas?new=1", icon: Wallet },
  { label: "Nova tarefa", href: "/tarefas?new=1", icon: ListChecks },
  { label: "Novo evento", href: "/calendario?new=1", icon: Calendar },
];

export function QuickActions({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        data-testid="quick-actions"
        className="w-full rounded-t-3xl border-t border-border bg-popover p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Criar</p>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-1">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.href}
                onClick={() => {
                  onClose();
                  router.push(a.href);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-accent"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
