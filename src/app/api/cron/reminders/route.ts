import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDueReminders } from "@/lib/push/reminders";

export const runtime = "nodejs";

type SubRow = { id: number; endpoint: string; p256dh: string; auth: string };

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) {
    return NextResponse.json({ error: "VAPID nao configurado" }, { status: 500 });
  }
  webpush.setVapidDetails(subject, pub, priv);

  const admin = createAdminClient();
  const due = await getDueReminders(admin, new Date());
  let sent = 0;

  for (const r of due) {
    // Dedup: grava ANTES de enviar para evitar duplo envio entre ticks do cron.
    // Trade-off consciente: uma falha transitória de envio marca como enviado e não re-tenta.
    const { error: dErr } = await admin.from("notified_reminders").insert({
      user_id: r.user_id,
      kind: r.kind,
      ref_id: r.ref_id,
      occurred_on: r.occurred_on,
    });
    if (dErr) {
      if (dErr.code !== "23505") console.error("notified_reminders insert:", dErr.message);
      continue;
    }

    const { data: subs, error: subErr } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", r.user_id);
    if (subErr) console.error("push_subscriptions select:", subErr.message);

    const payload = JSON.stringify({ title: r.title, body: r.body, url: r.url, tag: r.tag });
    for (const s of (subs ?? []) as SubRow[]) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }
  }

  return NextResponse.json({ processed: due.length, sent });
}
