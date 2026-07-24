"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ElementType } from "react";
import { LayoutDashboard, Wallet, ListChecks, Calendar, Plus } from "lucide-react";
import { QuickActions } from "./quick-actions";

const TABS = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/financas", label: "Finanças", icon: Wallet },
  { href: "/tarefas", label: "Tarefas", icon: ListChecks },
  { href: "/calendario", label: "Agenda", icon: Calendar },
];

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
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.6} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [quickOpen, setQuickOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <nav
        aria-label="Navegação principal"
        data-testid="bottom-nav"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="flex h-16 items-center justify-around px-2">
          {TABS.slice(0, 2).map((t) => (
            <Tab key={t.href} href={t.href} label={t.label} icon={t.icon} active={isActive(t.href)} />
          ))}
          <button
            onClick={() => setQuickOpen(true)}
            aria-label="Ações rápidas"
            className="-mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          >
            <Plus className="h-6 w-6" />
          </button>
          {TABS.slice(2).map((t) => (
            <Tab key={t.href} href={t.href} label={t.label} icon={t.icon} active={isActive(t.href)} />
          ))}
        </div>
      </nav>
      {quickOpen && <QuickActions onClose={() => setQuickOpen(false)} />}
    </>
  );
}
