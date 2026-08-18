# Onda 21: horário e lembrete na tarefa, e modal de detalhe

Data: 2026-08-18
Status: spec aprovado, aguardando plano de implementação

## 1. Objetivo

Duas melhorias na tela de Tarefas, pedidas pelo dono:

1. Ao criar uma tarefa, poder definir **horário** além da data, e um **lembrete**
   que notifica antes do horário, como já acontece no calendário.
2. Poder **clicar na tarefa e ver ela por completo**: título inteiro (hoje é
   cortado quando é grande), data, horário, lembrete e descrição.

## 2. O estado atual

| Lugar | O que faz hoje |
|---|---|
| `tasks` (banco) | Tem `due_on date`, sem hora e sem lembrete |
| `src/components/tasks/task-modal.tsx:145` | Campo "Prazo (opcional)", só `type="date"` |
| `src/components/tasks/tasks-view.tsx:263` | Título com `truncate` (1 linha) e descrição com `line-clamp-2` |
| `src/lib/push/reminders.ts:104` | Toda tarefa pendente com `due_on` = hoje dispara push às 08:00, sem o usuário pedir |
| `src/app/(app)/page.tsx:234` | Dashboard mostra a data da tarefa, sem hora |

O corte do título vem do `truncate`; não há hoje nenhum lugar no app que mostre
o título completo de uma tarefa.

O lembrete de evento já existe e funciona assim: `starts_at` menos
`reminder_minutes`, avaliado numa janela de 90 segundos pelo cron. A tarefa é o
caso degenerado disso, com hora fixa às 08:00 e sem escolha do usuário.

## 3. Decisões tomadas

| Tema | Decisão | Por quê |
|---|---|---|
| Horário | Opcional | Tarefa sem hora ("algum dia") continua existindo, e nada do que já está cadastrado quebra |
| Lembrete sem horário | **Não existe** | Regra única e previsível: aviso só sai de tarefa com hora marcada |
| Disparo automático das 08:00 | **Sai** | Vira lembrete escolhido por tarefa; sem hora, sem aviso |
| Tarefas antigas | Não recebem migração de dados | Todas têm data e nenhuma tem hora, então param de avisar até o dono abrir e definir um horário. Decisão consciente dele |
| Clique na tarefa | Abre modal de detalhe, só leitura | Ler e alterar ficam separados; evita alterar sem querer quando só se queria conferir |
| Título no card | Até 2 linhas, depois reticências | Na maioria dos casos o nome inteiro já aparece na lista, e o modal cobre o resto |
| Hora âncora configurável no perfil | Descartada | YAGNI: só faria sentido se lembrete sem horário existisse, e ele não existe |

**Alternativas de modelagem descartadas:**

- Trocar `due_on date` por `due_at timestamptz`: obrigaria a mexer em toda
  comparação de data do app (ordenação do dashboard, cálculo de "atrasada",
  filtro do push) por ganho zero, já que a data sem hora precisa continuar
  existindo.
- Tabela separada de lembretes: só se pagaria com vários lembretes por tarefa,
  que não é o pedido.

## 4. O que muda

### 4.1 Banco: migração `20260701000020_task_time_reminder.sql`

Duas colunas novas em `tasks`, ambas `null` por padrão:

| Coluna | Tipo | Restrição |
|---|---|---|
| `due_time` | `time` | nullable |
| `reminder_minutes` | `integer` | nullable, `check (reminder_minutes between 0 and 1440)` |

Nenhuma linha existente muda de valor. A migração é rodada manualmente pelo
dono no Supabase, SQL Editor (a CLI é bloqueada nesta máquina).

### 4.2 Integridade: a regra mora no Zod, não só na tela

Em `src/lib/validation/task.ts`, `taskInput` ganha os dois campos e uma
normalização em cadeia:

- sem `due_on` implica `due_time = null`;
- sem `due_time` implica `reminder_minutes = null`.

A normalização acontece no schema, então vale para `createTask` e `updateTask`
igualmente, e dado inconsistente não entra por caminho antigo nem por edição
fora da tela nova.

`src/types/task.ts` ganha `due_time: string | null` e
`reminder_minutes: number | null` na interface `Task`.

### 4.3 Push: `src/lib/push/reminders.ts`

O bloco de tarefas passa a espelhar o de eventos:

- seleciona tarefas não concluídas com `due_on`, `due_time` e
  `reminder_minutes` não nulos, nas mesmas três datas candidatas que os eventos
  já usam (ontem, hoje, amanhã, o que cobre o lembrete de 1 dia);
- `fireAt = composeSP(due_on, due_time)` menos `reminder_minutes` em minutos;
- mesma janela de 90 segundos e mesmo `tag` (`task-<id>-<data>`), então a
  deduplicação em `notified_reminders` continua valendo sem migração.

Sai o disparo fixo às 08:00 e sai o filtro por `due_on = hoje`.

Texto da notificação, espelhando o evento ("Começa às HH:MM"):

- título: o título da tarefa;
- corpo: `Vence às HH:MM`;
- url: `/tarefas` (inalterado).

### 4.4 Modal de criar/editar (`task-modal.tsx`)

- O campo "Prazo (opcional)" vira uma linha com **Data** e **Hora** lado a lado.
  A hora fica desabilitada enquanto não houver data.
- Com a hora preenchida, aparece abaixo o select **Lembrete**, com as opções:
  `Sem lembrete`, `Na hora`, `5 minutos antes`, `15 minutos antes`,
  `30 minutos antes`, `1 hora antes`, `1 dia antes`.
- Padrão ao preencher a hora: **15 minutos antes** (mesmo padrão do evento).
- Limpar a hora esconde e zera o lembrete; limpar a data zera hora e lembrete.
  A regra fica visível na tela em vez de virar erro no salvar.
- As opções ficam numa constante nova em `src/lib/tasks/constants.ts`
  (`TASK_REMINDER_OPTIONS`), não reaproveitadas de `calendar/constants.ts`: a
  lista da tarefa tem "Na hora", que o evento não tem, e acoplar as duas faria
  uma mudança no calendário mexer nas tarefas.

### 4.5 Card da lista (`tasks-view.tsx`)

- Título passa de `truncate` para 2 linhas com reticências.
- A linha do prazo mostra `18/08/2026 · 14:30` quando há hora, e um ícone de
  sino quando há lembrete.
- O card inteiro fica clicável e abre o detalhe. A alça de arrastar, o círculo
  de concluir e os botões de editar e excluir continuam funcionando como hoje,
  isolados do clique do card.

### 4.6 Modal de detalhe, novo (`src/components/tasks/task-detail-modal.tsx`)

Só leitura, sem campo de formulário:

- título completo, sem corte;
- chips de status, prioridade e categoria, com as mesmas cores da lista;
- prazo com data, hora e o aviso de atrasada;
- lembrete por extenso ("15 minutos antes");
- descrição inteira, com as quebras de linha preservadas;
- rodapé com três ações: Concluir ou Reabrir, Editar (fecha o detalhe e abre o
  modal de edição já preenchido) e Excluir (mesma confirmação de hoje).

Componente separado porque `tasks-view.tsx` já tem 324 linhas com filtro, drag
and drop e lista, e o detalhe não compartilha estado com nada disso.

### 4.7 Dashboard (`src/app/(app)/page.tsx:234`)

Onde a tarefa mostra a data, passa a mostrar a hora quando houver. Sem isso o
horário existiria só na tela de Tarefas e pareceria dado perdido.

## 5. O que NÃO muda

- Ordenação das tarefas (continua por `position`, e no dashboard por `due_on`).
- Cálculo de "atrasada", que continua comparando só a data.
- Categorias, prioridades, status, filtros e reordenar por arrastar.
- Lembretes de evento no calendário.
- Tabelas `push_subscriptions` e `notified_reminders`.

## 6. Dependência operacional (do dono, não é código)

O push depende do agendamento que segue listado como pendente no `HANDOFF.md`,
seção 4, item 1. As chaves `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT` e `CRON_SECRET` já estão no `.env.local`, mas se o `pg_cron`
não estiver chamando `/api/cron/reminders` no Supabase, nenhum lembrete chega,
nem de tarefa nem de evento. Confirmar isso antes de julgar a feature quebrada.

## 7. Consequências esperadas

- Tarefa com data e sem hora deixa de notificar. Isso vale para todas as que já
  existem hoje, e é a decisão consciente registrada em 3.
- A lista fica um pouco mais alta quando há títulos de duas linhas.
- Push de tarefa passa a chegar na hora escolhida, não mais às 08:00.

## 8. Fora de escopo

- Vários lembretes por tarefa.
- Tarefa recorrente.
- Hora padrão de lembrete configurável no perfil.
- Lembrete por e-mail.
- Sincronizar tarefa com o Google Calendar.

## 9. Riscos

| Risco | Mitigação |
|---|---|
| Migração não rodada em produção | As colunas são opcionais; o app trata ausência como "sem hora, sem lembrete" pelo mesmo padrão de `isMissingCategoryColumn` já usado em `actions/task.ts` |
| Clique do card conflitar com arrastar | O `PointerSensor` já exige 5px de movimento; o clique só dispara sem arraste, e os controles internos param a propagação |
| Fuso horário | Toda composição de instante passa por `composeSP`/`spDateParts` (`src/lib/dates.ts`), como o evento já faz |

## 10. Validação

- `npm run build` limpo.
- Varredura `rg "—|–" src` sem ocorrência.
- Verificação manual: criar tarefa com data e hora, ver o horário na lista e no
  dashboard, abrir o detalhe de uma tarefa com título longo e descrição longa,
  editar e excluir pelo detalhe, e conferir que limpar a hora apaga o lembrete.
