# Planejamento Mensal (#11) — Design

**Data:** 2026-07-10
**Projeto:** `C:\Projetos\assistente-pessoal-v2` (Next.js 16.2.9 / React 19 / Supabase / TS strict)
**Status:** Aprovado — pronto para o plano de implementação

> Implementa a sugestão **#11** ("aba de planejamento mensal — gastos/ganhos previstos ainda não
> realizados"). O usuário lista **contas previstas** (a pagar/receber) do mês; ao marcar uma como
> **realizada**, o app **lança a transação** correspondente em Finanças e vincula o item a ela. Itens são
> **avulsos por mês**, com as **assinaturas ativas (#7)** aparecendo como despesas previstas sugeridas.
> Vive como uma **seção nova dentro de `/financas`**, no estilo do card de Assinaturas. Segue os padrões do
> projeto: Server Components leem, Server Actions mutam, Zod, RLS `own_rows`, TS strict, sem `any`.

## 1. Objetivo
Dar visibilidade ao que **ainda vai acontecer** no mês (e nos meses seguintes): quanto se espera receber,
quanto se espera pagar, e o saldo previsto. Cada conta prevista tem descrição, valor, data prevista,
categoria e meio de pagamento. Quando de fato acontece, um clique em **Realizar** lança a transação real —
fechando o ciclo previsto → realizado sem digitar duas vezes.

## 2. Decisões (brainstorming)
- **Conceito:** contas previstas individuais (a pagar/receber), não orçamento por categoria.
- **Realizar:** cria a transação automaticamente e **vincula** o item a ela (`transaction_id`).
- **Recorrência:** itens **avulsos por mês** (o mês deriva de `due_date`). As **assinaturas ativas** entram
  como **sugestões** (chips "+adicionar"), reaproveitando o padrão dos "candidatos" de assinatura.
- **Local:** seção (card) dentro de `/financas`, abaixo de Assinaturas (estilo `SubscriptionsSection`).
- **Meses futuros:** liberar a navegação de mês do `/financas` (hoje travada em `Math.min(0, …)`) para
  permitir planejar com antecedência.

## 3. Modelo central — "previsto" vira "realizado"
Sem coluna de status separada. O vínculo com a transação **é** o status:
- `transaction_id = null` → **a realizar** (pendente).
- `transaction_id` preenchido → **realizado**.
- **Realizar** = inserir a transação (dados do item) e gravar o id no item.
- **Desfazer** = excluir a transação vinculada.
- A FK `transaction_id` usa **`on delete set null`**: excluir a transação direto em `/financas` reverte o
  item para pendente automaticamente. Previsto e realizado ficam sempre consistentes, sem re-sincronização.

> Alternativa descartada: coluna `status` solta + conciliação. Permitiria estados divergentes (item
> "realizado" apontando para transação inexistente). O vínculo por FK evita isso de graça.

## 4. Modelo de dados — migração `20260701000011_planned_items.sql`
Nova tabela `public.planned_items`, no mesmo molde das demais (0000):

| coluna | tipo | notas |
|---|---|---|
| `id` | bigint identity PK | |
| `user_id` | uuid not null → `auth.users(id)` on delete cascade | |
| `description` | text not null | ex: "Aluguel" |
| `amount` | numeric(12,2) not null check (`amount >= 0`) | valor previsto (sempre positivo) |
| `type` | text not null check (`type in ('income','expense')`) | receita/despesa prevista |
| `category_id` | bigint → `categories(id)` on delete set null, nullable | reaproveita categorias |
| `bank_id` | bigint → `banks(id)` on delete set null, nullable | meio de pagamento |
| `card_id` | bigint → `credit_cards(id)` on delete set null, nullable | meio de pagamento |
| `due_date` | **date not null** | data prevista; **o mês do item deriva daqui** (igual `occurred_on`) |
| `transaction_id` | bigint → `transactions(id)` **on delete set null**, nullable | vínculo; != null = realizado |
| `created_at` | timestamptz not null default now() | |
| `updated_at` | timestamptz not null default now() | trigger `set_updated_at` |

- Índice: `planned_items_user_date_idx on (user_id, due_date)`.
- Trigger `planned_items_set_updated_at` reusa `public.set_updated_at()` (existe desde a 0000).
- RLS: `enable row level security` + policy `own_rows` (`auth.uid() = user_id`), igual às outras tabelas.
- Termina com `notify pgrst, 'reload schema';`.
- `bank_id`/`card_id` são o "meio de pagamento" (um, outro, ou nenhum) — sem invariante forçando
  exclusividade; o modal deixa escolher só um por vez (mesmo esquema `bank:`/`card:` das assinaturas).
- **Operacional (fora do código):** rodar a migração no Supabase → SQL Editor (a CLI é bloqueada nesta
  máquina). Independente das demais (só requer `transactions`/`categories`/`banks`/`credit_cards` da 0000).

## 5. Tipos — `src/types/finance.ts`
```ts
export interface PlannedItem {
  id: number;
  description: string;
  amount: number;
  type: TxType;
  category_id: number | null;
  bank_id: number | null;
  card_id: number | null;
  due_date: string;              // YYYY-MM-DD (data prevista)
  transaction_id: number | null; // null = a realizar; preenchido = realizado
}

/** Despesa prevista sugerida a partir de uma assinatura ativa (#7). */
export interface PlanSuggestion {
  key: string;              // nome normalizado (chave de dedupe)
  name: string;             // nome da assinatura
  amount: number;           // valor mensal da assinatura
  due_date: string;         // mês visualizado + billing_day (com clamp do dia)
  category_id: number | null;
  bank_id: number | null;
  card_id: number | null;
}
```

## 6. Validação — `src/lib/validation/finance.ts`
```ts
export const plannedItemInput = z.object({
  description: z.string().trim().min(1, "Descrição obrigatória"),
  amount: z.number().positive("O valor deve ser maior que zero"),
  type: txTypeSchema,
  category_id: z.number().int().nullable().default(null),
  bank_id: z.number().int().nullable().default(null),
  card_id: z.number().int().nullable().default(null),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});
export type PlannedItemInput = z.infer<typeof plannedItemInput>;
```
`updatePlannedItem` usa `plannedItemInput.partial()`.

## 7. Leitura — `src/lib/data/finance.ts` → `getMonthlyPlan(year, month)`
Função nova, chamada em paralelo no `page.tsx` (não incha `getFinanceData`), com fallback vazio se a tabela
não existir (não quebra a página, igual a `getSubscriptions`). Retorna `{ items, suggestions, totals }`.

1. **items:** `select * from planned_items` com `due_date` dentro de `monthBounds(year, month)`,
   ordenados por pendentes-primeiro (`transaction_id` nulls first) e depois `due_date`.
2. **suggestions:** carrega assinaturas **ativas**; para cada assinatura cujo nome (normalizado com
   `normalizeDesc`, já existente) **não** casa com a descrição de nenhum item previsto **deste mês**,
   gera uma `PlanSuggestion` de despesa: `amount` = valor da assinatura; `due_date` = `${year}-${MM}-DD`
   onde `DD` = `billing_day` da assinatura (ou 1), com *clamp* ao último dia do mês;
   `category_id`/`bank_id`/`card_id` = os da assinatura. Mesmo espírito dos "candidatos".
3. **totals:** `previstoReceber` (Σ `amount` dos `income`), `previstoPagar` (Σ `amount` dos `expense`),
   `saldoPrevisto = previstoReceber - previstoPagar`, e `pendentes` (contagem de itens com
   `transaction_id = null`).

`num()` (helper existente) para coagir os numéricos do Supabase.

## 8. Mutação — `src/lib/actions/finance.ts`
`"use server"`, mesmo padrão (usa `ctx()` p/ `userId`, `revalidate()` p/ `/financas` + `/`).
- `createPlannedItem(raw)` → `plannedItemInput.parse` → insert `{ ...input, user_id }`.
- `updatePlannedItem(id, raw)` → `plannedItemInput.partial().parse` → update `.eq("id", id)`.
- `deletePlannedItem(id)` → delete `.eq("id", id)`.
- `realizePlannedItem(id)`:
  1. `ctx()`; carrega o item (`select ... eq id single`); se `transaction_id != null`, retorna (já realizado).
  2. monta o input da transação via `normalizeTx({ description, amount, type, category_id, bank_id,
     card_id, is_card_payment: false, occurred_on: due_date })` — compra no cartão → `bank_id null` → fatura.
  3. `insert` na `transactions` com `.select("id").single()`.
  4. `update planned_items set transaction_id = <novo id> where id`.
  5. `revalidate()`.
- `unrealizePlannedItem(id)`:
  1. carrega o item; se `transaction_id` for null, retorna.
  2. `delete from transactions where id = transaction_id` (a FK `on delete set null` zera o
     `transaction_id` do item → volta a pendente). `revalidate()`.

Adicionar uma sugestão = chamar `createPlannedItem` com os campos pré-preenchidos (type `expense`) — sem
action nova.

**Comportamento (documentado para a UI):** excluir um item **realizado** *não* apaga a transação (o gasto
real permanece; só some do planejamento). Editar um item já realizado **não** re-sincroniza a transação —
por isso a UI só permite **editar itens pendentes**; para mexer no realizado, usar **Desfazer**.

## 9. UI — `src/components/finance/planning-section.tsx` (client)
Espelha `subscriptions-section.tsx` (card `glass`, modal via `components/ui/modal.tsx`, `toast`,
`router.refresh()`, select unificado de meio de pagamento com `bank:`/`card:`). Props: `items`,
`suggestions`, `totals`, `categories`, `banks`, `cards`, `defaultDate` (data padrão do mês visualizado).

**Card "Planejamento do mês":**
- **Header:** título + resumo — **previsto a receber** / **a pagar** / **saldo previsto** (`.num`, IBM Plex
  Mono; saldo verde/vermelho) — e botão "Novo".
- **Faixa de sugestões** (se houver): "Suas assinaturas ainda não previstas neste mês:" seguido de chips
  `ícone Nome — R$ x,xx` com "+adicionar", que abrem o modal **pré-preenchido** (despesa). Some quando vazio.
- **"A realizar"** (pendentes, `transaction_id = null`): por item — seta ↑ (receita, verde) / ↓ (despesa),
  descrição, subtítulo (categoria · meio de pagamento · data prevista `formatDateBR`), valor à direita;
  ações: **Realizar** (✓ → cria a transação), **Editar**, **Excluir**.
- **"Realizados"** (`transaction_id != null`): listados apagados (`opacity`) com selo "lançado"; ações
  **Desfazer** (remove a transação vinculada) e **Excluir**. Sem botão Editar.
- **Estado vazio:** texto curto quando não há itens nem sugestões.

**Modal (criar/editar):** toggle **Receita/Despesa** · descrição · valor (`MoneyInput`) · **data prevista**
(input `date`, default = `defaultDate` do mês visualizado) · categoria (select filtrado pelo tipo escolhido)
· meio de pagamento (select unificado contas + cartões, "nenhum" permitido). Excluir/desfazer via `confirm()`
nativo (padrão atual do projeto). Sem `any`; regra de negócio (próxima data, formatação, parse do meio de
pagamento) em helpers locais pequenos, fora do JSX.

> **Meio de pagamento — desambiguação:** `bank_id` e `card_id` podem colidir (conta 1 ≠ cartão 1). O
> `<option>` codifica a origem no value (`bank:1` / `card:3` / `""`). Ao salvar, `bank:` →
> `{ bank_id, card_id: null }`, `card:` → `{ card_id, bank_id: null }`, `""` → ambos null. (Idêntico às
> assinaturas.)

## 10. Página — `src/app/(app)/financas/page.tsx` + navegação de meses futuros
- **Liberar futuro:** trocar `const offset = Math.min(0, Number(m) || 0)` por `const offset = Number(m) || 0`
  (permite offset positivo). No `MonthNav` (`src/components/finance/month-nav.tsx`), remover
  `disabled={offset >= 0}` do botão "próximo mês". O `defaultDate` já cobre mês ≠ atual (dia 01). Bônus:
  parcelas de meses futuros passam a aparecer no mês correto.
- Chamar `getMonthlyPlan(year, month)` em paralelo com o que já existe (`.catch(() => vazio)`).
- Renderizar `<PlanningSection ... />` numa **nova linha full-width** (`<Reveal>`), logo **após**
  `<SubscriptionsSection/>`, reaproveitando `categories`/`banks`/`cards` já carregados por `getFinanceData`.

## 11. Regras de ouro respeitadas
- Datas via `src/lib/dates.ts` (fuso SP) para `due_date`/clamp; dinheiro via `src/lib/money.ts`.
- RLS `own_rows`; `user_id` sempre por `auth.getUser()` na action.
- Modal via portal (`components/ui/modal.tsx`); números em `.num` (IBM Plex Mono, tabular).
- Server Components leem (`data/*`), Server Actions mutam (`actions/*`), Zod em `validation/*`. Sem `any`.
- Invariante de finanças respeitada ao realizar: compra no cartão via `normalizeTx` (`bank_id null` → fatura).

## 12. Fora de escopo (YAGNI)
- Orçamento por categoria (limites de gasto) — é a outra leitura de #11, não escolhida.
- Motor de recorrência "de verdade" (item que se replica sozinho todo mês) — as assinaturas cobrem o
  recorrente fixo; aqui os itens são avulsos + sugestões.
- Conciliação automática (casar previsto com transação real por valor/descrição).
- Notificações/lembrete de vencimento — é a #10.
- Editar item realizado re-sincronizando a transação; "copiar mês anterior".

## 13. Verificação
- `npm run build` sem erros (tipos, imports, Zod).
- Manual no app: criar item previsto (receita e despesa); ver nos totais previstos; **Realizar** → a
  transação aparece em `/financas` e o item vai para "Realizados"; **Desfazer** → some a transação e o item
  volta a "A realizar"; excluir a transação direto em `/financas` → item volta a pendente (FK set null);
  adicionar uma sugestão de assinatura pré-preenchida; navegar para o **próximo mês** e planejar; conferir
  que o item previsto **não** conta em Receitas/Despesas nem no extrato enquanto não é realizado.
- Operacional: rodar `supabase/migrations/20260701000011_planned_items.sql` no Supabase → SQL Editor.

## 14. Ordem sugerida de implementação
1. Migração `0011` (SQL) + tipos `PlannedItem`/`PlanSuggestion`.
2. Validação `plannedItemInput`.
3. Data `getMonthlyPlan` (leitura + sugestões a partir das assinaturas).
4. Actions `create/update/delete/realize/unrealizePlannedItem`.
5. Componente `planning-section.tsx` (lista A realizar/Realizados + modal + sugestões).
6. Liberar meses futuros (`page.tsx` + `month-nav.tsx`) e plugar `<PlanningSection/>` no `financas/page.tsx`.
7. `npm run build` + verificação manual; rodar a migração no Supabase.
