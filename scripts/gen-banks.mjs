/**
 * Gera as logos dos bancos a partir do pacote @edusites/bancos-brasil (MIT):
 *   - public/banks/<slug>.svg  (símbolo sobre o fundo da marca, arquivo estático)
 *   - src/lib/finance/banks.ts (só a lista: slug, nome e cor, poucos KB)
 *
 * Os SVGs ficam em public/ de propósito: o navegador baixa apenas a logo em uso
 * e a cacheia, em vez de carregar ~95 KB de vetores no bundle de toda página.
 *
 * Rodar com: node scripts/gen-banks.mjs
 * O pacote é devDependency e só é necessário para regerar estes arquivos.
 * As marcas pertencem aos respectivos bancos (ver README).
 */
import { mkdirSync, writeFileSync } from "node:fs";
// caminho direto: o pacote só exporta a raiz, e queremos o mapa cru de ícones
import { ICONES } from "../node_modules/@edusites/bancos-brasil/src/icones.js";

// nome de exibição por slug; a ordem aqui é a ordem da galeria
const BANCOS = [
  ["nubank", "Nubank"],
  ["itau", "Itaú"],
  ["bradesco", "Bradesco"],
  ["bancodobrasil", "Banco do Brasil"],
  ["caixa", "Caixa"],
  ["santander", "Santander"],
  ["inter", "Inter"],
  ["c6", "C6 Bank"],
  ["btg", "BTG Pactual"],
  ["sicoob", "Sicoob"],
  ["sicredi", "Sicredi"],
  ["safra", "Safra"],
  ["original", "Original"],
  ["neon", "Neon"],
  ["pan", "Banco Pan"],
  ["bmg", "BMG"],
  ["agibank", "Agibank"],
  ["mercantil", "Mercantil"],
  ["bv", "BV"],
  ["bs2", "BS2"],
  ["digio", "Digio"],
  ["next", "Next"],
  ["xp", "XP"],
  ["rico", "Rico"],
  ["picpay", "PicPay"],
  ["mercadopago", "Mercado Pago"],
  ["pagbank", "PagBank"],
  ["stone", "Stone"],
];

// cores oficiais (fundo da marca + cor do símbolo), do preset do pacote
const CORES = {
  nubank: ["#820AD1", "#FFFFFF"],
  itau: ["#EC7000", "#FFFFFF"],
  bradesco: ["#CC092F", "#FFFFFF"],
  bancodobrasil: ["#003D7A", "#FFDD00"],
  caixa: ["#0070AF", "#FFFFFF"],
  santander: ["#EC0000", "#FFFFFF"],
  inter: ["#FF7A00", "#FFFFFF"],
  c6: ["#242424", "#FFFFFF"],
  btg: ["#0D1B2A", "#FFFFFF"],
  sicoob: ["#003641", "#7DB61C"],
  sicredi: ["#3FA110", "#FFFFFF"],
  safra: ["#00447C", "#FFFFFF"],
  original: ["#00A868", "#FFFFFF"],
  neon: ["#00AEEF", "#FFFFFF"],
  pan: ["#00A0DF", "#FFFFFF"],
  bmg: ["#F58220", "#FFFFFF"],
  agibank: ["#00A859", "#FFFFFF"],
  mercantil: ["#004B8D", "#FFFFFF"],
  bv: ["#0033A0", "#FFFFFF"],
  bs2: ["#00263A", "#FFFFFF"],
  digio: ["#0033A0", "#FFFFFF"],
  next: ["#00E7B1", "#000000"],
  xp: ["#000000", "#FFFFFF"],
  rico: ["#F4511E", "#FFFFFF"],
  picpay: ["#21C25E", "#FFFFFF"],
  mercadopago: ["#00A6E0", "#FFFFFF"],
  pagbank: ["#0F9B4F", "#FFFFFF"],
  stone: ["#00A868", "#FFFFFF"],
};

/** Extrai o viewBox e o conteúdo interno do <svg> do pacote. */
function parse(svg) {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? "0 0 108 108";
  const inner = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return { viewBox, inner };
}

mkdirSync("public/banks", { recursive: true });

const linhas = [];
const faltando = [];
let bytesSvg = 0;
for (const [slug, nome] of BANCOS) {
  const bruto = ICONES[slug];
  if (!bruto) {
    faltando.push(slug);
    continue;
  }
  const { viewBox, inner } = parse(bruto);
  const [fundo, cor] = CORES[slug];

  // fundo cheio (sem canto arredondado): quem decide o formato é o CSS do app,
  // com rounded-full para círculo ou rounded-xl para quadrado
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${nome}">` +
    `<rect width="100%" height="100%" fill="${fundo}"/>` +
    `<g fill="${cor}">${inner}</g>` +
    `</svg>`;
  writeFileSync(`public/banks/${slug}.svg`, svg, "utf8");
  bytesSvg += svg.length;

  linhas.push(
    `  { slug: ${JSON.stringify(slug)}, nome: ${JSON.stringify(nome)}, cor: ${JSON.stringify(fundo)} },`
  );
}

const saida = `// GERADO POR scripts/gen-banks.mjs - NAO EDITAR A MAO.
// Fonte: @edusites/bancos-brasil (MIT). As marcas pertencem aos respectivos
// bancos; aqui elas identificam a conta do proprio usuario (uso nominativo).
// A logo de cada banco fica em public/banks/<slug>.svg.

export type Bank = {
  slug: string;
  nome: string;
  /** cor da marca, usada em realces e no fundo de apoio */
  cor: string;
};

export const BANKS: Bank[] = [
${linhas.join("\n")}
];

const PORSLUG = new Map(BANKS.map((b) => [b.slug, b]));

/** Busca um banco pelo slug (ex.: "nubank"). */
export function getBank(slug: string): Bank | undefined {
  return PORSLUG.get(slug);
}

/** Caminho publico da logo de um banco. */
export function bankLogoSrc(slug: string): string {
  return \`/banks/\${slug}.svg\`;
}
`;

writeFileSync("src/lib/finance/banks.ts", saida, "utf8");
console.log(
  `${linhas.length} logos em public/banks/ (${Math.round(bytesSvg / 1024)} KB no total) + banks.ts com ${Math.round(saida.length / 1024)} KB`
);
if (faltando.length) console.log("NAO encontrados no pacote:", faltando.join(", "));
