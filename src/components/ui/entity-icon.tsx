import { Landmark, Repeat, Tag } from "lucide-react";
import { getIcon } from "@/lib/icons/catalog";
import { bankLogoSrc, getBank } from "@/lib/finance/banks";

/**
 * Renderiza o valor da coluna `icon` (contas, categorias, assinaturas), que
 * aceita três formatos:
 *
 *   "bank:nubank"  -> logo do banco (arquivo em public/banks/)
 *   "home"         -> ícone do catálogo lucide
 *   "🏠"           -> emoji legado, de antes desta onda
 *
 * Sem "use client" de propósito: é usado tanto por Server Components
 * (página de finanças) quanto por componentes client.
 */
export function EntityIcon({
  value,
  className = "",
  fallback = "tag",
  size = 20,
}: {
  value: string | null | undefined;
  /** classes do wrapper (tamanho do círculo, por exemplo) */
  className?: string;
  /** o que mostrar quando não há valor: banco, assinatura ou etiqueta */
  fallback?: "bank" | "subscription" | "tag";
  /** tamanho do traço do ícone, em px */
  size?: number;
}) {
  const valor = (value ?? "").trim();

  // 1) logo de banco
  if (valor.startsWith("bank:")) {
    const slug = valor.slice(5);
    const banco = getBank(slug);
    if (banco) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- SVG local e estático; next/image não agrega aqui
        <img
          src={bankLogoSrc(slug)}
          alt={banco.nome}
          className={`shrink-0 object-cover ${className}`}
        />
      );
    }
  }

  // 2) ícone do catálogo
  const Icon = getIcon(valor);
  if (Icon) {
    return (
      <span className={`flex shrink-0 items-center justify-center ${className}`}>
        <Icon style={{ width: size, height: size }} strokeWidth={1.8} />
      </span>
    );
  }

  // 3) emoji legado (qualquer texto curto que não seja nome conhecido)
  if (valor) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center ${className}`}
        style={{ fontSize: size }}
      >
        {valor}
      </span>
    );
  }

  // 4) vazio: ícone genérico conforme o contexto
  const Generico = fallback === "bank" ? Landmark : fallback === "subscription" ? Repeat : Tag;
  return (
    <span className={`flex shrink-0 items-center justify-center ${className}`}>
      <Generico style={{ width: size, height: size }} strokeWidth={1.8} />
    </span>
  );
}
