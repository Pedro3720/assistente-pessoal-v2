"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  ListChecks,
  Shield,
  Lightbulb,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendario", label: "Calendário", icon: Calendar },
  { href: "/financas", label: "Finanças", icon: Wallet },
  { href: "/tarefas", label: "Tarefas", icon: ListChecks },
  { href: "/senhas", label: "Senhas", icon: Shield },
  { href: "/sugestoes", label: "Sugestões", icon: Lightbulb },
];

export function Sidebar({
  userEmail,
  displayName,
  avatarUrl,
}: {
  userEmail: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="fixed left-5 top-5 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background md:hidden"
        onClick={() => setOpen(!open)}
        aria-label="Menu"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-56 transform flex-col border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl transition-transform duration-300 ease-in-out",
          "md:sticky md:top-0 md:h-screen md:z-auto md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-[72px] items-center justify-between border-b border-sidebar-border px-6">
          <span
            className="text-lg font-bold tracking-tight text-sidebar-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Assistente
          </span>
          <ThemeToggle />
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-4 py-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "font-normal text-sidebar-foreground/45 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-all",
                    isActive
                      ? "text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/35 group-hover:text-sidebar-foreground/70"
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer — perfil + sair */}
        <div className="border-t border-sidebar-border px-4 py-4">
          <Link
            href="/perfil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sidebar-accent"
            title="Editar perfil"
          >
            <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-sidebar-border bg-muted">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" width={32} height={32} className="h-8 w-8 object-cover" unoptimized />
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-sidebar-foreground">{displayName || "Perfil"}</span>
              <span className="block truncate text-xs text-sidebar-foreground/40">{userEmail}</span>
            </span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
