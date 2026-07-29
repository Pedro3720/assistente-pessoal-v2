import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncItem } from "@/lib/pluggy/sync";
import { pluggyConfigurada } from "@/lib/pluggy/client";

export const runtime = "nodejs";

/**
 * Sync periódico de todas as conexões (rede de segurança do webhook).
 *
 * Existe porque webhook pode falhar: entrega perdida, app fora do ar no
 * momento do disparo, ou desenvolvimento em localhost, onde a Pluggy nem
 * alcança. Rodando a cada 6 horas, nada fica para trás por muito tempo.
 *
 * Protegido por CRON_SECRET, no mesmo padrão de /api/cron/reminders. Roda com
 * service_role, então cada item é sincronizado escopado pelo `user_id` do
 * próprio mapeamento.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!pluggyConfigurada()) {
    return NextResponse.json({ error: "Pluggy nao configurada" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: itens, error } = await admin
    .from("pluggy_items")
    .select("item_id,user_id");

  if (error) {
    console.error("[pluggy] cron:", error.message);
    return NextResponse.json({ error: "falha ao ler conexoes" }, { status: 500 });
  }

  let novas = 0;
  let comErro = 0;

  for (const it of itens ?? []) {
    try {
      // janela curta: o cron é incremental, não recarga histórica
      const r = await syncItem(admin, it.user_id as string, it.item_id as string, { dias: 15 });
      novas += r.inseridas;
    } catch (e) {
      comErro++;
      // um item quebrado (login expirado, por exemplo) não pode parar os outros
      console.error(
        `[pluggy] cron item=${it.item_id}:`,
        e instanceof Error ? e.message : e
      );
    }
  }

  return NextResponse.json({
    ok: true,
    conexoes: itens?.length ?? 0,
    novas,
    comErro,
  });
}
