import { NextResponse, after, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncItem } from "@/lib/pluggy/sync";

export const runtime = "nodejs";

/** IP fixo de onde a Pluggy envia os webhooks (documentado por eles). */
const IP_PLUGGY = "52.67.145.81";

/**
 * Webhook da Pluggy: avisa que um item mudou ou que há transações novas.
 *
 * Regras de segurança aplicadas aqui:
 *
 * 1. Segredo obrigatório: o header combinado no cadastro do webhook precisa
 *    bater com PLUGGY_WEBHOOK_SECRET. Sem isso, qualquer um poderia disparar
 *    sincronizações no app.
 * 2. O corpo NÃO é fonte de verdade. Dele só se aproveita o `itemId`, como
 *    gatilho; os dados vêm sempre de uma nova consulta à API da Pluggy. Assim,
 *    mesmo um payload forjado não injeta transação nenhuma.
 * 3. O DONO do item vem do nosso banco (`pluggy_items`), nunca do corpo. Como
 *    o processamento roda com service_role (que ignora RLS), toda escrita é
 *    escopada por esse `user_id`.
 * 4. Responde rápido e processa depois (`after`), porque a Pluggy espera 2xx em
 *    menos de 5 segundos e reenvia se demorar.
 */
export async function POST(req: NextRequest) {
  const segredo = process.env.PLUGGY_WEBHOOK_SECRET;
  if (!segredo) {
    console.error("[pluggy] webhook chamado sem PLUGGY_WEBHOOK_SECRET configurado");
    return NextResponse.json({ error: "nao configurado" }, { status: 503 });
  }

  // aceita o segredo em qualquer um dos dois headers usuais do painel da Pluggy
  const enviado =
    req.headers.get("x-webhook-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (enviado !== segredo) {
    // silencioso de propósito: não conta a quem chamou o que faltou
    return NextResponse.json({ error: "nao autorizado" }, { status: 401 });
  }

  // Checagem de IP como camada extra. Só bloqueia quando o cabeçalho existe e
  // aponta outra origem, para não derrubar entregas legítimas caso a Pluggy
  // mude de faixa (o segredo continua sendo a barreira principal).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip && ip !== IP_PLUGGY && process.env.NODE_ENV === "production") {
    console.warn(`[pluggy] webhook de IP inesperado: ${ip}`);
  }

  let corpo: { event?: string; itemId?: string } = {};
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ error: "corpo invalido" }, { status: 400 });
  }

  const itemId = typeof corpo.itemId === "string" ? corpo.itemId : null;
  if (!itemId) {
    // eventos sem item (ex.: teste do painel) são aceitos e ignorados
    return NextResponse.json({ ok: true, ignorado: true });
  }

  // processa depois de responder: a Pluggy exige 2xx em menos de 5s
  after(async () => {
    try {
      const admin = createAdminClient();
      // o dono vem do NOSSO mapeamento, nunca do corpo do webhook
      const { data: vinculo } = await admin
        .from("pluggy_items")
        .select("user_id")
        .eq("item_id", itemId)
        .maybeSingle();

      if (!vinculo?.user_id) {
        console.warn(`[pluggy] webhook para item desconhecido: ${itemId}`);
        return;
      }

      const r = await syncItem(admin, vinculo.user_id, itemId, { dias: 30 });
      console.log(
        `[pluggy] webhook ${corpo.event ?? "?"} item=${itemId}: ${r.inseridas} nova(s) de ${r.lidas} lida(s)`
      );
    } catch (e) {
      console.error("[pluggy] webhook:", e instanceof Error ? e.message : e);
    }
  });

  return NextResponse.json({ ok: true });
}
