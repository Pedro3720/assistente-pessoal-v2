"use client";

import { Input } from "@/components/ui/input";

/** Centavos (inteiro) → "1.234,56". */
function formatCentavos(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Campo de dinheiro (BRL) com máscara automática: o usuário digita só números
 * e o valor aparece formatado da direita p/ a esquerda (12345 → "123,45",
 * 123456 → "1.234,56"). Emite a string formatada, que parseBRL entende.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder = "0,00",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  function handle(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      onChange("");
      return;
    }
    onChange(formatCentavos(parseInt(digits, 10)));
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        inputMode="numeric"
        className="num pl-9"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => handle(e.target.value)}
      />
    </div>
  );
}
