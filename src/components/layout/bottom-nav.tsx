"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ElementType } from "react";
import { LayoutDashboard, Wallet, Calendar, Plus, Menu } from "lucide-react";
import { QuickActions } from "./quick-actions";
import { MoreSheet } from "./more-sheet";

const LEFT_TABS = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/financas", label: "Finanças", icon: Wallet },
];
// Agenda fica à direita do botão central; "Mais" leva o resto (Tarefas, Senhas, etc.).
const AGENDA = { href: "/calendario", label: "Agenda", icon: Calendar };
// rotas que ficam dentro da folha "Mais" (para destacar o botão quando ativas)
const MORE_ROUTES = ["/tarefas", "/senhas", "/sugestoes", "/admin", "/perfil"];

function Tab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.6} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [quickOpen, setQuickOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const moreActive = MORE_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <>
      <nav
        aria-label="Navegação principal"
        data-testid="bottom-nav"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="flex h-16 items-center justify-around px-2">
          {LEFT_TABS.map((t) => (
            <Tab key={t.href} href={t.href} label={t.label} icon={t.icon} active={isActive(t.href)} />
          ))}
          <button
            onClick={() => setQuickOpen(true)}
            aria-label="Ações rápidas"
            className="-mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          >
            <Plus className="h-6 w-6" />
          </button>
          <Tab href={AGENDA.href} label={AGENDA.label} icon={AGENDA.icon} active={isActive(AGENDA.href)} />
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="Mais"
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              moreActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Menu className="h-5 w-5" strokeWidth={moreActive ? 2.2 : 1.6} />
            <span className="truncate">Mais</span>
          </button>
        </div>
      </nav>
      {quickOpen && <QuickActions onClose={() => setQuickOpen(false)} />}
      {moreOpen && <MoreSheet isAdmin={isAdmin} onClose={() => setMoreOpen(false)} />}
    </>
  );
}
