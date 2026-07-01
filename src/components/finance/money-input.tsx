"use client";

import { Input } from "@/components/ui/input";

/** Input controlado que só aceita dígitos, ponto e vírgula (formato BRL). */
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
  return (
    <Input
      inputMode="decimal"
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
    />
  );
}
