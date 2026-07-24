"use client";

import { useEffect, useState, type ElementType } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ListChecks, Shield, Lightbulb, Cog, User, LogOut, X } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";

type Item = { label: string; href: string; icon: ElementType };

export function MoreSheet({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
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

  const items: Item[] = [
    { label: "Tarefas", href: "/tarefas", icon: ListChecks },
    { label: "Senhas", href: "/senhas", icon: Shield },
    { label: "Sugestões", href: "/sugestoes", icon: Lightbulb },
    ...(isAdmin ? [{ label: "Admin", href: "/admin/sugestoes", icon: Cog }] : []),
    { label: "Perfil", href: "/perfil", icon: User },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        data-testid="more-sheet"
        className="w-full rounded-t-3xl border-t border-border bg-popover p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Mais</p>
          <button
            onClick={onClose}
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
      </div>
    </div>,
    document.body
  );
}
