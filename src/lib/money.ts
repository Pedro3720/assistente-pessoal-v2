/**
 * Utilitários de dinheiro (BRL). Guardamos valores como número decimal em reais.
 */

/** Converte texto digitado ("1.234,56", "1234,56", "1234.56") em número. */
export function parseBRL(input: string): number {
  const s = input.trim().replace(/[R$\s]/g, "");
  if (!s) return NaN;

  // Formato brasileiro: 1.234,56  (ponto = milhar, vírgula = decimal)
  if (/^-?\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(s)) {
    return Number(s.replace(/\./g, "").replace(",", "."));
  }
  // Vírgula decimal simples: 1234,56
  if (/^-?\d+,\d{1,2}$/.test(s)) {
    return Number(s.replace(",", "."));
  }
  // Já em formato com ponto decimal: 1234.56
  return Number(s);
}

/** Formata número como moeda brasileira: 1234.5 → "R$ 1.234,50". */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);
}
