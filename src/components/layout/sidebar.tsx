"use client";

import { Link } from "next-view-transitions";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  ListChecks,
  Shield,
  Lightbulb,
  LogOut,
  Cog,
  PanelLeftClose,
  PanelLeftOpen,
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

/**
 * Navegação do DESKTOP (`hidden md:flex`). No celular, a navegação é a barra
 * inferior (`components/layout/bottom-nav.tsx`).
 */
export function Sidebar({
  userEmail,
  displayName,
  avatarUrl,
  isAdmin = false,
}: {
  userEmail: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Preferência de sidebar recolhida, persiste entre visitas.
  useEffect(() => {
    if (localStorage.getItem("sidebar-collapsed") === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  const items = isAdmin
    ? [...navItems, { href: "/admin/sugestoes", label: "Admin", icon: Cog }]
    : navItems;

  const hideLabel = collapsed ? "md:hidden" : "";

  return (
    <aside
      className={cn(
        "hidden w-56 flex-col border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl transition-all duration-300 ease-in-out",
        "md:sticky md:top-0 md:flex md:h-screen",
        collapsed && "md:w-16"
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-[72px] items-center justify-between gap-2 border-b border-sidebar-border px-4",
          collapsed && "md:justify-center md:px-2"
        )}
      >
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <Image src="/logo.png" alt="Zênite" width={32} height={32} className="h-8 w-8 shrink-0 invert dark:invert-0" />
          <span className={cn("min-w-0 leading-tight", hideLabel)}>
            <span className="block text-base font-bold tracking-tight text-sidebar-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Zênite
            </span>
            <span className="block truncate text-[10px] text-sidebar-foreground/40">Assistente Pessoal</span>
          </span>
        </Link>
        <span className={hideLabel}>
          <ThemeToggle />
        </span>
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 space-y-0.5 px-4 py-5", collapsed && "md:px-2")}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
                collapsed && "md:justify-center md:px-0",
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
              <span className={hideLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: recolher + perfil + sair */}
      <div className={cn("border-t border-sidebar-border px-4 py-4", collapsed && "md:px-2")}>
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed && "md:justify-center md:px-0"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          ) : (
            <PanelLeftClose className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          )}
          <span className={hideLabel}>Recolher</span>
        </button>

        <Link
          href="/perfil"
          title="Editar perfil"
          className={cn(
            "flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sidebar-accent",
            collapsed && "md:justify-center md:px-0"
          )}
        >
          <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-sidebar-border bg-muted">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" width={32} height={32} className="h-8 w-8 object-cover" unoptimized />
            ) : null}
          </span>
          <span className={cn("min-w-0", hideLabel)}>
            <span className="block truncate text-sm font-medium text-sidebar-foreground">{displayName || "Perfil"}</span>
            <span className="block truncate text-xs text-sidebar-foreground/40">{userEmail}</span>
          </span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            title="Sair"
            className={cn(
              "mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "md:justify-center md:px-0"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span className={hideLabel}>Sair</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
