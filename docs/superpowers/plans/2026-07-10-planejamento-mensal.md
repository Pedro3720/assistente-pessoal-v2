# Planejamento Mensal (#11) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma seção de **contas previstas** (a pagar/receber) dentro de `/financas`; marcar uma como realizada lança a transação correspondente e a vincula ao item; assinaturas ativas aparecem como sugestões; a navegação de mês passa a permitir meses futuros.

**Architecture:** Tabela nova `planned_items` (RLS `own_rows`) com `transaction_id` (FK `on delete set null`) que **é** o status: null = a realizar, preenchido = realizado. Server Component lê via `getMonthlyPlan` (itens do mês + sugestões derivadas das assinaturas ativas + totais). Server Actions mutam, incluindo `realize`/`unrealizePlannedItem` que criam/removem a transação real. Uma seção client (`planning-section.tsx`) faz o CRUD + realizar/desfazer via modal.

**Tech Stack:** Next.js 16.2.9 (App Router) · React 19 · TypeScript strict · Supabase (@supabase/ssr) · Zod · Tailwind v4 · lucide-react · sonner.

## Global Constraints

- **Sem framework de testes.** O gate de cada task é **`npm run build`** sem erros (tipos, lint, Zod) + verificação manual no app na última task. Não escrever testes automatizados.
- **TS strict, proibido `any`.** Variáveis/imports não usados quebram o build — não deixar órfãos.
- **Arquitetura:** Server Components leem (`src/lib/data/*`); Server Actions mutam (`src/lib/actions/*`, `"use server"`, Zod em `src/lib/validation/*`, `user_id` via `auth.getUser()`, `revalidatePath`). Tipos em `src/types/*`. RLS `own_rows` em toda tabela.
- **Datas:** só via `src/lib/dates.ts` (fuso SP) — nunca `toISOString().split`. **Dinheiro:** `src/lib/money.ts` (`formatBRL`/`parseBRL`). Números na UI usam a classe `.num` (IBM Plex Mono).
- **Modais:** `src/components/ui/modal.tsx` (portal). Exclusões/desfazer usam `confirm()` nativo (padrão atual).
- **Migração:** a CLI do Supabase é bloqueada nesta máquina. O arquivo SQL é criado no repo; **rodar manualmente** no Supabase → SQL Editor é passo operacional (na última task).
- **Meio de pagamento:** `bank_id`/`card_id` só informativos; no `<select>` unificado o value é `bank:<id>` / `card:<id>` / `""`.
- **Invariante de finanças ao realizar:** compra no cartão passa por `normalizeTx` (`bank_id` vira NULL → cai na fatura).

---

### Task 1: Migração `0011` + tipos

**Files:**
- Create: `supabase/migrations/20260701000011_planned_items.sql`
- Modify: `src/types/finance.ts` (append no fim)

**Interfaces:**
- Consumes: tabela `transactions`/`categories`/`banks`/`credit_cards` (migr. 0000); tipo `TxType` (já no topo de `finance.ts`).
- Produces: tabela `public.planned_items`; tipos `PlannedItem`, `PlanSuggestion`.

- [ ] **Step 1: Criar a migração SQL**

Create `supabase/migrations/20260701000011_planned_items.sql`:

```sql
-- ============================================================
-- Migração 0011: Planejamento mensal (#11)
-- Cole e rode no Supabase → SQL Editor.
-- Requer transactions/categories/banks/credit_cards (migr. 0000).
-- ============================================================

create table if not exists public.planned_items (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  description    text not null,
  amount         numeric(12,2) not null default 0 check (amount >= 0),
  type           text not null check (type in ('income','expense')),
  category_id    bigint references public.categories(id) on delete set null,
  bank_id        bigint references public.banks(id) on delete set null,
  card_id        bigint references public.credit_cards(id) on delete set null,
  due_date       date not null default current_date,
  transaction_id bigint references public.transactions(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists planned_items_user_date_idx on public.planned_items (user_id, due_date);
drop trigger if exists planned_items_set_updated_at on public.planned_items;
create trigger planned_items_set_updated_at before update on public.planned_items
  for each row execute function public.set_updated_at();

alter table public.planned_items enable row level security;
drop policy if exists "own_rows" on public.planned_items;
create policy "own_rows" on public.planned_items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Adicionar os tipos**

Append ao final de `src/types/finance.ts`:

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

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: compila sem erros de tipo.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260701000011_planned_items.sql src/types/finance.ts
git commit -m "feat(financas): migracao 0011 + tipos de planejamento (#11)"
```

---

### Task 2: Validação `plannedItemInput`

**Files:**
- Modify: `src/lib/validation/finance.ts` (append)

**Interfaces:**
- Consumes: `z` e `txTypeSchema` (já no arquivo).
- Produces: `plannedItemInput` (Zod), tipo `PlannedItemInput`.

- [ ] **Step 1: Adicionar o schema**

Append ao final de `src/lib/validation/finance.ts`:

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

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/validation/finance.ts
git commit -m "feat(financas): validacao de item previsto (#11)"
```

---

### Task 3: Leitura — `getMonthlyPlan`

**Files:**
- Modify: `src/lib/data/finance.ts` (import de tipos + append de função)

**Interfaces:**
- Consumes: `createClient`, `monthBounds`, `num` (já no arquivo), `normalizeDesc` (função privada já existente na seção Assinaturas do arquivo), tipos `PlannedItem`/`PlanSuggestion`/`Subscription`.
- Produces: `getMonthlyPlan(year, month) => Promise<{ items: PlannedItem[]; suggestions: PlanSuggestion[]; totals: { previstoReceber: number; previstoPagar: number; saldoPrevisto: number; pendentes: number } }>` e o tipo `MonthlyPlanData`.

- [ ] **Step 1: Adicionar os tipos ao import de `@/types/finance`**

Em `src/lib/data/finance.ts`, no bloco `import type { ... } from "@/types/finance";`, acrescentar `PlannedItem` e `PlanSuggestion` à lista existente (que já traz `Subscription`):

```ts
import type {
  Bank,
  BankWithBalance,
  CreditCard,
  CardWithInvoice,
  Category,
  Transaction,
  Subscription,
  SubscriptionCandidate,
  PlannedItem,
  PlanSuggestion,
} from "@/types/finance";
```

- [ ] **Step 2: Adicionar `getMonthlyPlan`**

Append ao final de `src/lib/data/finance.ts`:

```ts
// ─── Planejamento mensal ──────────────────────────────────

/**
 * Itens previstos do mês (due_date no mês) + sugestões vindas das assinaturas
 * ativas ainda não previstas neste mês + totais previstos.
 * Reusa normalizeDesc (seção Assinaturas) para deduplicar as sugestões.
 * Fallback vazio se a tabela `planned_items` ainda não existir (não quebra a página).
 */
export async function getMonthlyPlan(year: number, month: number) {
  const supabase = await createClient();
  const { start, end } = monthBounds(year, month);

  const [itemsRes, subsRes] = await Promise.all([
    supabase
      .from("planned_items")
      .select("*")
      .gte("due_date", start)
      .lte("due_date", end)
      .order("transaction_id", { ascending: true, nullsFirst: true })
      .order("due_date", { ascending: true }),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("active", true)
      .order("amount", { ascending: false }),
  ]);

  const emptyTotals = { previstoReceber: 0, previstoPagar: 0, saldoPrevisto: 0, pendentes: 0 };
  if (itemsRes.error) {
    return { items: [] as PlannedItem[], suggestions: [] as PlanSuggestion[], totals: emptyTotals };
  }

  const items = (itemsRes.data ?? []) as PlannedItem[];
  const subs = subsRes.error ? [] : ((subsRes.data ?? []) as Subscription[]);

  // dedupe: assinatura cujo nome já existe como item previsto neste mês não vira sugestão
  const plannedKeys = new Set(items.map((i) => normalizeDesc(i.description)));
  const lastDay = Number(end.slice(8, 10));
  const suggestions: PlanSuggestion[] = subs
    .filter((s) => !plannedKeys.has(normalizeDesc(s.name)))
    .map((s) => {
      const day = Math.min(s.billing_day ?? 1, lastDay);
      const due_date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return {
        key: normalizeDesc(s.name),
        name: s.name,
        amount: num(s.amount),
        due_date,
        category_id: s.category_id,
        bank_id: s.bank_id,
        card_id: s.card_id,
      };
    });

  let previstoReceber = 0;
  let previstoPagar = 0;
  let pendentes = 0;
  for (const i of items) {
    if (i.type === "income") previstoReceber += num(i.amount);
    else previstoPagar += num(i.amount);
    if (i.transaction_id === null) pendentes += 1;
  }

  return {
    items,
    suggestions,
    totals: {
      previstoReceber,
      previstoPagar,
      saldoPrevisto: previstoReceber - previstoPagar,
      pendentes,
    },
  };
}

export type MonthlyPlanData = Awaited<ReturnType<typeof getMonthlyPlan>>;
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: compila sem erros (função exportada mas ainda não consumida — ok).

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/finance.ts
git commit -m "feat(financas): getMonthlyPlan (itens previstos + sugestoes) (#11)"
```

---

### Task 4: Server Actions de item previsto

**Files:**
- Modify: `src/lib/actions/finance.ts` (imports + append de 5 actions)

**Interfaces:**
- Consumes: `plannedItemInput` (Task 2), `ctx()`, `revalidate()`, `normalizeTx()` (já no arquivo), tipo `PlannedItem` (Task 1).
- Produces: `createPlannedItem(raw)`, `updatePlannedItem(id, raw)`, `deletePlannedItem(id)`, `realizePlannedItem(id)`, `unrealizePlannedItem(id)`.

- [ ] **Step 1: Importar o schema e o tipo**

Em `src/lib/actions/finance.ts`, no bloco de import de `@/lib/validation/finance`, adicionar `plannedItemInput`:

```ts
import {
  transactionInput,
  bankInput,
  cardInput,
  categoryInput,
  installmentInput,
  transferInput,
  subscriptionInput,
  plannedItemInput,
  type TransactionInput,
} from "@/lib/validation/finance";
```

E adicionar, logo abaixo desse bloco de import, uma linha nova para o tipo:

```ts
import type { PlannedItem } from "@/types/finance";
```

- [ ] **Step 2: Adicionar as actions**

Append ao final de `src/lib/actions/finance.ts`:

```ts
// ─── Planejamento mensal ──────────────────────────────────
export async function createPlannedItem(raw: unknown) {
  const input = plannedItemInput.parse(raw);
  const { supabase, userId } = await ctx();
  const { error } = await supabase
    .from("planned_items")
    .insert({ ...input, user_id: userId });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function updatePlannedItem(id: number, raw: unknown) {
  const input = plannedItemInput.partial().parse(raw);
  const { supabase } = await ctx();
  const { error } = await supabase.from("planned_items").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deletePlannedItem(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("planned_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

/** Lança a transação real a partir do item e vincula (transaction_id). */
export async function realizePlannedItem(id: number) {
  const { supabase, userId } = await ctx();
  const { data, error: readErr } = await supabase
    .from("planned_items")
    .select("*")
    .eq("id", id)
    .single();
  if (readErr) throw new Error(readErr.message);
  const item = data as PlannedItem;
  if (item.transaction_id != null) return; // já realizado

  const txInput = normalizeTx({
    description: item.description,
    amount: Number(item.amount),
    type: item.type,
    category_id: item.category_id,
    bank_id: item.bank_id,
    card_id: item.card_id,
    is_card_payment: false,
    occurred_on: item.due_date,
  });

  const { data: tx, error: insErr } = await supabase
    .from("transactions")
    .insert({ ...txInput, user_id: userId })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);

  const { error: linkErr } = await supabase
    .from("planned_items")
    .update({ transaction_id: (tx as { id: number }).id })
    .eq("id", id);
  if (linkErr) throw new Error(linkErr.message);
  revalidate();
}

/** Desfaz: remove a transação vinculada (a FK on delete set null volta o item a pendente). */
export async function unrealizePlannedItem(id: number) {
  const { supabase } = await ctx();
  const { data, error: readErr } = await supabase
    .from("planned_items")
    .select("transaction_id")
    .eq("id", id)
    .single();
  if (readErr) throw new Error(readErr.message);
  const txId = (data as { transaction_id: number | null }).transaction_id;
  if (txId == null) return;
  const { error } = await supabase.from("transactions").delete().eq("id", txId);
  if (error) throw new Error(error.message);
  revalidate();
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/finance.ts
git commit -m "feat(financas): actions de planejamento (crud + realizar/desfazer) (#11)"
```

---

### Task 5: Componente `PlanningSection`

**Files:**
- Create: `src/components/finance/planning-section.tsx`

**Interfaces:**
- Consumes: `createPlannedItem`/`updatePlannedItem`/`deletePlannedItem`/`realizePlannedItem`/`unrealizePlannedItem` (Task 4); `Modal`; `MoneyInput`; `formatBRL`/`parseBRL`; `formatDateBR`; tipos `PlannedItem`/`PlanSuggestion`/`Category`/`BankWithBalance`/`CardWithInvoice`/`TxType`.
- Produces: componente `PlanningSection` (named export) com props `{ items, suggestions, previstoReceber, previstoPagar, saldoPrevisto, categories, banks, cards, defaultDate }`.

- [ ] **Step 1: Criar o componente**

Create `src/components/finance/planning-section.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Undo2, Edit3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, parseBRL } from "@/lib/money";
import { formatDateBR } from "@/lib/dates";
import {
  createPlannedItem,
  updatePlannedItem,
  deletePlannedItem,
  realizePlannedItem,
  unrealizePlannedItem,
} from "@/lib/actions/finance";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "./money-input";
import type {
  BankWithBalance,
  CardWithInvoice,
  Category,
  PlannedItem,
  PlanSuggestion,
  TxType,
} from "@/types/finance";

// meio de pagamento num único <select>: "bank:<id>" | "card:<id>" | ""
function payValue(bankId: number | null, cardId: number | null): string {
  if (bankId) return `bank:${bankId}`;
  if (cardId) return `card:${cardId}`;
  return "";
}
function parsePay(v: string): { bank_id: number | null; card_id: number | null } {
  if (v.startsWith("bank:")) return { bank_id: Number(v.slice(5)), card_id: null };
  if (v.startsWith("card:")) return { card_id: Number(v.slice(5)), bank_id: null };
  return { bank_id: null, card_id: null };
}

export function PlanningSection({
  items,
  suggestions,
  previstoReceber,
  previstoPagar,
  saldoPrevisto,
  categories,
  banks,
  cards,
  defaultDate,
}: {
  items: PlannedItem[];
  suggestions: PlanSuggestion[];
  previstoReceber: number;
  previstoPagar: number;
  saldoPrevisto: number;
  categories: Category[];
  banks: BankWithBalance[];
  cards: CardWithInvoice[];
  defaultDate: string;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [type, setType] = useState<TxType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(defaultDate);
  const [categoryId, setCategoryId] = useState("");
  const [pay, setPay] = useState("");
  const [saving, setSaving] = useState(false);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const bankById = new Map(banks.map((b) => [b.id, b]));
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const typeCats = categories.filter((c) => c.kind === type);

  const pending = items.filter((i) => i.transaction_id === null);
  const done = items.filter((i) => i.transaction_id !== null);

  function reset() {
    setEditingId(null);
    setType("expense");
    setDescription("");
    setAmount("");
    setDueDate(defaultDate);
    setCategoryId("");
    setPay("");
  }
  function openNew() {
    reset();
    setOpen(true);
  }
  function openEdit(i: PlannedItem) {
    setEditingId(i.id);
    setType(i.type);
    setDescription(i.description);
    setAmount(String(i.amount).replace(".", ","));
    setDueDate(i.due_date);
    setCategoryId(i.category_id ? String(i.category_id) : "");
    setPay(payValue(i.bank_id, i.card_id));
    setOpen(true);
  }
  function openFromSuggestion(s: PlanSuggestion) {
    reset();
    setType("expense");
    setDescription(s.name);
    setAmount(String(s.amount).replace(".", ","));
    setDueDate(s.due_date);
    setCategoryId(s.category_id ? String(s.category_id) : "");
    setPay(payValue(s.bank_id, s.card_id));
    setOpen(true);
  }

  async function save() {
    const value = parseBRL(amount);
    if (!description.trim() || !value || value <= 0) {
      toast.error("Preencha descrição e um valor válido.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      toast.error("Informe a data prevista.");
      return;
    }
    setSaving(true);
    const base = {
      description: description.trim(),
      amount: value,
      type,
      due_date: dueDate,
      category_id: categoryId ? Number(categoryId) : null,
      ...parsePay(pay),
    };
    try {
      if (editingId) {
        await updatePlannedItem(editingId, base);
      } else {
        await createPlannedItem(base);
      }
      setOpen(false);
      reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function realize(i: PlannedItem) {
    try {
      await realizePlannedItem(i.id);
      toast.success("Lançado em Finanças.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao realizar");
    }
  }

  async function unrealize(i: PlannedItem) {
    if (!confirm(`Desfazer "${i.description}"? A transação lançada será removida.`)) return;
    try {
      await unrealizePlannedItem(i.id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao desfazer");
    }
  }

  async function remove(i: PlannedItem) {
    if (!confirm(`Excluir o item "${i.description}" do planejamento?`)) return;
    try {
      await deletePlannedItem(i.id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  function payLabel(i: PlannedItem): string | null {
    if (i.bank_id) {
      const b = bankById.get(i.bank_id);
      return b ? `${b.icon} ${b.name}` : null;
    }
    if (i.card_id) {
      const c = cardById.get(i.card_id);
      return c ? `💳 ${c.name}` : null;
    }
    return null;
  }

  const empty = items.length === 0 && suggestions.length === 0;

  return (
    <div className="glass card-glow rounded-2xl border border-border p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">Planejamento do mês</h3>
          <p className="text-sm text-muted-foreground">
            A receber{" "}
            <span className="num font-semibold text-green-600 dark:text-green-400">
              {formatBRL(previstoReceber)}
            </span>
            {" · "}A pagar{" "}
            <span className="num font-semibold text-red-600 dark:text-red-400">
              {formatBRL(previstoPagar)}
            </span>
            {" · "}Saldo{" "}
            <span
              className={`num font-semibold ${
                saldoPrevisto >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatBRL(saldoPrevisto)}
            </span>
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1 self-start rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Novo
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Suas assinaturas ainda não previstas neste mês:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.key}
                onClick={() => openFromSuggestion(s)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary/50 hover:bg-accent"
                title="Adicionar ao planejamento"
              >
                <span className="font-medium">{s.name}</span>
                <span className="num text-muted-foreground">{formatBRL(s.amount)}</span>
                <Plus className="h-3 w-3 text-primary" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {empty ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nada previsto para este mês.
          </p>
        ) : (
          <>
            {pending.length > 0 && (
              <p className="text-xs font-medium text-muted-foreground">A realizar</p>
            )}
            {pending.map((i) => (
              <PlanRow
                key={i.id}
                i={i}
                cat={i.category_id ? catById.get(i.category_id) ?? null : null}
                payLabel={payLabel(i)}
                onRealize={() => realize(i)}
                onEdit={() => openEdit(i)}
                onRemove={() => remove(i)}
              />
            ))}
            {done.length > 0 && (
              <p className="pt-2 text-xs font-medium text-muted-foreground">Realizados</p>
            )}
            {done.map((i) => (
              <PlanRow
                key={i.id}
                i={i}
                cat={i.category_id ? catById.get(i.category_id) ?? null : null}
                payLabel={payLabel(i)}
                onUnrealize={() => unrealize(i)}
                onRemove={() => remove(i)}
                done
              />
            ))}
          </>
        )}
      </div>

      {open && (
        <Modal onClose={() => setOpen(false)} title={`${editingId ? "Editar" : "Novo"} item previsto`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType("expense");
                  setCategoryId("");
                }}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  type === "expense"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => {
                  setType("income");
                  setCategoryId("");
                }}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  type === "income"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                Receita
              </button>
            </div>

            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
              placeholder="Descrição (ex: Aluguel)"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            />

            <div className="space-y-1">
              <label className="text-sm font-medium">Valor (R$)</label>
              <MoneyInput value={amount} onChange={setAmount} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Data prevista</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Categoria</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              >
                <option value="">Sem categoria</option>
                {typeCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Meio de pagamento (opcional)</label>
              <select
                value={pay}
                onChange={(e) => setPay(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              >
                <option value="">Nenhum</option>
                {banks.length > 0 && (
                  <optgroup label="Contas">
                    {banks.map((b) => (
                      <option key={`b${b.id}`} value={`bank:${b.id}`}>
                        {b.icon} {b.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {cards.length > 0 && (
                  <optgroup label="Cartões">
                    {cards.map((c) => (
                      <option key={`c${c.id}`} value={`card:${c.id}`}>
                        💳 {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="mt-2 w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar item"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function PlanRow({
  i,
  cat,
  payLabel,
  onRealize,
  onUnrealize,
  onEdit,
  onRemove,
  done = false,
}: {
  i: PlannedItem;
  cat: Category | null;
  payLabel: string | null;
  onRealize?: () => void;
  onUnrealize?: () => void;
  onEdit?: () => void;
  onRemove: () => void;
  done?: boolean;
}) {
  const sub: string[] = [];
  if (cat) sub.push(`${cat.icon} ${cat.name}`);
  if (payLabel) sub.push(payLabel);
  sub.push(formatDateBR(i.due_date));

  const sign = i.type === "income" ? "+" : "−";
  const tone =
    i.type === "income"
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div
      className={`flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-accent/30 ${
        done ? "opacity-60" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {i.description}
            {done && (
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                lançado
              </span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">{sub.join(" · ")}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`num font-semibold ${tone}`}>
          {sign} {formatBRL(Number(i.amount))}
        </span>
        {onRealize && (
          <button
            onClick={onRealize}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
            title="Realizar (lançar em Finanças)"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
        {onUnrealize && (
          <button
            onClick={onUnrealize}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
            title="Desfazer (remover transação)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
            title="Editar"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onRemove}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          title="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sem erros (componente ainda não montado na página — ok).

- [ ] **Step 3: Commit**

```bash
git add src/components/finance/planning-section.tsx
git commit -m "feat(financas): UI da secao de planejamento mensal (#11)"
```

---

### Task 6: Liberar meses futuros + plugar na página + verificação

**Files:**
- Modify: `src/components/finance/month-nav.tsx` (remove trava do "próximo mês")
- Modify: `src/app/(app)/financas/page.tsx` (offset, data, render)

**Interfaces:**
- Consumes: `getMonthlyPlan` (Task 3), `PlanningSection` (Task 5).
- Produces: navegação para meses futuros; seção de planejamento renderizada em `/financas`.

- [ ] **Step 1: Liberar o botão "próximo mês" no `MonthNav`**

Em `src/components/finance/month-nav.tsx`, no `<button aria-label="Próximo mês">`, remover o atributo `disabled={offset >= 0}`. O botão fica:

```tsx
      <button
        onClick={() => go(offset + 1)}
        className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent"
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
```

(As classes `disabled:*` podem ficar; sem o atributo `disabled` elas não têm efeito. Removê-las é opcional — deixe como acima para clareza.)

- [ ] **Step 2: Liberar offset positivo na página**

Em `src/app/(app)/financas/page.tsx`, trocar a linha:

```ts
  const offset = Math.min(0, Number(m) || 0); // não navega para o futuro
```

por:

```ts
  const offset = Number(m) || 0; // permite meses futuros (planejamento)
```

- [ ] **Step 3: Importar data + componente**

Em `src/app/(app)/financas/page.tsx`, trocar a linha:

```ts
import { getFinanceData, getBankStatement, getSubscriptions } from "@/lib/data/finance";
```

por:

```ts
import { getFinanceData, getBankStatement, getSubscriptions, getMonthlyPlan } from "@/lib/data/finance";
```

E adicionar, junto dos imports de componente (ex. após a linha do `SubscriptionsSection`):

```ts
import { PlanningSection } from "@/components/finance/planning-section";
```

- [ ] **Step 4: Carregar o planejamento em paralelo**

Em `src/app/(app)/financas/page.tsx`, trocar o bloco:

```ts
  const [statement, subs] = await Promise.all([
    selectedBankId ? getBankStatement(selectedBankId, year, month) : Promise.resolve(null),
    getSubscriptions(year, month).catch(() => ({
      subscriptions: [],
      candidates: [],
      monthlyTotal: 0,
    })),
  ]);
```

por:

```ts
  const [statement, subs, plan] = await Promise.all([
    selectedBankId ? getBankStatement(selectedBankId, year, month) : Promise.resolve(null),
    getSubscriptions(year, month).catch(() => ({
      subscriptions: [],
      candidates: [],
      monthlyTotal: 0,
    })),
    getMonthlyPlan(year, month).catch(() => ({
      items: [],
      suggestions: [],
      totals: { previstoReceber: 0, previstoPagar: 0, saldoPrevisto: 0, pendentes: 0 },
    })),
  ]);
```

- [ ] **Step 5: Renderizar a seção após as assinaturas**

Em `src/app/(app)/financas/page.tsx`, logo **após** o bloco `{/* assinaturas recorrentes */}` (o `</Reveal>` que fecha o `<SubscriptionsSection/>`) e **antes** do bloco `{/* despesas por categoria + transações */}`, inserir:

```tsx
      {/* planejamento mensal */}
      <Reveal>
        <PlanningSection
          items={plan.items}
          suggestions={plan.suggestions}
          previstoReceber={plan.totals.previstoReceber}
          previstoPagar={plan.totals.previstoPagar}
          saldoPrevisto={plan.totals.saldoPrevisto}
          categories={categories}
          banks={banks}
          cards={cards}
          defaultDate={defaultDate}
        />
      </Reveal>
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 7: Rodar a migração no Supabase (operacional)**

Copiar o conteúdo de `supabase/migrations/20260701000011_planned_items.sql` e colar no **Supabase → SQL Editor**; executar. (Sem isso, `getMonthlyPlan` cai no fallback vazio e a seção fica sem itens.)

- [ ] **Step 8: Verificação manual no app**

Rodar `npm run dev` e em `/financas`:
- Criar um item previsto **despesa** (descrição, valor, data prevista, categoria, meio de pagamento) → aparece em "A realizar" e entra em **A pagar / Saldo previsto**.
- Criar um item previsto **receita** → entra em **A receber / Saldo previsto**.
- **Realizar** (✓) um item → toast "Lançado em Finanças", o item vai para "Realizados" (selo "lançado") e a **transação aparece** na lista de transações / totais do mês.
- **Desfazer** (↩, após `confirm`) → a transação some de Finanças e o item volta para "A realizar".
- Excluir a transação **direto** na lista de transações → o item correspondente volta a "A realizar" (FK `on delete set null`).
- Compra prevista com **cartão** como meio de pagamento: ao realizar, a transação cai na **fatura** (não mexe no saldo da conta).
- Se houver assinatura ativa não prevista neste mês, ela aparece como **chip sugerido**; clicar "+" abre o modal pré-preenchido (despesa); após salvar, o chip some.
- Navegar para o **próximo mês** (botão › agora habilitado) e criar um item previsto lá; voltar com "Mês atual".
- Enquanto **pendente**, o item **não** conta em Receitas/Despesas nem no extrato (só previsto).

- [ ] **Step 9: Commit**

```bash
git add "src/app/(app)/financas/page.tsx" src/components/finance/month-nav.tsx
git commit -m "feat(financas): planejamento mensal na pagina + meses futuros (#11)"
```

---

## Self-Review (preenchido pelo autor do plano)

**Spec coverage:**
- Modelo central previsto→realizado (spec §3) → Task 4 (`realize`/`unrealizePlannedItem`) + Task 1 (FK `on delete set null`).
- Modelo de dados (§4) → Task 1. Tipos (§5) → Task 1. Validação (§6) → Task 2. Leitura + sugestões (§7) → Task 3. Actions (§8) → Task 4. UI (§9) → Task 5. Página + meses futuros (§10) → Task 6. Verificação (§13) → Task 6. Ordem (§14) → Tasks 1–6. ✔ Sem lacunas.

**Placeholder scan:** Sem TBD/TODO; todo passo tem código real e comando com resultado esperado. ✔

**Type consistency:**
- `PlannedItem`/`PlanSuggestion` (Task 1) usados igual em `getMonthlyPlan` (Task 3), nas actions (Task 4) e no componente (Task 5).
- `plannedItemInput` (Task 2) consumido nas actions (Task 4); `updatePlannedItem` usa `.partial()`.
- Nomes das actions (`createPlannedItem`/`updatePlannedItem`/`deletePlannedItem`/`realizePlannedItem`/`unrealizePlannedItem`) idênticos entre Task 4 e Task 5.
- `getMonthlyPlan(year, month)` retorna `{ items, suggestions, totals: { previstoReceber, previstoPagar, saldoPrevisto, pendentes } }`; a página (Task 6) desestrutura `plan.items`/`plan.suggestions`/`plan.totals.*` e o componente recebe `previstoReceber`/`previstoPagar`/`saldoPrevisto` como números. ✔
- `normalizeTx` (Task 4) reutiliza o helper privado já existente em `actions/finance.ts`; `normalizeDesc` (Task 3) reutiliza o helper privado já existente em `data/finance.ts`. ✔

**Nota de risco:** `realizePlannedItem` lê o item com `select("*").single()` e o casta para `PlannedItem` (padrão do projeto, ex. `as Bank`); mantém o padrão sem `any`. A trava de mês futuro é removida globalmente na página (efeito colateral esperado e aprovado no spec §10).
