"use client";

// src/components/ui/segmented.tsx
import { Link } from "next-view-transitions";
import { cn } from "@/lib/utils";

/**
 * Abas em pill, navegadas por URL. Ser URL-driven é o que permite compartilhar
 * o link de uma aba e o que mantém a leitura de dados no servidor.
 */
export function Segmented({
  items,
  value,
  hrefFor,
  className,
}: {
  items: { value: string; label: string }[];
  value: string;
  hrefFor: (value: string) => string;
  className?: string;
}) {
  return (
    <nav className={cn("flex gap-0.5 rounded-full bg-muted p-0.5", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Link
            key={item.value}
            href={hrefFor(item.value)}
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
