import { z } from "zod";

/**
 * Schemas para as entradas ESCALARES que as actions recebem fora do payload
 * principal (que já tem seu próprio schema). Coerção tolerante para não quebrar
 * chamadas legítimas, mas rejeitando lixo/tipo errado antes de tocar o banco.
 */

/** id de linha (bigint identity): inteiro positivo. */
export const idParam = z.coerce.number().int().positive();

/** category_id de uma transação: inteiro positivo, ou null para "sem categoria". */
export const categoryIdParam = z.number().int().positive().nullable();

/** uuid de grupo (purchase_group / transfer_group). */
export const uuidParam = z.string().uuid();

/** endpoint de inscrição de push (URL do serviço de push do navegador). */
export const pushEndpointParam = z.string().url().max(2048);

/** ano de calendário (faixa sã para importação do Google). */
export const yearParam = z.coerce.number().int().min(1970).max(2100);

/** mês 1-12. */
export const monthParam = z.coerce.number().int().min(1).max(12);
