# Onda 21: horário e lembrete na tarefa, e modal de detalhe, plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar horário opcional e lembrete à tarefa, e um modal de detalhe que mostra a tarefa por completo, conforme `docs/superpowers/specs/2026-08-18-onda21-tarefas-horario-lembrete-detalhe-design.md`.

**Architecture:** Duas colunas opcionais em `tasks` (`due_time`, `reminder_minutes`), com a regra de integridade ("sem data não há hora; sem hora não há lembrete") normalizada no schema Zod, que é o único caminho de escrita. O push de tarefa deixa de ser um disparo fixo às 08:00 e passa a espelhar o de evento, calculando o instante com `composeSP`. Na interface, o modal de criar/editar ganha hora e lembrete, o card da lista passa a mostrar o horário e a abrir um modal de detalhe novo, só leitura.

**Tech Stack:** Next.js App Router (Server Components leem, Server Actions mutam), React 19, TypeScript strict, Tailwind v4, Zod, Supabase com RLS `own_rows`, lucide-react, Web Push com `pg_cron`.

## Global Constraints

- **Não existe framework de testes neste projeto.** O ciclo de verificação de cada task é `npm run build` seguido de conferência manual. Não instale framework de teste.
- **Nunca usar `—` (em dash) nem `–` (en dash) em texto visível ao usuário.** Varredura: `rg "—|–" src`.
- **Nenhuma dependência nova.**
- **A CLI do Supabase é bloqueada nesta máquina.** A migração é escrita no arquivo e rodada manualmente pelo dono, colando no SQL Editor. Nenhuma task tenta aplicar migração.
- Datas e horas por `src/lib/dates.ts`. Nada de `new Date()` solto para compor instante.
- **Cuidado com o zero:** `reminder_minutes = 0` significa "Na hora" e é um valor válido. Toda checagem tem que ser `=== null` ou `!= null`, nunca truthiness. `if (reminder)` trata "Na hora" como "sem lembrete" e é bug.
- Um commit por task, com a task verificada antes.

## Estado inicial verificado

Isto foi conferido no código antes de escrever o plano, e o plano depende disso:

- `getTasks()` em `src/lib/data/task.ts:7` usa `select("*")`, então as colunas novas chegam à interface sem mudar a consulta.
- `taskInput` (`src/lib/validation/task.ts`) é o único portão de escrita: `createTask` e `updateTask` fazem `taskInput.parse(raw)`.
- `src/components/tasks/task-modal.tsx` **não** usa o primitivo `Modal`; tem overlay próprio. Este plano não mexe nisso. O modal de detalhe, por ser novo, usa o primitivo `src/components/ui/modal.tsx`, que já renderiza por portal, marca `data-portal-root`, fecha no `Esc` e trava o scroll do body.
- O `PointerSensor` do dnd-kit já exige 5px de movimento (`tasks-view.tsx:52`), e os `listeners` de arrasto estão só na alça, não no card. Clique no corpo do card não conflita com arrastar.
- `src/lib/dates.ts` tem `formatDateBR`, `composeSP` e `spDateParts`, e **não** tem helper de hora. A Task 1 cria um.

---

## Estrutura de arquivos

**Criados**

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20260701000020_task_time_reminder.sql` | Colunas `due_time` e `reminder_minutes`, restrição de faixa e índice parcial para o cron |
| `src/components/tasks/task-detail-modal.tsx` | Modal de leitura da tarefa, com as três ações no rodapé |

**Modificados**

| Arquivo | Responsabilidade da mudança |
|---|---|
| `src/lib/dates.ts` | Helper `formatTimeBR` (corta os segundos que o Postgres devolve) |
| `src/types/task.ts` | Campos `due_time` e `reminder_minutes` na interface `Task` |
| `src/lib/validation/task.ts` | Campos novos e a normalização da regra de integridade |
| `src/lib/actions/task.ts` | Tolerância a coluna inexistente generalizada para as três colunas opcionais |
| `src/lib/tasks/constants.ts` | `TASK_REMINDER_OPTIONS` e `reminderLabel` |
| `src/lib/push/reminders.ts` | Bloco de tarefas passa a usar hora e lembrete da tarefa |
| `src/components/tasks/task-modal.tsx` | Campos de hora e lembrete |
| `src/components/tasks/tasks-view.tsx` | Título em 2 linhas, hora e sino no card, clique abre o detalhe |
| `src/app/(app)/page.tsx` | Hora ao lado da data na lista de tarefas pendentes |
| `HANDOFF.md` | Registro da onda |

**Não tocados:** `src/lib/data/task.ts` (o `select("*")` já cobre), `src/lib/data/dashboard.ts` (ordenação continua por data), `src/components/tasks/task-category-manager.tsx`, `src/lib/calendar/constants.ts`, `src/components/calendar/event-modal.tsx`.

---

### Task 1: Base de dados, tipos e regra de integridade

Migração, tipo, helper de hora, schema Zod e a escrita tolerante. Vão juntos porque a regra "sem data não há hora, sem hora não há lembrete" só existe de verdade quando o schema, o tipo e a gravação concordam; separar isso em três tasks deixaria estados intermediários que não compilam ou que gravam lixo.

**Files:**
- Create: `supabase/migrations/20260701000020_task_time_reminder.sql`
- Modify: `src/lib/dates.ts`
- Modify: `src/types/task.ts`
- Modify: `src/lib/validation/task.ts`
- Modify: `src/lib/actions/task.ts`

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces:
  - `formatTimeBR(time: string): string` em `src/lib/dates.ts`, converte `"14:30:00"` ou `"14:30"` em `"14:30"`.
  - `Task.due_time: string | null` e `Task.reminder_minutes: number | null` em `src/types/task.ts`.
  - `taskInput` aceitando `due_time` e `reminder_minutes`, já normalizados.

- [ ] **Step 1: Escrever a migração**

Criar `supabase/migrations/20260701000020_task_time_reminder.sql`:

```sql
-- ============================================================
-- Assistente Pessoal v2, migração 0020: horário e lembrete na tarefa (Onda 21)
-- ============================================================

alter table public.tasks
  add column if not exists due_time         time,
  add column if not exists reminder_minutes integer;

-- faixa igual à do evento (0 = "na hora", 1440 = "1 dia antes")
alter table public.tasks drop constraint if exists tasks_reminder_minutes_range;
alter table public.tasks
  add constraint tasks_reminder_minutes_range
  check (reminder_minutes is null or (reminder_minutes >= 0 and reminder_minutes <= 1440));

-- o cron varre só as tarefas que têm lembrete de verdade
create index if not exists tasks_reminder_idx on public.tasks (due_on)
  where due_time is not null and reminder_minutes is not null;

notify pgrst, 'reload schema';
```

Nenhuma linha existente muda de valor: as duas colunas nascem nulas.

- [ ] **Step 2: Helper de hora em `src/lib/dates.ts`**

O Postgres devolve `time` como `"14:30:00"`, e tanto o `input type="time"` quanto o `composeSP` esperam `"HH:mm"`. Adicionar logo depois de `formatDateBR`:

```ts
/** Normaliza hora do banco ou do formulário para exibição e composição: "14:30:00" → "14:30". */
export function formatTimeBR(time: string): string {
  return time.slice(0, 5);
}
```

- [ ] **Step 3: Campos novos no tipo**

Em `src/types/task.ts`, dentro de `interface Task`, logo abaixo de `due_on`:

```ts
  due_on: string | null; // YYYY-MM-DD
  due_time: string | null; // HH:mm (o banco devolve HH:mm:ss)
  reminder_minutes: number | null; // minutos antes de due_on + due_time; 0 = na hora
```

- [ ] **Step 4: Campos e normalização no Zod**

Em `src/lib/validation/task.ts`, substituir o `taskInput` inteiro por:

```ts
export const taskInput = z
  .object({
    title: z.string().trim().min(1, "Título obrigatório"),
    description: z.string().trim().nullable().default(null),
    status: statusSchema.default("pending"),
    priority: prioritySchema.default("medium"),
    due_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
      .nullable()
      .default(null),
    due_time: z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida")
      .nullable()
      .default(null),
    reminder_minutes: z.number().int().min(0).max(1440).nullable().default(null),
    category_id: z.number().int().positive().nullable().default(null),
  })
  // A regra de integridade mora aqui, não na tela: sem data não há hora, e sem
  // hora não há lembrete. Vale igual para createTask e updateTask.
  .transform((v) => {
    const due_time = v.due_on && v.due_time ? v.due_time.slice(0, 5) : null;
    return { ...v, due_time, reminder_minutes: due_time === null ? null : v.reminder_minutes };
  });
export type TaskInput = z.infer<typeof taskInput>;
```

Atenção ao `due_time === null` no lugar de `!due_time`: com `reminder_minutes = 0` a diferença não aparece, mas a intenção é testar a hora, e testar string vazia por truthiness é o mesmo erro de um jeito diferente.

- [ ] **Step 5: Generalizar a tolerância a coluna inexistente**

`createTask` e `updateTask` hoje repetem o mesmo remendo só para `category_id`. Com três colunas opcionais o remendo duplicado vira erro na certa. Em `src/lib/actions/task.ts`, trocar a função `isMissingCategoryColumn` e os dois blocos que a usam por:

```ts
/** Colunas opcionais que podem não existir se a migração ainda não foi rodada. */
const OPTIONAL_TASK_COLUMNS = ["category_id", "due_time", "reminder_minutes"] as const;

/** true se o erro for "coluna <column> não existe". */
function isMissingColumn(error: PostgrestError | null, column: string): boolean {
  if (!error) return false;
  const msg = `${error.message} ${error.details ?? ""}`.toLowerCase();
  return (error.code === "42703" || error.code === "PGRST204") && msg.includes(column);
}

/**
 * Escreve a linha e, se o banco reclamar de uma coluna opcional que ainda não
 * existe (migração não rodada), tira essa coluna e tenta de novo. No máximo uma
 * tentativa extra por coluna opcional.
 */
async function writeTolerant(
  run: (payload: Record<string, unknown>) => Promise<{ error: PostgrestError | null }>,
  row: Record<string, unknown>
): Promise<void> {
  const payload = { ...row };
  for (let attempt = 0; attempt <= OPTIONAL_TASK_COLUMNS.length; attempt++) {
    const { error } = await run(payload);
    if (!error) return;
    const missing = OPTIONAL_TASK_COLUMNS.find((c) => c in payload && isMissingColumn(error, c));
    if (!missing) throw new Error(error.message);
    delete payload[missing];
  }
}
```

Em `createTask`, o trecho do insert vira:

```ts
  const row = { ...input, position, user_id: userId };
  await writeTolerant(
    (payload) => supabase.from("tasks").insert(payload).then((r) => ({ error: r.error })),
    row
  );
  revalidate();
```

Em `updateTask`, o trecho do update vira:

```ts
  await writeTolerant(
    (payload) => supabase.from("tasks").update(payload).eq("id", rowId).then((r) => ({ error: r.error })),
    input
  );
  revalidate();
```

O `.then(...)` é proposital: o builder do Supabase é *thenable*, não `Promise`, e a assinatura de `run` pede `Promise`.

- [ ] **Step 6: Verificar que compila**

```bash
npm run build
```

Esperado: build concluído sem erro de tipo. Se acusar `Property 'due_time' does not exist`, algum consumidor de `Task` ficou para trás; nenhum deveria, porque os campos são novos e opcionais em uso.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260701000020_task_time_reminder.sql src/lib/dates.ts src/types/task.ts src/lib/validation/task.ts src/lib/actions/task.ts
git commit -m "feat(tarefas): colunas de horario e lembrete, com a regra no schema"
```

---

### Task 2: Push da tarefa passa a usar o horário escolhido

**Files:**
- Modify: `src/lib/push/reminders.ts`

**Interfaces:**
- Consumes: `formatTimeBR` de `src/lib/dates.ts` (Task 1); colunas `due_time` e `reminder_minutes`.
- Produces: nada consumido por tasks seguintes.

- [ ] **Step 1: Trocar o tipo da linha de tarefa**

Em `src/lib/push/reminders.ts`, substituir:

```ts
type TaskRow = { id: number; user_id: string; title: string; due_on: string | null };
```

por:

```ts
type TaskRow = {
  id: number;
  user_id: string;
  title: string;
  due_on: string | null;
  due_time: string | null;
  reminder_minutes: number | null;
};
```

- [ ] **Step 2: Trocar o import de datas**

A linha de import passa a incluir o helper novo:

```ts
import { composeSP, formatTimeBR, spDateParts } from "@/lib/dates";
```

- [ ] **Step 3: Reescrever o bloco de tarefas**

Substituir todo o bloco que começa em `// ── Tarefas (vencem hoje; disparam às 08:00 SP) ──` e vai até o fim do `for`, por:

```ts
  // ── Tarefas (disparam em due_on + due_time, menos reminder_minutes) ──
  const { data: tkData, error: tkErr } = await admin
    .from("tasks")
    .select("id, user_id, title, due_on, due_time, reminder_minutes")
    .neq("status", "completed")
    .not("due_time", "is", null)
    .not("reminder_minutes", "is", null)
    .in("due_on", dates);
  if (tkErr) throw new Error(tkErr.message);

  for (const t of (tkData ?? []) as TaskRow[]) {
    if (!t.due_on || !t.due_time || t.reminder_minutes == null) continue;
    const time = formatTimeBR(t.due_time);
    const fireAt = new Date(composeSP(t.due_on, time)).getTime() - t.reminder_minutes * 60_000;
    if (!inWindow(fireAt)) continue;
    out.push({
      user_id: t.user_id,
      kind: "task",
      ref_id: t.id,
      occurred_on: t.due_on,
      title: t.title,
      body: `Vence às ${time}`,
      url: "/tarefas",
      tag: `task-${t.id}-${t.due_on}`,
    });
  }
```

Some com isso a constante `taskFire` e o disparo fixo das 08:00. O `dates` (ontem, hoje, amanhã) já existe acima e cobre o lembrete de 1 dia antes. O `tag` continua `task-<id>-<data>`, então a deduplicação em `notified_reminders` segue valendo sem migração.

- [ ] **Step 4: Atualizar o comentário do JSDoc da função**

Na doc de `getDueReminders`, trocar a linha

```
 *  - Tarefa pendente com due_on = hoje: dispara às 08:00 (SP).
```

por

```
 *  - Tarefa não concluída: dispara em (due_on + due_time) - reminder_minutes.
 *    Tarefa sem due_time ou sem reminder_minutes não notifica (decisão da Onda 21).
```

- [ ] **Step 5: Verificar que compila**

```bash
npm run build
```

Esperado: build sem erro. `today` continua sendo usado (monta o `dates`), então não deve sobrar variável sem uso.

- [ ] **Step 6: Commit**

```bash
git add src/lib/push/reminders.ts
git commit -m "feat(tarefas): push usa o horario e o lembrete da tarefa"
```

---

### Task 3: Hora e lembrete no modal de criar e editar

**Files:**
- Modify: `src/lib/tasks/constants.ts`
- Modify: `src/components/tasks/task-modal.tsx`

**Interfaces:**
- Consumes: `taskInput` com os campos novos (Task 1), `formatTimeBR` (Task 1).
- Produces:
  - `TASK_REMINDER_OPTIONS: { value: number | null; label: string }[]` em `src/lib/tasks/constants.ts`.
  - `reminderLabel(minutes: number | null): string`, usada pelas Tasks 4 e 5.

- [ ] **Step 1: Constantes do lembrete**

No fim de `src/lib/tasks/constants.ts`:

```ts
/**
 * Opções de lembrete da tarefa. Separadas das do calendário de propósito: a
 * tarefa tem "Na hora", o evento não, e acoplar as duas faria uma mudança no
 * calendário mexer nas tarefas.
 */
export const TASK_REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Sem lembrete" },
  { value: 0, label: "Na hora" },
  { value: 5, label: "5 minutos antes" },
  { value: 15, label: "15 minutos antes" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
  { value: 1440, label: "1 dia antes" },
];

/** Rótulo do lembrete para leitura (card e detalhe). */
export function reminderLabel(minutes: number | null): string {
  return TASK_REMINDER_OPTIONS.find((o) => o.value === minutes)?.label ?? "Sem lembrete";
}
```

- [ ] **Step 2: Estado novo no modal**

Em `src/components/tasks/task-modal.tsx`, no bloco de imports, acrescentar:

```ts
import { formatTimeBR } from "@/lib/dates";
```

e incluir `TASK_REMINDER_OPTIONS` no import que já vem de `@/lib/tasks/constants`.

Logo depois de `const [dueOn, setDueOn] = useState(editing?.due_on ?? "");`:

```ts
  const [dueTime, setDueTime] = useState(editing?.due_time ? formatTimeBR(editing.due_time) : "");
  const [reminder, setReminder] = useState<number | null>(editing?.reminder_minutes ?? null);
```

- [ ] **Step 3: Enviar os campos novos no payload**

Dentro de `save()`, o objeto `payload` passa a ser:

```ts
    const hasTime = Boolean(dueOn && dueTime);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      due_on: dueOn || null,
      due_time: hasTime ? dueTime : null,
      reminder_minutes: hasTime ? reminder : null,
      category_id: categoryId,
    };
```

- [ ] **Step 4: Trocar o campo de prazo pelos dois campos e o lembrete**

Substituir o bloco atual do prazo (o `div` com `label` "Prazo (opcional)" e o `input type="date"`) por:

```tsx
          <div className="space-y-1">
            <label className="text-sm font-medium">Prazo (opcional)</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={dueOn}
                onChange={(e) => {
                  const v = e.target.value;
                  setDueOn(v);
                  if (!v) {
                    setDueTime("");
                    setReminder(null);
                  }
                }}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={dueTime}
                disabled={!dueOn}
                title={dueOn ? "Horário da tarefa" : "Escolha uma data primeiro"}
                onChange={(e) => {
                  const v = e.target.value;
                  setDueTime(v);
                  // ao ganhar hora, já sugere 15 minutos antes; ao perder, zera
                  setReminder(v ? (reminder ?? 15) : null);
                }}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm disabled:opacity-50"
              />
            </div>
          </div>

          {dueOn && dueTime && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Lembrete</label>
              <select
                value={reminder === null ? "" : String(reminder)}
                onChange={(e) => setReminder(e.target.value === "" ? null : Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              >
                {TASK_REMINDER_OPTIONS.map((opt) => (
                  <option key={String(opt.value)} value={opt.value === null ? "" : String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
```

O `reminder ?? 15` usa `??` e não `||` de propósito: com `||`, quem tinha "Na hora" (0) perderia a escolha ao mexer no horário.

- [ ] **Step 5: Verificar no navegador**

```bash
npm run build
```

Depois, com o app rodando: abrir Tarefas, "Nova Tarefa", e conferir, nesta ordem:

1. O campo de hora começa desabilitado enquanto não há data.
2. Ao escolher a data, a hora habilita e o campo Lembrete continua escondido.
3. Ao preencher a hora, o Lembrete aparece já em "15 minutos antes".
4. Ao limpar a hora, o Lembrete some.
5. Salvar com data e hora, reabrir a tarefa em Editar, e conferir que hora e lembrete voltaram preenchidos.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tasks/constants.ts src/components/tasks/task-modal.tsx
git commit -m "feat(tarefas): campos de horario e lembrete no modal"
```

---

### Task 4: Card da lista mostra hora, sino e título em duas linhas

**Files:**
- Modify: `src/components/tasks/tasks-view.tsx`

**Interfaces:**
- Consumes: `formatTimeBR` (Task 1), `reminderLabel` (Task 3).
- Produces: nada; a Task 5 mexe no mesmo arquivo, em outro trecho.

- [ ] **Step 1: Imports**

Em `src/components/tasks/tasks-view.tsx`:

- acrescentar `Bell` à lista importada de `lucide-react`;
- trocar `import { STATUS_META, PRIORITY_META } from "@/lib/tasks/constants";` por `import { STATUS_META, PRIORITY_META, reminderLabel } from "@/lib/tasks/constants";`;
- trocar `import { todayISO, formatDateBR } from "@/lib/dates";` por `import { todayISO, formatDateBR, formatTimeBR } from "@/lib/dates";`.

- [ ] **Step 2: Título em duas linhas**

Dentro de `SortableTask`, trocar a classe do `h3` de `truncate` para `line-clamp-2`:

```tsx
          <h3 className={`line-clamp-2 text-sm font-medium ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {t.title}
          </h3>
```

- [ ] **Step 3: Hora e sino na linha do prazo**

Trocar o bloco `{t.due_on && (...)}` por:

```tsx
          {t.due_on && (
            <span className={`flex items-center gap-1 text-[11px] ${overdue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
              <CalendarClock className="h-3 w-3" />
              <span className="num">
                {formatDateBR(t.due_on)}
                {t.due_time ? ` · ${formatTimeBR(t.due_time)}` : ""}
              </span>
              {overdue ? " · atrasada" : ""}
            </span>
          )}
          {t.reminder_minutes !== null && (
            <span className="flex items-center text-muted-foreground" title={reminderLabel(t.reminder_minutes)}>
              <Bell className="h-3 w-3" />
            </span>
          )}
```

O `!== null` é obrigatório: `reminder_minutes = 0` ("Na hora") tem que mostrar o sino.

- [ ] **Step 4: Verificar no navegador**

```bash
npm run build
```

Com o app rodando, na tela de Tarefas:

1. Uma tarefa com data e hora mostra `18/08/2026 · 14:30`.
2. Uma tarefa só com data continua mostrando só a data, sem ponto solto no fim.
3. A tarefa com lembrete mostra o sino, e passar o mouse nele mostra o rótulo ("15 minutos antes").
4. Um título longo agora ocupa duas linhas antes de cortar.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/tasks-view.tsx
git commit -m "feat(tarefas): card mostra horario, sino de lembrete e titulo em duas linhas"
```

---

### Task 5: Modal de detalhe da tarefa

**Files:**
- Create: `src/components/tasks/task-detail-modal.tsx`
- Modify: `src/components/tasks/tasks-view.tsx`

**Interfaces:**
- Consumes: `Modal` de `src/components/ui/modal.tsx`; `reminderLabel`, `STATUS_META`, `PRIORITY_META` de `src/lib/tasks/constants.ts`; `formatDateBR`, `formatTimeBR`, `todayISO` de `src/lib/dates.ts`.
- Produces: `TaskDetailModal`, com as props `{ task: Task; category: TaskCategory | null; onClose: () => void; onToggle: () => void; onEdit: () => void; onRemove: () => void }`.

- [ ] **Step 1: Criar o componente**

Criar `src/components/tasks/task-detail-modal.tsx` com o conteúdo completo:

```tsx
"use client";

import { Bell, CalendarClock, Check, Edit3, RotateCcw, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { STATUS_META, PRIORITY_META, reminderLabel } from "@/lib/tasks/constants";
import { formatDateBR, formatTimeBR, todayISO } from "@/lib/dates";
import type { Task, TaskCategory } from "@/types/task";

/**
 * Leitura da tarefa por completo: título sem corte, descrição inteira, prazo
 * com hora e lembrete. Alterar é sempre por uma das três ações do rodapé, que
 * fecham o detalhe antes de agir (o objeto aqui é uma cópia e ficaria velho).
 */
export function TaskDetailModal({
  task,
  category,
  onClose,
  onToggle,
  onEdit,
  onRemove,
}: {
  task: Task;
  category: TaskCategory | null;
  onClose: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const done = task.status === "completed";
  const overdue = Boolean(task.due_on && !done && task.due_on < todayISO());
  const action =
    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors";

  return (
    <Modal onClose={onClose} title="Detalhes da tarefa">
      <div className="space-y-5">
        <div className="flex items-start gap-2">
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: PRIORITY_META[task.priority].dot }}
            title={`Prioridade ${PRIORITY_META[task.priority].label}`}
          />
          <h3 className={`break-words text-lg font-semibold leading-snug ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {task.title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_META[task.status].color}`}>
            {STATUS_META[task.status].label}
          </span>
          <span className={`text-[11px] font-medium ${PRIORITY_META[task.priority].text}`}>
            {PRIORITY_META[task.priority].label}
          </span>
          {category && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${category.color}22`, color: category.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
              {category.name}
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
            {task.due_on ? (
              <span className={overdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
                <span className="num">{formatDateBR(task.due_on)}</span>
                {task.due_time && (
                  <>
                    {" às "}
                    <span className="num">{formatTimeBR(task.due_time)}</span>
                  </>
                )}
                {overdue ? " (atrasada)" : ""}
              </span>
            ) : (
              <span className="text-muted-foreground">Sem prazo</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className={task.reminder_minutes === null ? "text-muted-foreground" : ""}>
              {reminderLabel(task.reminder_minutes)}
            </span>
          </div>
        </div>

        {task.description ? (
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{task.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground/60">Sem descrição.</p>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button onClick={onToggle} className={`${action} bg-primary text-primary-foreground hover:bg-primary/90`}>
            {done ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {done ? "Reabrir" : "Concluir"}
          </button>
          <button onClick={onEdit} className={`${action} bg-muted text-foreground hover:bg-accent`}>
            <Edit3 className="h-4 w-4" /> Editar
          </button>
          <button onClick={onRemove} className={`${action} bg-muted text-red-600 hover:bg-accent dark:text-red-400`}>
            <Trash2 className="h-4 w-4" /> Excluir
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Abrir o detalhe pelo clique no card**

Em `src/components/tasks/tasks-view.tsx`:

Importar o componente, junto dos outros imports de `./`:

```ts
import { TaskDetailModal } from "./task-detail-modal";
```

Acrescentar o estado, junto dos outros `useState` de `TasksView`:

```ts
  const [detail, setDetail] = useState<Task | null>(null);
```

Passar o handler ao card, dentro do `shown.map`, junto das outras props do `SortableTask`:

```tsx
                    onOpen={() => setDetail(t)}
```

Acrescentar a prop na assinatura de `SortableTask`, junto de `onRemove`:

```ts
  onOpen,
```

e no tipo das props:

```ts
  onOpen: () => void;
```

- [ ] **Step 3: Tornar o card clicável sem quebrar os controles**

Ainda em `SortableTask`, o `div` raiz passa a ter clique e acessibilidade de teclado:

```tsx
    <div
      ref={setNodeRef}
      style={style}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      title="Ver detalhes"
      className="glass card-glow flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4"
    >
```

E os três controles internos param a propagação, senão clicar em concluir ou excluir também abriria o detalhe:

```tsx
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
```

```tsx
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
          <Edit3 className="h-4 w-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
          <Trash2 className="h-4 w-4" />
        </button>
```

A alça de arrastar também precisa, porque um clique sem arraste nela chegaria ao card:

```tsx
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 cursor-grab touch-none text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        title="Arrastar para reordenar"
      >
```

- [ ] **Step 4: Renderizar o modal**

Ao lado dos outros modais, no fim do JSX de `TasksView`:

```tsx
      {detail && (
        <TaskDetailModal
          task={detail}
          category={detail.category_id ? catById.get(detail.category_id) ?? null : null}
          onClose={() => setDetail(null)}
          onToggle={() => { const t = detail; setDetail(null); toggle(t); }}
          onEdit={() => { setEditing(detail); setDetail(null); setModalOpen(true); }}
          onRemove={() => { const id = detail.id; setDetail(null); remove(id); }}
        />
      )}
```

As ações guardam o valor antes de fechar porque `setDetail(null)` deixa `detail` nulo no próximo render, e `toggle`/`remove` são assíncronas.

- [ ] **Step 5: Verificar no navegador**

```bash
npm run build
```

Com o app rodando, na tela de Tarefas:

1. Clicar no corpo de um card abre o detalhe; clicar no círculo de concluir, no lápis ou na lixeira **não** abre o detalhe, só faz a ação de sempre.
2. Arrastar pela alça continua reordenando, e soltar não abre o detalhe.
3. No detalhe, uma tarefa de título longo aparece inteira, e a descrição respeita as quebras de linha.
4. "Editar" fecha o detalhe e abre o formulário já preenchido.
5. "Concluir" marca e a lista reflete; reabrir o detalhe de uma concluída mostra "Reabrir".
6. "Excluir" pede confirmação e remove.
7. `Esc` fecha o detalhe (vem do primitivo `Modal`).

- [ ] **Step 6: Commit**

```bash
git add src/components/tasks/task-detail-modal.tsx src/components/tasks/tasks-view.tsx
git commit -m "feat(tarefas): modal de detalhe ao clicar na tarefa"
```

---

### Task 6: Horário da tarefa no dashboard

**Files:**
- Modify: `src/app/(app)/page.tsx`

**Interfaces:**
- Consumes: `formatTimeBR` (Task 1), `Task.due_time` (Task 1).
- Produces: nada.

- [ ] **Step 1: Import**

Em `src/app/(app)/page.tsx`, incluir `formatTimeBR` no import que já traz `formatDateBR` de `@/lib/dates`.

- [ ] **Step 2: Mostrar a hora ao lado da data**

No card "Tarefas Pendentes", trocar o bloco da data por:

```tsx
                    {t.due_on && (
                      <span className={`shrink-0 text-xs ${overdue ? "font-medium text-negative" : "text-muted-foreground"}`}>
                        {formatDateBR(t.due_on)}
                        {t.due_time ? ` · ${formatTimeBR(t.due_time)}` : ""}
                      </span>
                    )}
```

- [ ] **Step 3: Verificar no navegador**

```bash
npm run build
```

Abrir o dashboard: a tarefa com hora mostra `18/08/2026 · 14:30`, e a tarefa só com data continua igual. No celular o texto não pode empurrar o título para fora; se empurrar, é sinal de que faltou o `shrink-0` no lugar certo, que já está no código acima.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/page.tsx"
git commit -m "feat(dashboard): mostra o horario da tarefa quando houver"
```

---

### Task 7: Fechamento da onda

**Files:**
- Modify: `HANDOFF.md`

**Interfaces:**
- Consumes: tudo das tasks anteriores.
- Produces: o registro que a próxima sessão vai ler.

- [ ] **Step 1: Varreduras**

```bash
npm run build
```

```bash
rg "—|–" src
```

Esperado: build limpo e a varredura sem nenhuma ocorrência.

- [ ] **Step 2: Registrar no HANDOFF**

Atualizar a data do topo do `HANDOFF.md` para `2026-08-18`, acrescentar a Onda 21 na seção 2 (Estado atual) e uma subseção em 3 (Histórico), com:

- o que mudou: horário opcional e lembrete na tarefa, modal de detalhe, hora no dashboard;
- a regra: sem hora não há lembrete, e por consequência **as tarefas que já existiam pararam de receber o push das 08:00** até ganharem horário;
- a migração `20260701000020_task_time_reminder.sql`, marcada como **pendente de rodar pelo dono** no SQL Editor;
- a dependência operacional do `pg_cron` (seção 4, item 1), que continua valendo;
- os arquivos tocados e o commit.

Acrescentar também, na seção 4 (pendências do dono), o item de rodar a migração 0020.

- [ ] **Step 3: Commit**

```bash
git add HANDOFF.md
git commit -m "docs: registra a Onda 21 no HANDOFF"
```

---

## Ordem e dependências

```
Task 1 (base)
  ├─ Task 2 (push)
  ├─ Task 3 (modal de criar/editar)
  │    └─ Task 4 (card) ── Task 5 (detalhe)
  └─ Task 6 (dashboard)
Task 7 (fechamento, depois de todas)
```

As Tasks 4 e 5 mexem no mesmo arquivo e devem ser feitas em sequência, nesta ordem. As Tasks 2 e 6 só dependem da Task 1.

## Antes de começar

O `CLAUDE.md` exige montar a visualização no navegador com os dados e as cores reais do projeto depois do plano pronto e **antes de escrever qualquer código**, e a implementação só começa com o visual aprovado pelo dono.
