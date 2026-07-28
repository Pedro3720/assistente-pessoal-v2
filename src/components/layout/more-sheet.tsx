"use client";

import { useEffect, useState, type ElementType } from "react";
import { useTransitionRouter } from "next-view-transitions";
import { ListChecks, Shield, Lightbulb, Cog, User, LogOut, X } from "lucide-react";
import { Drawer } from "vaul";
import { logout } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";

type Item = { label: string; href: string; icon: ElementType };

/**
 * Folha "Mais" da barra inferior (bottom sheet via vaul, igual à de ações
 * rápidas): gesto de arrastar para fechar, Esc/backdrop fecham, `onClose`
 * chamado ao fim da saída.
 */
export function MoreSheet({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
  const router = useTransitionRouter();
  // nasce fechada e abre no mount, garantindo a animação de entrada
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(true), []);

  const items: Item[] = [
    { label: "Tarefas", href: "/tarefas", icon: ListChecks },
    { label: "Senhas", href: "/senhas", icon: Shield },
    { label: "Sugestões", href: "/sugestoes", icon: Lightbulb },
    ...(isAdmin ? [{ label: "Admin", href: "/admin/sugestoes", icon: Cog }] : []),
    { label: "Perfil", href: "/perfil", icon: User },
  ];

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
          data-testid="more-sheet"
          className="fixed inset-x-0 bottom-0 z-[100] rounded-t-3xl border-t border-border bg-popover p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl outline-none"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
          <div className="mb-2 flex items-center justify-between">
            <Drawer.Title className="text-sm font-semibold">Mais</Drawer.Title>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1">
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <button
                  key={it.href}
                  onClick={() => {
                    onClose();
                    router.push(it.href);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-accent"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  {it.label}
                </button>
              );
            })}
          </div>

          <div className="my-2 border-t border-border" />

          <div className="flex items-center justify-between rounded-xl px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">Tema</span>
            <ThemeToggle />
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-500 hover:bg-accent"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                <LogOut className="h-4 w-4" />
              </span>
              Sair
            </button>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
