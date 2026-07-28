// GERADO POR scripts/gen-banks.mjs - NAO EDITAR A MAO.
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
  { slug: "nubank", nome: "Nubank", cor: "#820AD1" },
  { slug: "itau", nome: "Itaú", cor: "#EC7000" },
  { slug: "bradesco", nome: "Bradesco", cor: "#CC092F" },
  { slug: "bancodobrasil", nome: "Banco do Brasil", cor: "#003D7A" },
  { slug: "caixa", nome: "Caixa", cor: "#0070AF" },
  { slug: "santander", nome: "Santander", cor: "#EC0000" },
  { slug: "inter", nome: "Inter", cor: "#FF7A00" },
  { slug: "c6", nome: "C6 Bank", cor: "#242424" },
  { slug: "btg", nome: "BTG Pactual", cor: "#0D1B2A" },
  { slug: "sicoob", nome: "Sicoob", cor: "#003641" },
  { slug: "sicredi", nome: "Sicredi", cor: "#3FA110" },
  { slug: "safra", nome: "Safra", cor: "#00447C" },
  { slug: "original", nome: "Original", cor: "#00A868" },
  { slug: "neon", nome: "Neon", cor: "#00AEEF" },
  { slug: "pan", nome: "Banco Pan", cor: "#00A0DF" },
  { slug: "bmg", nome: "BMG", cor: "#F58220" },
  { slug: "agibank", nome: "Agibank", cor: "#00A859" },
  { slug: "mercantil", nome: "Mercantil", cor: "#004B8D" },
  { slug: "bv", nome: "BV", cor: "#0033A0" },
  { slug: "bs2", nome: "BS2", cor: "#00263A" },
  { slug: "digio", nome: "Digio", cor: "#0033A0" },
  { slug: "next", nome: "Next", cor: "#00E7B1" },
  { slug: "xp", nome: "XP", cor: "#000000" },
  { slug: "rico", nome: "Rico", cor: "#F4511E" },
  { slug: "picpay", nome: "PicPay", cor: "#21C25E" },
  { slug: "mercadopago", nome: "Mercado Pago", cor: "#00A6E0" },
  { slug: "pagbank", nome: "PagBank", cor: "#0F9B4F" },
  { slug: "stone", nome: "Stone", cor: "#00A868" },
];

const PORSLUG = new Map(BANKS.map((b) => [b.slug, b]));

/** Busca um banco pelo slug (ex.: "nubank"). */
export function getBank(slug: string): Bank | undefined {
  return PORSLUG.get(slug);
}

/** Caminho publico da logo de um banco. */
export function bankLogoSrc(slug: string): string {
  return `/banks/${slug}.svg`;
}
