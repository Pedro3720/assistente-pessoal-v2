import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Valor em dinheiro. Concentra três regras que precisam ser iguais em todas
 * as telas: numeral tabular (para as colunas alinharem), sinal antes do
 * símbolo e cor semântica. O valor é decimal em reais, como em lib/money.
 */
export function Money({
  value,
  signed = false,
  colorize = false,
  className,
}: {
  value: number;
  /** mostra "+ " nas entradas e "- " nas saídas, em vez do menos colado */
  signed?: boolean;
  /** verde para entrada, coral para saída */
  colorize?: boolean;
  className?: string;
}) {
  const negative = value < 0;
  const prefix = signed ? (negative ? "- " : "+ ") : "";
  const shown = signed ? Math.abs(value) : value;

  return (
    <span
      className={cn(
        "num",
        colorize && (negative ? "text-negative" : "text-positive"),
        className
      )}
    >
      {prefix}
      {formatBRL(shown)}
    </span>
  );
}
