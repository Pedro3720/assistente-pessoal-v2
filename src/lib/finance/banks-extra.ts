import type { Bank } from "./banks";

/**
 * Emissores que o pacote @edusites/bancos-brasil não cobre.
 *
 * Este arquivo é escrito à MÃO, ao contrário de banks.ts, que é gerado e
 * seria sobrescrito. O asset de cada um vive em public/banks/<slug>.<ext>
 * e é fornecido pelo dono, a partir do material de marca do emissor.
 */
export type ExtraBank = Bank & { ext: "svg" | "png" };

export const BANKS_EXTRA: ExtraBank[] = [
  { slug: "renner", nome: "Renner", cor: "#E30613", ext: "png" },
];
