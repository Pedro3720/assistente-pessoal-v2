import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitOk } from "@/lib/ratelimit";
import { pluggy, pluggyConfigurada } from "@/lib/pluggy/client";
import { appUrl } from "@/lib/pluggy/sync";

export const runtime = "nodejs";

/**
 * Emite o Connect Token que o widget da Pluggy usa no navegador.
 *
 * É o único segredo que sai do servidor, e de propósito: ele é curto, tem
 * escopo reduzido (só abrir o widget) e expira. O Client ID, o Client Secret e
 * a API Key nunca saem daqui.
 *
 * Exige sessão: sem usuário autenticado não há token, para ninguém queimar a
 * cota da conta Pluggy do dono. `clientUserId` amarra a conexão ao usuário,
 * o que também é o que permite o webhook saber de quem é o item.
 */
export async function POST() {
  if (!pluggyConfigurada()) {
    return NextResponse.json(
      { error: "Integração bancária não configurada neste ambiente." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!(await rateLimitOk("pluggyConnect", user.id))) {
    return NextResponse.json(
      { error: "Muitas tentativas em pouco tempo. Aguarde um instante." },
      { status: 429 }
    );
  }

  const base = appUrl();
  try {
    // assinatura real do SDK: createConnectToken(itemId?, options?)
    const { accessToken } = await pluggy().createConnectToken(undefined, {
      clientUserId: user.id,
      // sem URL pública (dev local) o webhook simplesmente não é registrado;
      // a sincronização fica por conta do cron ou do botão de sincronizar
      ...(base ? { webhookUrl: `${base}/api/webhooks/pluggy` } : {}),
      avoidDuplicates: true,
    });

    return NextResponse.json({ connectToken: accessToken });
  } catch (e) {
    // nunca devolver o erro cru da Pluggy: pode conter detalhe de credencial
    console.error("[pluggy] connect-token:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Não foi possível iniciar a conexão agora. Tente de novo em instantes." },
      { status: 502 }
    );
  }
}
