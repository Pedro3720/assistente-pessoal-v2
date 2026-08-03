/**
 * Reconhecimento de marca a partir da descrição da transação.
 *
 * O logo é servido de `public/brands/<slug>.svg`, nunca de serviço externo:
 * o app roda empacotado (Capacitor) e o que a pessoa consome não deve sair
 * daqui. Sem correspondência, o avatar cai na inicial.
 */

/**
 * Palavra-chave normalizada -> slug do arquivo em `public/brands`.
 *
 * Cada chave é o texto normalizado (sem acento, minúsculo) esperado dentro da
 * descrição da transação; o valor é o nome do arquivo SVG correspondente em
 * `public/brands/<slug>.svg`. Só acrescente uma chave depois que o arquivo
 * SVG já existir na pasta: se o arquivo não existir, o `next/image` falha ao
 * carregar e o avatar fica vazio. Nasce vazio de propósito; exemplo de como
 * uma entrada fica quando o logo estiver disponível: `uber: "uber"`.
 */
const BRANDS: Record<string, string> = {};

/** Tira acento e caixa, que é como as descrições chegam do banco. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Devolve o slug da marca citada na descrição, ou null.
 * A busca é por substring: "Kabum · Teclado mecanico" casa com "kabum".
 */
export function brandSlugFor(description: string): string | null {
  const haystack = normalize(description);
  for (const [needle, slug] of Object.entries(BRANDS)) {
    if (haystack.includes(needle)) return slug;
  }
  return null;
}
