# Notificações push de lembretes (#10) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notificações Web Push de lembretes (eventos e tarefas), que chegam mesmo com o app fechado, disparadas por um cron do Supabase (pg_cron) que chama um endpoint que envia os pushes.

**Architecture:** Service worker (`public/sw.js`) mostra as notificações. O cliente pede permissão, registra o SW e se inscreve (`pushManager.subscribe`); a inscrição é salva em `push_subscriptions`. Um endpoint `/api/cron/reminders` (Node, service role, protegido por `CRON_SECRET`) computa os lembretes vencendo na última janela (eventos com recorrência + tarefas às 08:00), deduplica via `notified_reminders`, e envia via `web-push`. O `pg_cron`+`pg_net` chama esse endpoint a cada minuto.

**Tech Stack:** Next.js 16.2.9 (App Router, route handler Node) · React 19 · TypeScript strict · Supabase (@supabase/ssr + service role) · Zod · **web-push** · Web Push API / Service Worker.

## Global Constraints

- **Sem framework de testes.** O gate de cada task é **`npm run build`** sem erros (tipos, lint, Zod) + verificação manual/operacional na última task. Não escrever testes automatizados.
- **TS strict, proibido `any`.** Imports/vars não usados quebram o build.
- **Arquitetura:** Server Components leem (`src/lib/data/*`); Server Actions mutam (`src/lib/actions/*`, `"use server"`, Zod, `user_id` via `auth.getUser()`). Tipos em `src/types/*`. RLS `own_rows` em toda tabela. **Service role** só em `lib/supabase/admin.ts` — aqui usado no endpoint de sistema (protegido por `CRON_SECRET`).
- **Datas:** só via `src/lib/dates.ts` (fuso SP) — `todayISO`, `composeSP`, `spDateParts`. Nunca `toISOString().split`.
- **Env necessárias (operacional, humano):** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto), `CRON_SECRET`.
- **Endpoint do cron:** `export const runtime = "nodejs";` (web-push usa crypto do Node). Auth por `Authorization: Bearer CRON_SECRET`.
- **Dedup:** `notified_reminders` unique `(kind, ref_id, occurred_on)`; inserir **antes** de enviar.
- **Migração/pg_cron:** arquivos SQL no repo; rodar no Supabase é passo operacional do humano (CLI bloqueada).

---

### Task 1: Dependência `web-push` + migração `0013`

**Files:**
- Modify: `package.json` (via npm install)
- Create: `supabase/migrations/20260701000013_push.sql`

**Interfaces:**
- Consumes: nada.
- Produces: dep `web-push`; tabelas `public.push_subscriptions`, `public.notified_reminders`.

- [ ] **Step 1: Instalar a lib**

Run:
```bash
npm install web-push && npm install -D @types/web-push
```

- [ ] **Step 2: Criar a migração**

Create `supabase/migrations/20260701000013_push.sql`:

```sql
-- ============================================================
-- Migração 0013: Web Push (inscrições + dedup de lembretes)
-- Cole e rode no Supabase → SQL Editor.
-- ============================================================

create table if not exists public.push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table if not exists public.notified_reminders (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('event','task')),
  ref_id      bigint not null,
  occurred_on date not null,
  sent_at     timestamptz not null default now(),
  unique (kind, ref_id, occurred_on)
);

alter table public.push_subscriptions enable row level security;
alter table public.notified_reminders enable row level security;
do $$
declare t text;
begin
  foreach t in array array['push_subscriptions','notified_reminders'] loop
    execute format('drop policy if exists "own_rows" on public.%I;', t);
    execute format(
      'create policy "own_rows" on public.%I for all to authenticated '
      || 'using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: compila sem erros (web-push instalada; nada a consome ainda).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json supabase/migrations/20260701000013_push.sql
git commit -m "feat(push): dep web-push + migracao 0013 (subscriptions + dedup) (#10)"
```

---

### Task 2: Service worker

**Files:**
- Create: `public/sw.js`

**Interfaces:**
- Consumes: nada.
- Produces: `/sw.js` que trata `push` e `notificationclick`.

- [ ] **Step 1: Criar o service worker**

Create `public/sw.js`:

```js
/* Service worker de push do Zênite. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = data.title || "Zênite";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/logo.png",
      badge: "/logo.png",
      tag: data.tag,
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        const hit = wins.find((w) => w.url.includes(url));
        if (hit) return hit.focus();
        return self.clients.openWindow(url);
      })
  );
});
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sem erros (arquivo estático).

- [ ] **Step 3: Commit**

```bash
git add public/sw.js
git commit -m "feat(push): service worker (push + notificationclick) (#10)"
```

---

### Task 3: Validação + Server Actions de inscrição

**Files:**
- Create: `src/lib/validation/notifications.ts`
- Create: `src/lib/actions/notifications.ts`

**Interfaces:**
- Consumes: `createClient`, `auth.getUser()`.
- Produces: `pushSubscriptionInput` (Zod); `savePushSubscription(raw)`, `deletePushSubscription(endpoint)`.

- [ ] **Step 1: Validação**

Create `src/lib/validation/notifications.ts`:

```ts
import { z } from "zod";

export const pushSubscriptionInput = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionInput>;
```

- [ ] **Step 2: Server Actions**

Create `src/lib/actions/notifications.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { pushSubscriptionInput } from "@/lib/validation/notifications";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, userId: user.id };
}

export async function savePushSubscription(raw: unknown) {
  const input = pushSubscriptionInput.parse(raw);
  const { supabase, userId } = await ctx();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw new Error(error.message);
}

export async function deletePushSubscription(endpoint: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/validation/notifications.ts src/lib/actions/notifications.ts
git commit -m "feat(push): validacao + actions de inscricao (#10)"
```

---

### Task 4: Helper de cliente + componente `NotificationsSetup`

**Files:**
- Create: `src/lib/push/client.ts`
- Create: `src/components/notifications/notifications-setup.tsx`

**Interfaces:**
- Consumes: `savePushSubscription`/`deletePushSubscription` (Task 3); env `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- Produces: `subscribeToPush()`, `unsubscribeFromPush()`, `hasPushSubscription()`; componente `NotificationsSetup`.

- [ ] **Step 1: Helper de cliente**

Create `src/lib/push/client.ts`:

```ts
"use client";

import { savePushSubscription, deletePushSubscription } from "@/lib/actions/notifications";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Já existe uma inscrição de push ativa neste navegador? */
export async function hasPushSubscription(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return Boolean(sub);
}

/** Pede permissão, registra o SW, inscreve e salva. Retorna a permissão resultante. */
export async function subscribeToPush(): Promise<NotificationPermission> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm;
  const reg = await navigator.serviceWorker.register("/sw.js");
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string),
  });
  await savePushSubscription(sub.toJSON());
  return perm;
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await deletePushSubscription(sub.endpoint);
    await sub.unsubscribe();
  }
}
```

- [ ] **Step 2: Componente `NotificationsSetup`**

Create `src/components/notifications/notifications-setup.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { pushSupported, subscribeToPush, unsubscribeFromPush, hasPushSubscription } from "@/lib/push/client";

type UiState = "loading" | "unsupported" | "denied" | "on" | "off";

export function NotificationsSetup({ onChange }: { onChange?: () => void }) {
  const [state, setState] = useState<UiState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!pushSupported()) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      if (Notification.permission === "granted" && (await hasPushSubscription())) return setState("on");
      setState("off");
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await subscribeToPush();
      if (perm === "granted") {
        setState("on");
        toast.success("Notificações ativadas neste dispositivo.");
      } else if (perm === "denied") {
        setState("denied");
      }
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ativar notificações");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setState("off");
      toast.success("Notificações desativadas neste dispositivo.");
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao desativar");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;
  if (state === "unsupported")
    return <p className="text-sm text-muted-foreground">Este navegador não suporta notificações push.</p>;
  if (state === "denied")
    return (
      <p className="text-sm text-muted-foreground">
        Notificações bloqueadas neste navegador. Reative no cadeado ao lado do endereço.
      </p>
    );
  if (state === "on")
    return (
      <button
        onClick={disable}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
      >
        <BellOff className="h-4 w-4" /> Desativar notificações neste dispositivo
      </button>
    );
  return (
    <button
      onClick={enable}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      <Bell className="h-4 w-4" /> {busy ? "Ativando..." : "Ativar notificações neste dispositivo"}
    </button>
  );
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/push/client.ts "src/components/notifications/notifications-setup.tsx"
git commit -m "feat(push): helper de cliente + NotificationsSetup (#10)"
```

---

### Task 5: Banner automático + wiring (layout + /perfil)

**Files:**
- Create: `src/components/notifications/notification-banner.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/(app)/perfil/page.tsx`

**Interfaces:**
- Consumes: `NotificationsSetup`, `pushSupported` (Task 4).
- Produces: banner no layout `(app)`; seção "Notificações" em /perfil.

- [ ] **Step 1: Banner**

Create `src/components/notifications/notification-banner.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { pushSupported } from "@/lib/push/client";
import { NotificationsSetup } from "./notifications-setup";

export function NotificationBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;
    if (Notification.permission !== "default") return; // já concedeu/bloqueou
    if (localStorage.getItem("notif-banner-dismissed") === "1") return;
    setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem("notif-banner-dismissed", "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="glass mb-4 flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Ative as notificações para receber lembretes dos seus eventos e tarefas — mesmo com o app fechado.
      </p>
      <div className="flex items-center gap-2">
        <NotificationsSetup onChange={dismiss} />
        <button onClick={dismiss} className="rounded-lg p-2 text-muted-foreground hover:bg-accent" title="Dispensar">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Montar o banner no layout**

Em `src/app/(app)/layout.tsx`, adicionar o import e renderizar o banner no topo do conteúdo. Trocar:
```tsx
import { Sidebar } from "@/components/layout/sidebar";
import { isAdminEmail } from "@/lib/auth/admin";
```
por (adicionando o import do banner):
```tsx
import { Sidebar } from "@/components/layout/sidebar";
import { NotificationBanner } from "@/components/notifications/notification-banner";
import { isAdminEmail } from "@/lib/auth/admin";
```
E trocar o `<main>`:
```tsx
      <main className="flex-1">
        <div className="px-6 py-8 pt-20 md:px-10 md:py-10 md:pt-10">{children}</div>
      </main>
```
por:
```tsx
      <main className="flex-1">
        <div className="px-6 py-8 pt-20 md:px-10 md:py-10 md:pt-10">
          <NotificationBanner />
          {children}
        </div>
      </main>
```

- [ ] **Step 3: Seção em /perfil**

Em `src/app/(app)/perfil/page.tsx`, adicionar o import:
```ts
import { NotificationsSetup } from "@/components/notifications/notifications-setup";
```
E inserir, **antes** do `</div>` que fecha o container (depois da última `<Reveal>`), uma nova seção:
```tsx
      <Reveal>
        <div className="glass rounded-2xl border border-border p-6">
          <h2 className="font-semibold">Notificações</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Receba lembretes de eventos e tarefas neste dispositivo, mesmo com o app fechado.
          </p>
          <NotificationsSetup />
        </div>
      </Reveal>
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 5: Commit**

```bash
git add "src/components/notifications/notification-banner.tsx" "src/app/(app)/layout.tsx" "src/app/(app)/perfil/page.tsx"
git commit -m "feat(push): banner automatico + secao em /perfil (#10)"
```

---

### Task 6: Helper de lembretes vencendo

**Files:**
- Create: `src/lib/push/reminders.ts`

**Interfaces:**
- Consumes: `composeSP`, `spDateParts`, `todayISO` (`@/lib/dates`); tipo `EventRepeat` (`@/types/calendar`); `SupabaseClient` (service role).
- Produces: `DueReminder` (interface), `getDueReminders(admin, now) => Promise<DueReminder[]>`.

- [ ] **Step 1: Criar o helper**

Create `src/lib/push/reminders.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { composeSP, spDateParts, todayISO } from "@/lib/dates";
import type { EventRepeat } from "@/types/calendar";

export interface DueReminder {
  user_id: string;
  kind: "event" | "task";
  ref_id: number;
  occurred_on: string; // YYYY-MM-DD (SP)
  title: string;
  body: string;
  url: string;
  tag: string;
}

function shiftDay(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function lastDayOfMonth(dateStr: string): number {
  const [y, m] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Uma ocorrência do evento acontece na data D? (mesma regra do getEventsForMonth) */
function occursOn(repeat: EventRepeat, baseDate: string, D: string): boolean {
  if (D < baseDate) return false;
  if (repeat === "none") return D === baseDate;
  if (repeat === "daily") return true;
  if (repeat === "weekly") return weekdayOf(D) === weekdayOf(baseDate);
  if (repeat === "monthly") {
    const baseDay = Number(baseDate.split("-")[2]);
    return Number(D.split("-")[2]) === Math.min(baseDay, lastDayOfMonth(D));
  }
  return false;
}

type EventRow = {
  id: number;
  user_id: string;
  title: string;
  starts_at: string;
  repeat: EventRepeat;
  reminder_minutes: number | null;
};
type TaskRow = { id: number; user_id: string; title: string; due_on: string | null };

/**
 * Lembretes cujo instante de disparo caiu na janela (now-90s, now].
 * Recebe o client admin (service role) para ler de todos os usuários.
 *  - Evento: dispara em starts_at (da ocorrência) - reminder_minutes.
 *  - Tarefa pendente com due_on = hoje: dispara às 08:00 (SP).
 */
export async function getDueReminders(admin: SupabaseClient, now: Date): Promise<DueReminder[]> {
  const windowStart = now.getTime() - 90_000;
  const inWindow = (t: number) => t > windowStart && t <= now.getTime();
  const today = todayISO();
  const dates = [shiftDay(today, -1), today, shiftDay(today, 1)];
  const out: DueReminder[] = [];

  // ── Eventos ──
  const { data: evData, error: evErr } = await admin
    .from("events")
    .select("id, user_id, title, starts_at, repeat, reminder_minutes")
    .not("reminder_minutes", "is", null);
  if (evErr) throw new Error(evErr.message);

  for (const ev of (evData ?? []) as EventRow[]) {
    if (ev.reminder_minutes == null) continue;
    const { date: baseDate, time } = spDateParts(ev.starts_at);
    for (const D of dates) {
      if (!occursOn(ev.repeat, baseDate, D)) continue;
      const start = new Date(composeSP(D, time)).getTime();
      const fireAt = start - ev.reminder_minutes * 60_000;
      if (inWindow(fireAt)) {
        out.push({
          user_id: ev.user_id,
          kind: "event",
          ref_id: ev.id,
          occurred_on: D,
          title: ev.title,
          body: `Começa às ${time}`,
          url: "/calendario",
          tag: `event-${ev.id}-${D}`,
        });
      }
    }
  }

  // ── Tarefas (vencem hoje; disparam às 08:00 SP) ──
  const taskFire = new Date(composeSP(today, "08:00")).getTime();
  if (inWindow(taskFire)) {
    const { data: tkData, error: tkErr } = await admin
      .from("tasks")
      .select("id, user_id, title, due_on")
      .neq("status", "completed")
      .eq("due_on", today);
    if (tkErr) throw new Error(tkErr.message);
    for (const t of (tkData ?? []) as TaskRow[]) {
      if (!t.due_on) continue;
      out.push({
        user_id: t.user_id,
        kind: "task",
        ref_id: t.id,
        occurred_on: t.due_on,
        title: "Tarefa vence hoje",
        body: t.title,
        url: "/tarefas",
        tag: `task-${t.id}-${t.due_on}`,
      });
    }
  }

  return out;
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sem erros (função exportada, ainda não consumida — ok).

- [ ] **Step 3: Commit**

```bash
git add "src/lib/push/reminders.ts"
git commit -m "feat(push): helper getDueReminders (eventos recorrentes + tarefas) (#10)"
```

---

### Task 7: Endpoint do cron

**Files:**
- Create: `src/app/api/cron/reminders/route.ts`

**Interfaces:**
- Consumes: `createAdminClient` (`@/lib/supabase/admin`); `getDueReminders` (Task 6); `web-push`; env `CRON_SECRET`, `VAPID_*`.
- Produces: `POST /api/cron/reminders`.

- [ ] **Step 1: Criar o endpoint**

Create `src/app/api/cron/reminders/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDueReminders } from "@/lib/push/reminders";

export const runtime = "nodejs";

type SubRow = { id: number; endpoint: string; p256dh: string; auth: string };

export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
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
    // dedup: insere ANTES de enviar; violacao da unique = ja enviado -> pula
    const { error: dErr } = await admin.from("notified_reminders").insert({
      user_id: r.user_id,
      kind: r.kind,
      ref_id: r.ref_id,
      occurred_on: r.occurred_on,
    });
    if (dErr) continue;

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", r.user_id);

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
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sem erros; a rota `/api/cron/reminders` aparece no output.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/cron/reminders/route.ts"
git commit -m "feat(push): endpoint /api/cron/reminders (envio + dedup + limpeza) (#10)"
```

---

### Task 8: SQL do pg_cron + verificação

**Files:**
- Create: `supabase/pgcron_reminders.sql`

**Interfaces:**
- Consumes: endpoint `/api/cron/reminders` (Task 7).
- Produces: referência do agendador (operacional).

- [ ] **Step 1: Criar o SQL de referência do agendador**

Create `supabase/pgcron_reminders.sql`:

```sql
-- ============================================================
-- Agendador dos lembretes (NÃO é migração de schema — passo operacional).
-- Pré-requisitos: habilitar as extensões pg_cron e pg_net no Supabase
--   (Database → Extensions).
-- Troque <APP_URL> pela URL do app na Vercel e <CRON_SECRET> pelo segredo.
-- Rode no Supabase → SQL Editor.
-- ============================================================
select cron.schedule(
  'zenite-reminders',
  '* * * * *',  -- a cada minuto
  $$
  select net.http_post(
    url := '<APP_URL>/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Para remover depois, se precisar:
--   select cron.unschedule('zenite-reminders');
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sem erros (arquivo SQL não afeta o build).

- [ ] **Step 3: Commit**

```bash
git add supabase/pgcron_reminders.sql
git commit -m "chore(push): SQL de referencia do pg_cron (#10)"
```

- [ ] **Step 4: Passos operacionais (humano)**

1. **Gerar VAPID:** `npx web-push generate-vapid-keys`. Setar no Vercel **e** no `.env.local`:
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:seu@email`), e um `CRON_SECRET` qualquer.
2. **Rodar a migração** `supabase/migrations/20260701000013_push.sql` no Supabase → SQL Editor.
3. **Habilitar `pg_cron` e `pg_net`** (Database → Extensions) e rodar `supabase/pgcron_reminders.sql`
   (com `<APP_URL>` e `<CRON_SECRET>` preenchidos).

- [ ] **Step 5: Verificação manual (humano)**

- Em `/perfil` → "Ativar notificações neste dispositivo" → conceder permissão.
- Criar um evento começando em ~2 min com "avisar 1 min antes"; em ~1 min o push chega (mesmo com a aba
  fechada). Clicar abre `/calendario`.
- Teste rápido do endpoint (opcional): `POST` manual com o header `Authorization: Bearer <CRON_SECRET>` deve
  responder `{ processed, sent }`.
- Criar uma tarefa com prazo hoje → às 08:00 (SP) chega o push "Tarefa vence hoje".
- Sem permissão nada quebra; o banner some ao conceder/dispensar.

---

## Self-Review (preenchido pelo autor do plano)

**Spec coverage:** VAPID/env (spec §4) → Task 1 + Task 8. Migração/tabelas (§5) → Task 1. Service worker (§6) → Task 2. Ativação/banner/perfil (§7) → Tasks 3–5. Endpoint (§8) → Task 7 (+ helper Task 6). pg_cron (§9) → Task 8. Verificação (§12) → Task 8. ✔

**Placeholder scan:** `<APP_URL>`/`<CRON_SECRET>` são placeholders operacionais legítimos no SQL do agendador (o humano preenche). Nenhum TBD/TODO no código; todo passo traz código real. ✔

**Type consistency:** `DueReminder` (Task 6) consumido no endpoint (Task 7) com os mesmos campos (`user_id`, `kind`, `ref_id`, `occurred_on`, `title`, `body`, `url`, `tag`). `getDueReminders(admin, now)` (Task 6) chamado igual no endpoint. `savePushSubscription`/`deletePushSubscription` (Task 3) usados no helper de cliente (Task 4). `pushSubscriptionInput` shape `{ endpoint, keys:{p256dh,auth} }` = o que `sub.toJSON()` produz. `push_subscriptions`/`notified_reminders` colunas (Task 1) batem com o insert/select do endpoint (Task 7). ✔
