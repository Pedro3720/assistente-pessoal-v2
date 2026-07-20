# Notificações push de lembretes (#10) — Design

**Data:** 2026-07-10
**Projeto:** `C:\Projetos\assistente-pessoal-v2` (Next.js 16.2.9 / React 19 / Supabase / TS strict)
**Status:** Aprovado — pronto para o plano de implementação

> Implementa a sugestão **#10**. Notificações **push no navegador** (Web Push), **sem e-mail**, que chegam
> **mesmo com o app fechado**. Fontes: eventos do calendário (com antecedência já existente) e tarefas com
> prazo. Agendador via **pg_cron** no Supabase. O service worker também deixa a base pronta para o futuro
> push no app mobile. Segue os padrões do projeto (Server Components leem, Server Actions mutam, Zod, RLS
> `own_rows`, TS strict, sem `any`).

## 1. Decisões (brainstorming)
- **Meio:** Web Push (funciona com o app fechado), não e-mail.
- **Agendador:** `pg_cron` + `pg_net` no Supabase (independe do plano do Vercel).
- **Ativação:** **banner automático** pós-login **+** seção "Notificações" em `/perfil`.
- **Fontes:** eventos + tarefas (ambos com "prazo").

## 2. Fontes de lembrete
- **Eventos do calendário:** disparo em **`starts_at − reminder_minutes`** (o `reminder_minutes` já é definido
  no modal do evento). Vale para eventos únicos **e recorrentes** (uma notificação por ocorrência).
- **Tarefas:** tarefas **pendentes** (`status != 'completed'`) com `due_on` definido → disparo às **08:00
  (fuso SP)** do dia do vencimento. Texto: "Sua tarefa '…' vence hoje." (Sem mudança no modelo de tarefas —
  usa o `due_on` existente + horário fixo.)

## 3. Arquitetura (peças)
```
pg_cron (Supabase, 1/min)
   └─ pg_net POST → /api/cron/reminders  (Authorization: Bearer CRON_SECRET)
         ├─ acha lembretes vencendo na janela do último minuto (eventos + tarefas)
         ├─ para cada usuário-alvo, lê push_subscriptions (service role)
         ├─ envia Web Push (lib web-push, chaves VAPID)
         ├─ grava notified_reminders (dedup)
         └─ remove subscriptions mortas (410/404)

Dispositivo do usuário:
   /perfil ou banner → pede permissão → registra /sw.js → pushManager.subscribe →
      Server Action salva a inscrição em push_subscriptions
   sw.js → evento 'push' → showNotification ; evento 'notificationclick' → abre a rota
```

## 4. Chaves VAPID + variáveis de ambiente (operacional)
Gerar uma vez: `npx web-push generate-vapid-keys`. Setar no **Vercel** e no **`.env.local`**:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — chave pública (vai pro cliente, no `subscribe`).
- `VAPID_PRIVATE_KEY` — chave privada (só servidor).
- `VAPID_SUBJECT` — um `mailto:voce@exemplo.com` (exigido pelo protocolo).
- `CRON_SECRET` — segredo compartilhado entre o pg_cron e o endpoint.

Nova dependência: **`web-push`** (+ `@types/web-push`).

## 5. Modelo de dados — migração `20260701000013_push.sql`
Duas tabelas:

### 5.1 `public.push_subscriptions`
| coluna | tipo | notas |
|---|---|---|
| `id` | bigint identity PK | |
| `user_id` | uuid not null → `auth.users(id)` on delete cascade | |
| `endpoint` | text not null **unique** | URL do push service (identifica o dispositivo) |
| `p256dh` | text not null | chave pública do cliente |
| `auth` | text not null | segredo do cliente |
| `created_at` | timestamptz not null default now() | |

- Índice `push_subscriptions_user_idx on (user_id)`. RLS `own_rows` (usuário gerencia as suas; o cron lê via
  service role, que ignora RLS). `unique(endpoint)` evita duplicar a mesma inscrição.

### 5.2 `public.notified_reminders` (dedup)
| coluna | tipo | notas |
|---|---|---|
| `id` | bigint identity PK | |
| `user_id` | uuid not null → `auth.users(id)` on delete cascade | |
| `kind` | text not null check (`in ('event','task')`) | fonte |
| `ref_id` | bigint not null | id do evento/tarefa |
| `occurred_on` | date not null | dia da ocorrência (fuso SP) |
| `sent_at` | timestamptz not null default now() | |

- **`unique(kind, ref_id, occurred_on)`** → um push por ocorrência (evita duplicar em recorrentes e na
  sobreposição da janela do cron). RLS `own_rows` (o cron escreve via service role). Índice implícito pela unique.

Ambas terminam com `notify pgrst, 'reload schema';`.

## 6. Service worker — `public/sw.js`
JS puro, servido em `/sw.js` (escopo raiz). Sem framework.
```js
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Zênite";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/logo.png",
      badge: "/logo.png",
      data: { url: data.url || "/" },
      tag: data.tag,        // colapsa duplicados
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const hit = wins.find((w) => w.url.includes(url));
      if (hit) return hit.focus();
      return self.clients.openWindow(url);
    })
  );
});
```

## 7. Ativação (permissão + inscrição)
- **Componente client `NotificationsSetup`** (usado no banner e na seção de /perfil):
  - Detecta suporte (`"serviceWorker" in navigator && "PushManager" in window`) e o estado de `Notification.permission`.
  - Botão "Ativar notificações neste dispositivo": `Notification.requestPermission()` → se `granted`,
    `navigator.serviceWorker.register("/sw.js")`, depois `reg.pushManager.subscribe({ userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY) })`, e chama a Server Action
    `savePushSubscription(sub.toJSON())`.
  - Mostra status: ativado / bloqueado (com dica de reabilitar no navegador) / não suportado.
  - Botão "Desativar": `subscription.unsubscribe()` + Server Action `deletePushSubscription(endpoint)`.
- **Banner automático** (`components/notifications/notification-banner.tsx`): aparece no layout `(app)` quando
  `Notification.permission === "default"` e o usuário ainda não dispensou (flag em `localStorage`
  `notif-banner-dismissed`). Dispensável (X). Não aparece se já concedido/bloqueado.
- **Seção em `/perfil`:** o mesmo `NotificationsSetup`, sempre visível, com o status atual.
- **Server Actions** (`src/lib/actions/notifications.ts`): `savePushSubscription(raw)` (upsert por `endpoint`
  com `user_id`), `deletePushSubscription(endpoint)`. Zod valida o shape `{ endpoint, keys: { p256dh, auth } }`.

## 8. Endpoint do cron — `src/app/api/cron/reminders/route.ts`
- `export const runtime = "nodejs";` (a lib `web-push` usa crypto do Node). `POST`.
- **Auth:** confere `Authorization: Bearer ${process.env.CRON_SECRET}`; senão `401`.
- Usa **`createAdminClient()`** (service role) — é um job de sistema, cross-user.
- **Janela:** `agora` = `new Date()`; a chamada anterior foi ~1 min antes. Considera "vencendo" um lembrete
  cujo instante de disparo ∈ `(agora − 90s, agora]` (janela um pouco maior que 60s para tolerar atraso do
  cron; o dedup impede repetição).
- **Eventos:** carrega eventos com `reminder_minutes is not null`; expande ocorrências próximas de `agora`
  (reusando a lógica de recorrência de `getEventsForMonth`/`spDateParts` — `daily`/`weekly`/`monthly`/`none`);
  para cada ocorrência, `fireAt = occurrenceStart − reminder_minutes`; se `fireAt` ∈ janela → candidato.
  Payload: `{ title: ev.title, body: "Começa às HH:MM", url: "/calendario", tag: "event-<id>-<data>" }`.
- **Tarefas:** carrega tarefas `status != 'completed'` com `due_on` = hoje (fuso SP); se `agora` ∈ janela em
  torno das **08:00 SP** de hoje → candidato. Payload: `{ title: "Tarefa vence hoje",
  body: task.title, url: "/tarefas", tag: "task-<id>-<data>" }`.
- **Dedup:** antes de enviar, tenta `insert` em `notified_reminders (kind, ref_id, occurred_on)`; se violar a
  unique (já enviado), pula. (Inserir **antes** de enviar evita corrida entre dois ticks.)
- **Envio:** para cada candidato, lê as `push_subscriptions` do `user_id` e envia via
  `webpush.sendNotification(sub, JSON.stringify(payload))`. Em erro **410/404** (inscrição morta), **remove**
  a linha de `push_subscriptions`.
- Configura o web-push uma vez: `webpush.setVapidDetails(VAPID_SUBJECT, PUBLIC, PRIVATE)`.
- Retorna `{ processed, sent }` (JSON) para diagnóstico.

## 9. Agendador — `pg_cron` + `pg_net` (operacional, você roda)
No Supabase (Database → Extensions): habilitar **`pg_cron`** e **`pg_net`**. Depois rodar (SQL Editor), trocando
`<APP_URL>` e `<CRON_SECRET>`:
```sql
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
```
(O arquivo `supabase/migrations/…_pgcron_reminders.sql` guarda esse SQL como referência — **não** é uma migração
de schema; é passo operacional porque contém segredo/URL e depende das extensões.)

## 10. Fora de escopo (YAGNI)
- Hora de vencimento configurável nas tarefas (usa `due_on` + 08:00 fixo).
- Central de notificações in-app / histórico.
- Push no app mobile (futuro; o service worker já é a base).
- Preferências finas (quais categorias notificar, silenciar horários).

## 11. Regras de ouro respeitadas
- Server Actions mutam com Zod; RLS `own_rows`; service role só no endpoint de sistema (protegido por segredo),
  no padrão de `lib/supabase/admin.ts`. Datas via `src/lib/dates.ts` (fuso SP). Sem `any`.
- Componentes pequenos; a lógica de recorrência do cron isola-se num helper testável por leitura.

## 12. Verificação
- `npm run build` limpo (tipos, imports, Zod; `web-push` instalada).
- Manual: ativar notificações em `/perfil` (permissão concedida) → criar um evento começando em ~2 min com
  "avisar 1 min antes" → em ~1 min a notificação push chega (mesmo com a aba fechada, após o pg_cron rodar) →
  clicar abre `/calendario`. Criar uma tarefa com `due_on` = hoje → às 08:00 (ou testar chamando o endpoint
  manualmente) a notificação chega. Conferir que sem permissão nada quebra; que o banner some ao conceder/dispensar.
- Operacional: env VAPID/CRON_SECRET; migração `0013`; habilitar pg_cron/pg_net + agendar.

## 13. Ordem de implementação (para o plano)
1. Migração `0013` (push_subscriptions + notified_reminders) + tipos.
2. Dep `web-push`; helper VAPID no cliente (urlBase64ToUint8Array) + config no servidor.
3. `public/sw.js`.
4. Validação + Server Actions `savePushSubscription`/`deletePushSubscription`.
5. `NotificationsSetup` (ativar/desativar/status) + seção em `/perfil`.
6. Banner automático no layout `(app)`.
7. Endpoint `/api/cron/reminders` (janela + eventos com recorrência + tarefas + dedup + envio + limpeza).
8. SQL de referência do pg_cron.
9. `npm run build` + verificação; passos operacionais (env, migração, pg_cron).
