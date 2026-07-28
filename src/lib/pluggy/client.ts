import "server-only";
import { PluggyClient } from "pluggy-sdk";

/**
 * Cliente da Pluggy (Open Finance). SOMENTE SERVIDOR.
 *
 * Regras de segurança desta integração:
 * - `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` nunca podem virar `NEXT_PUBLIC_`
 *   nem ser importados por componente client. O `server-only` acima faz o build
 *   falhar se alguém tentar.
 * - A API Key é obtida e renovada pelo próprio SDK a cada chamada e nunca sai
 *   deste processo. O navegador recebe apenas o Connect Token, que é curto e de
 *   escopo reduzido.
 * - A senha do banco é digitada dentro do widget da Pluggy. O Zênite nunca vê,
 *   nunca transporta e nunca armazena credencial bancária.
 */

let cliente: PluggyClient | null = null;

/** Cliente único por processo (evita recriar a cada request). */
export function pluggy(): PluggyClient {
  if (cliente) return cliente;

  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Pluggy não configurada: defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no ambiente do servidor."
    );
  }

  cliente = new PluggyClient({ clientId, clientSecret });
  return cliente;
}

/** true quando as credenciais existem, para a UI esconder o recurso sem quebrar. */
export function pluggyConfigurada(): boolean {
  return Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET);
}

/**
 * Converte uma transação da Pluggy no par (type, amount) do Zênite, onde o
 * valor é SEMPRE positivo e a direção vive na coluna `type`, igual ao import
 * de OFX (`src/lib/parsers/ofx.ts`).
 *
 * A direção vem do campo `type` da Pluggy (DEBIT = saiu, CREDIT = entrou), que
 * é explícito, e não do sinal do valor: a documentação não garante o sinal, e
 * ele varia entre conta corrente e cartão. Com `Math.abs` o resultado fica
 * correto de qualquer forma.
 */
export function mapearValor(pluggyType: "DEBIT" | "CREDIT", amount: number) {
  return {
    type: pluggyType === "CREDIT" ? ("income" as const) : ("expense" as const),
    amount: Math.abs(amount),
  };
}
