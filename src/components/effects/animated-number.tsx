"use client";

import { useEffect, useState } from "react";
import NumberFlow, { type Format } from "@number-flow/react";
import { BRL_FORMAT, BRL_LOCALE, formatBRL } from "@/lib/money";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const INT_FORMAT: Format = { maximumFractionDigits: 0 };
// mesmo objeto do money.ts; o Format do NumberFlow é um subconjunto do
// Intl.NumberFormatOptions (e BRL_FORMAT não usa os campos excluídos)
const MONEY_FORMAT = BRL_FORMAT as Format;

/**
 * Número animado do dashboard (NumberFlow: dígitos "rolam" ao mudar).
 * Substitui o antigo CountUp (GSAP) com a mesma API: no mount rola de 0
 * até o valor; se o valor mudar (ex.: trocar o mês), rola para o novo.
 * Dinheiro usa o formato de src/lib/money.ts (fonte única).
 * Com prefers-reduced-motion, renderiza o valor final estático.
 */
export function AnimatedNumber({
  value,
  currency = false,
  className,
  style,
}: {
  value: number;
  currency?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  useEffect(() => setDisplay(value), [value]);

  if (reduce) {
    return (
      <span className={`num ${className ?? ""}`} style={style}>
        {currency ? formatBRL(value) : Math.round(value).toLocaleString(BRL_LOCALE)}
      </span>
    );
  }

  return (
    <span className={`num ${className ?? ""}`} style={style}>
      <NumberFlow
        value={display}
        locales={BRL_LOCALE}
        format={currency ? MONEY_FORMAT : INT_FORMAT}
      />
    </span>
  );
}
