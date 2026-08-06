import { BANKS, type Bank } from "./banks";
import { BANKS_EXTRA, type ExtraBank } from "./banks-extra";

export type Issuer = Bank | ExtraBank;

/**
 * Lista única de emissores: a gerada tem precedência sobre a manual, para o
 * pacote continuar sendo a fonte preferencial quando um slug existir nos dois.
 */
export const ISSUERS: Issuer[] = [
  ...BANKS,
  ...BANKS_EXTRA.filter((e) => !BANKS.some((b) => b.slug === e.slug)),
];

const PORSLUG = new Map(ISSUERS.map((i) => [i.slug, i]));

export function issuerBySlug(slug: string | null | undefined): Issuer | null {
  if (!slug) return null;
  return PORSLUG.get(slug) ?? null;
}

/**
 * Caminho do selo. A extensão é declarada na lista, não descoberta em runtime:
 * o navegador não consulta o sistema de arquivos, e errar a extensão daria
 * imagem quebrada em vez de fallback.
 */
export function issuerAsset(issuer: Issuer): string {
  const ext = "ext" in issuer ? issuer.ext : "svg";
  return `/banks/${issuer.slug}.${ext}`;
}
