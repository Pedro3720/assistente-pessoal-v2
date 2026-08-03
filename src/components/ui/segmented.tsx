"use client";

// src/components/ui/segmented.tsx
import { Link } from "next-view-transitions";
import { cn } from "@/lib/utils";

/**
 * Abas em pill, navegadas por URL. Ser URL-driven é o que permite compartilhar
 * o link de uma aba e o que mantém a leitura de dados no servidor.
 *
 * Cada item já chega com o `href` pronto, em vez de o componente receber uma
 * função que monta a URL: este é um Client Component, e função não atravessa
 * a fronteira servidor/cliente (o Next só serializa dado). Quem usa monta a
 * URL no servidor.
 */
export function Segmented({
  items,
  value,
  className,
}: {
  items: { value: string; label: string; href: string }[];
  value: string;
  className?: string;
}) {
  return (
    <nav className={cn("flex gap-0.5 rounded-full bg-muted p-0.5", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Link
            key={item.value}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
