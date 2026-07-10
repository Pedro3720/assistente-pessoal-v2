# Assinaturas recorrentes (#7) — Design

**Data:** 2026-07-10
**Projeto:** `C:\Projetos\assistente-pessoal-v2` (Next.js 16.2.9 / React 19 / Supabase / TS strict)
**Status:** Aprovado — pronto para o plano de implementação

> Implementa a sugestão **#7** ("ver assinaturas recorrentes ativas"). Um rastreador de assinaturas
> **híbrido** (o usuário cadastra + o app detecta candidatos no histórico) e **só de referência** (não
> lança transações). Aparece como um **card novo dentro de `/financas`**. Segue os padrões do projeto:
> Server Components leem, Server Actions mutam, Zod, RLS `own_rows`, TS strict, sem `any`.

## 1. Objetivo
Dar visibilidade às cobranças mensais recorrentes: quais estão ativas, quanto somam por mês, o meio de
pagamento e a próxima cobrança. O app **ajuda a cadastrar** detectando cobranças que se repetem no
histórico. Nenhuma transação é gerada automaticamente — a assinatura é um registro informativo.

## 2. Decisões (brainstorming)
- **Origem:** híbrida — tabela própria (fonte da verdade) + detector de candidatos a partir das transações.
- **Papel:** só referência. Não cria/gera despesas; o usuário continua lançando o gasto real ou importando.
- **Local:** seção (card) dentro de `/financas`, no estilo de `BankManager`/`CardManager`.
- **Periodicidade:** só **mensal** (sem anual/semanal).
- **Pausar:** toggle booleano `active` (sem estado "cancelada" separado).
- **Detecção:** ≥ 3 meses distintos nos últimos 6, valores dentro de ±15%.

## 3. Fora de escopo (YAGNI)
- Lançamento automático da despesa mensal (motor de recorrência) — invade a #11.
- Ciclos anual/semanal.
- Conciliação entre a assinatura e o gasto real lançado/importado.
- Notificação/lembrete de vencimento — é a #10.
- Previsão no planejamento mensal — é a #11.

## 4. Modelo de dados — migração `20260701000010_subscriptions.sql`
Nova tabela `public.subscriptions` seguindo o padrão das demais (0000):

| coluna | tipo | notas |
|---|---|---|
| `id` | bigint identity PK | |
| `user_id` | uuid not null → `auth.users(id)` on delete cascade | |
| `name` | text not null | ex: "Netflix" |
| `icon` | text not null default `'🔁'` | emoji na linha |
| `amount` | numeric(12,2) not null check (`amount >= 0`) | valor mensal |
| `billing_day` | smallint, **nullable**, check (between 1 and 31) | dia da cobrança (opcional) |
| `category_id` | bigint → `categories(id)` on delete set null, nullable | reaproveita categorias |
| `bank_id` | bigint → `banks(id)` on delete set null, nullable | meio: débito/conta |
| `card_id` | bigint → `credit_cards(id)` on delete set null, nullable | meio: cartão |
| `active` | boolean not null default true | ativa vs pausada |
| `created_at` | timestamptz not null default now() | |
| `updated_at` | timestamptz not null default now() | trigger `set_updated_at` |

- Índice: `subscriptions_user_idx on (user_id, active)`.
- Trigger `subscriptions_set_updated_at` reusa a função `public.set_updated_at()` (já existe desde a 0000).
- RLS: `enable row level security` + policy `own_rows` (`auth.uid() = user_id`), igual às outras tabelas.
- Termina com `notify pgrst, 'reload schema';`.
- `bank_id`/`card_id` são apenas informativos (o "meio de pagamento"); um, outro, ou nenhum. Não há
  invariante forçando exclusividade — o modal deixa escolher só um por vez.
- **Operacional (fora do código):** rodar a migração no Supabase → SQL Editor (a CLI é bloqueada nesta
  máquina). Independente da 0009 (já aplicada).

## 5. Tipos — `src/types/finance.ts`
```ts
export interface Subscription {
  id: number;
  name: string;
  icon: string;
  amount: number;
  billing_day: number | null;
  category_id: number | null;
  bank_id: number | null;
  card_id: number | null;
  active: boolean;
}

/** Candidato detectado no histórico (ainda não é uma assinatura salva). */
export interface SubscriptionCandidate {
  key: string;          // descrição normalizada (chave de dedupe)
  name: string;         // descrição mais legível (ocorrência mais recente)
  amount: number;       // valor sugerido (ocorrência mais recente)
  billing_day: number;  // dia do mês mais frequente
  months: number;       // em quantos meses distintos apareceu
  category_id: number | null;
  bank_id: number | null;
  card_id: number | null;
}
```

## 6. Validação — `src/lib/validation/finance.ts`
```ts
export const subscriptionInput = z.object({
  name: z.string().trim().min(1, "Nome obrigatório"),
  icon: z.string().trim().min(1).default("🔁"),
  amount: z.number().positive("O valor deve ser maior que zero"),
  billing_day: z.number().int().min(1).max(31).nullable().default(null),
  category_id: z.number().int().nullable().default(null),
  bank_id: z.number().int().nullable().default(null),
  card_id: z.number().int().nullable().default(null),
  active: z.boolean().default(true),
});
export type SubscriptionInput = z.infer<typeof subscriptionInput>;
```
`updateSubscription` usa `subscriptionInput.partial()` (permite togglar só `active`).

## 7. Leitura — `src/lib/data/finance.ts` → `getSubscriptions(year, month)`
Função nova, chamada em paralelo no `page.tsx` (não incha `getFinanceData`). Retorna
`{ subscriptions, candidates, monthlyTotal }`.

1. **subscriptions:** `select * from subscriptions order by active desc, amount desc`.
2. **candidates (detecção):**
   - Query das despesas dos últimos 6 meses: `type='expense'`, `is_card_payment=false`,
     `is_transfer=false`, com `description, amount, occurred_on, category_id, bank_id, card_id`.
   - Normaliza a descrição: `trim().toLowerCase()`, remove sufixo de parcela `(\d+/\d+)$`, colapsa espaços.
   - Agrupa por descrição normalizada, coletando os meses distintos (`YYYY-MM`) e os valores.
   - É candidato se: **≥ 3 meses distintos** E `max - min ≤ 0.15 × mediana` dos valores.
   - Sugere: `amount` = ocorrência mais recente; `billing_day` = dia (`DD`) mais frequente;
     `category_id`/`bank_id`/`card_id` = da ocorrência mais recente; `name` = descrição original mais recente.
   - **Oculta** candidatos cuja descrição normalizada bate com o `name` normalizado de uma assinatura já
     cadastrada (evita sugerir o que já existe).
   - Ordena por `months` desc, depois `amount` desc; limita a ~5 para não poluir.
3. **monthlyTotal:** soma de `amount` das assinaturas com `active = true`.

`num()` (helper já existente) para coagir os numéricos vindos do Supabase.

## 8. Mutação — `src/lib/actions/finance.ts`
`"use server"`, mesmo padrão das demais (usa `ctx()` p/ `userId`, `revalidate()` p/ `/financas` + `/`).
- `createSubscription(raw)` → `subscriptionInput.parse` → insert `{ ...input, user_id }`.
- `updateSubscription(id, raw)` → `subscriptionInput.partial().parse` → update `.eq("id", id)`.
- `deleteSubscription(id)` → delete `.eq("id", id)`.

Adicionar de um candidato é só chamar `createSubscription` com os campos pré-preenchidos — não precisa de
action nova.

## 9. UI — `src/components/finance/subscriptions-section.tsx` (client)
Espelha o padrão de `bank-manager.tsx` / `card-manager.tsx` (card `glass`, modal via `components/ui/modal.tsx`,
`toast`, `router.refresh()`). Props: `subscriptions`, `candidates`, `monthlyTotal`, `categories`, `banks`, `cards`.

**Card "Assinaturas":**
- Header: título + **total mensal** (soma das ativas, `.num` em IBM Plex Mono) e contagem + botão "Nova".
- **Faixa de candidatos** (se houver): "Detectamos cobranças recorrentes:" seguido de chips
  `ícone Nome — R$ x,xx` com botão `+ Adicionar` que abre o modal **pré-preenchido** com o candidato.
  Some quando não há candidatos.
- **Lista de ativas:** por assinatura — ícone, nome, subtítulo (categoria · meio de pagamento ·
  "todo dia N" quando `billing_day`), valor à direita, e ações: toggle pausar/ativar, editar, excluir.
- **Próxima cobrança:** derivada de `billing_day` vs. hoje (fuso SP, `src/lib/dates.ts`) — mostra a data
  do próximo dia N (neste mês se ainda não passou, senão no próximo). Só quando `billing_day` != null.
- **Pausadas:** listadas apagadas (`opacity`) ao final, fora do total, com toggle para reativar.
- **Estado vazio:** texto curto quando não há assinaturas nem candidatos.

**Modal (criar/editar):** campos nome, ícone (emoji, opcional — default 🔁), valor (`MoneyInput`),
dia da cobrança (number 1–31, opcional), categoria (select de despesa), meio de pagamento
(select unificado: contas + cartões, "nenhum" permitido), ativa (implícito no create = true; no edit há o
toggle na lista). Excluir usa `confirm()` nativo (padrão atual do projeto).

> **Meio de pagamento — desambiguação:** como `bank_id` e `card_id` são ambos bigint e podem colidir
> (conta 1 ≠ cartão 1), o `<option>` codifica a origem no value, ex. `bank:1` / `card:3` / `""` (nenhum).
> Ao salvar, `bank:` → `{ bank_id, card_id: null }`, `card:` → `{ card_id, bank_id: null }`, `""` → ambos
> null. Garante que só um seja preenchido por vez.

Sem `any`; regra de negócio (próxima cobrança, formatação) fora do JSX, em helpers locais pequenos.

## 10. Página — `src/app/(app)/financas/page.tsx`
- Chama `getSubscriptions(year, month)` em paralelo com o `getFinanceData`/`getBankStatement` já existentes.
- Renderiza `<SubscriptionsSection ... />` numa **nova linha full-width** (`<Reveal>`), logo **após** o grid
  de contas + cartões e **antes** do bloco despesas-por-categoria + transações.
- Passa `categories`, `banks`, `cards` já carregados por `getFinanceData` (sem refazer query).

## 11. Regras de ouro respeitadas
- Datas via `src/lib/dates.ts` (fuso SP) para "próxima cobrança"; dinheiro via `src/lib/money.ts`.
- RLS `own_rows`; `user_id` sempre por `auth.getUser()` na action.
- Modal via portal (`components/ui/modal.tsx`).
- Números em `.num` (IBM Plex Mono, tabular).

## 12. Verificação
- `npm run build` sem erros (tipos, imports, Zod).
- Manual no app: criar assinatura; ver no total mensal; pausar/reativar (sai/entra no total); editar; excluir;
  ver um candidato detectado e adicioná-lo pré-preenchido; "próxima cobrança" coerente com o dia; conferir que
  assinatura **não** aparece em Receitas/Despesas nem no extrato (não é transação).
- Operacional: rodar `supabase/migrations/20260701000010_subscriptions.sql` no Supabase → SQL Editor.

## 13. Ordem sugerida de implementação
1. Migração `0010` (SQL) + tipos `Subscription`/`SubscriptionCandidate`.
2. Validação `subscriptionInput`.
3. Data `getSubscriptions` (CRUD read + detecção).
4. Actions `create/update/deleteSubscription`.
5. Componente `subscriptions-section.tsx` (lista + modal + candidatos).
6. Plugar no `financas/page.tsx`.
7. `npm run build` + verificação manual; rodar a migração no Supabase.
