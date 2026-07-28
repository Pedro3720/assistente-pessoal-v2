"use client";

import { useEffect, useState } from "react";
import { useTransitionRouter } from "next-view-transitions";
import { Wallet, ListChecks, Calendar, X } from "lucide-react";
import { Drawer } from "vaul";
import { Pressable } from "@/components/effects/pressable";

const ACTIONS = [
  { label: "Nova transação", href: "/financas?new=1", icon: Wallet },
  { label: "Nova tarefa", href: "/tarefas?new=1", icon: ListChecks },
  { label: "Novo evento", href: "/calendario?new=1", icon: Calendar },
];

/**
 * Folha de ações rápidas do "+" (bottom sheet via vaul): sobe animada,
 * arrasta para baixo para fechar (gesto nativo, melhor no app Capacitor),
 * Esc/backdrop fecham. A API segue a de sempre: o pai renderiza
 * condicionalmente e passa `onClose` (chamado ao fim da saída).
 */
export function QuickActions({ onClose }: { onClose: () => void }) {
  const router = useTransitionRouter();
  // nasce fechada e abre no mount, garantindo a animação de entrada
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(true), []);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={setOpen}
      onAnimationEnd={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
        <Drawer.Content
          aria-describedby={undefined}
          data-testid="quick-actions"
          className="fixed inset-x-0 bottom-0 z-[100] rounded-t-3xl border-t border-border bg-popover p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl outline-none"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
          <div className="mb-2 flex items-center justify-between">
            <Drawer.Title className="text-sm font-semibold">Criar</Drawer.Title>
            <button
              onClick={() => setOpen(false)}
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
                <Pressable key={a.href} hoverScale={1}>
                  <button
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
                </Pressable>
              );
            })}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
