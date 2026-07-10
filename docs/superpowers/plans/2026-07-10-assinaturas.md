# Assinaturas recorrentes (#7) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar um rastreador de assinaturas recorrentes (só referência, mensal) como uma seção dentro de `/financas`, com cadastro manual + detecção de candidatos no histórico.

**Architecture:** Tabela nova `subscriptions` (RLS `own_rows`). Server Component lê via `getSubscriptions` (inclui a detecção pura sobre transações). Server Actions mutam. Uma seção client (`subscriptions-section.tsx`) faz o CRUD via modal e mostra chips de candidatos. Nenhuma transação é gerada — a assinatura é informativa.

**Tech Stack:** Next.js 16.2.9 (App Router) · React 19 · TypeScript strict · Supabase (@supabase/ssr) · Zod · Tailwind v4 · lucide-react · sonner.

## Global Constraints

- **Sem framework de testes.** O gate de cada task é **`npm run build`** sem erros (tipos, lint, Zod) + verificação manual no app na última task. Não escrever testes automatizados.
- **TS strict, proibido `any`.** Variáveis não usadas quebram o build — não deixar imports/vars órfãos.
- **Arquitetura:** Server Components leem (`src/lib/data/*`); Server Actions mutam (`src/lib/actions/*`, `"use server"`, Zod em `src/lib/validation/*`, `user_id` via `auth.getUser()`, `revalidatePath`). Tipos em `src/types/*`. RLS `own_rows` em toda tabela.
- **Datas:** só via `src/lib/dates.ts` (fuso SP) — nunca `toISOString().split`. **Dinheiro:** `src/lib/money.ts` (`formatBRL`/`parseBRL`). Números na UI usam a classe `.num` (IBM Plex Mono).
- **Modais:** `src/components/ui/modal.tsx` (portal). Exclusões usam `confirm()` nativo (padrão atual).
- **Migração:** a CLI do Supabase é bloqueada nesta máquina. O arquivo SQL é criado no repo; **rodar manualmente** no Supabase → SQL Editor é passo operacional (na última task).
- **Meio de pagamento:** `bank_id`/`card_id` só informativos; no `<select>` unificado o value é `bank:<id>` / `card:<id>` / `""`.

---

### Task 1: Migração `0010` + tipos

**Files:**
- Create: `supabase/migrations/20260701000010_subscriptions.sql`
- Modify: `src/types/finance.ts` (append no fim)

**Interfaces:**
- Consumes: nada.
- Produces: tabela `public.subscriptions`; tipos `Subscription`, `SubscriptionCandidate`.

- [ ] **Step 1: Criar a migração SQL**

Create `supabase/migrations/20260701000010_subscriptions.sql`:

```sql
-- ============================================================
-- Migração 0010: Assinaturas recorrentes (#7)
-- Cole e rode no Supabase → SQL Editor.
-- Requer as tabelas categories/banks/credit_cards (migr. 0000).
-- ============================================================

create table if not exists public.subscriptions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  icon        text not null default '🔁',
  amount      numeric(12,2) not null default 0 check (amount >= 0),
  billing_day smallint check (billing_day between 1 and 31),
  category_id bigint references public.categories(id) on delete set null,
  bank_id     bigint references public.banks(id) on delete set null,
  card_id     bigint references public.credit_cards(id) on delete set null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, active);
drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
drop policy if exists "own_rows" on public.subscriptions;
create policy "own_rows" on public.subscriptions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Adicionar os tipos**

Append ao final de `src/types/finance.ts`:

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
  key: string; // descrição normalizada (chave de dedupe)
  name: string; // descrição legível (ocorrência mais recente)
  amount: number; // valor sugerido (ocorrência mais recente)
  billing_day: number; // dia do mês mais frequente
  months: number; // em quantos meses distintos apareceu
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
git add supabase/migrations/20260701000010_subscriptions.sql src/types/finance.ts
git commit -m "feat(financas): migracao 0010 + tipos de assinatura (#7)"
```

---

### Task 2: Validação `subscriptionInput`

**Files:**
- Modify: `src/lib/validation/finance.ts` (append)

**Interfaces:**
- Consumes: `z` (já importado no arquivo).
- Produces: `subscriptionInput` (Zod), tipo `SubscriptionInput`.

- [ ] **Step 1: Adicionar o schema**

Append ao final de `src/lib/validation/finance.ts`:

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

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/validation/finance.ts
git commit -m "feat(financas): validacao de assinatura (#7)"
```

---

### Task 3: Leitura + detecção — `getSubscriptions`

**Files:**
- Modify: `src/lib/data/finance.ts` (import de tipos/dates + append de funções)

**Interfaces:**
- Consumes: `createClient`, `monthBounds`, `shiftMonth`, `num`, tipos `Subscription`/`SubscriptionCandidate`/`Transaction`.
- Produces: `getSubscriptions(year, month) => Promise<{ subscriptions: Subscription[]; candidates: SubscriptionCandidate[]; monthlyTotal: number }>`.

- [ ] **Step 1: Ajustar imports do arquivo**

Em `src/lib/data/finance.ts`, na linha `import { monthBounds } from "@/lib/dates";`, trocar por:

```ts
import { monthBounds, shiftMonth } from "@/lib/dates";
```

E no bloco `import type { ... } from "@/types/finance";` adicionar `Subscription` e `SubscriptionCandidate` à lista (junto de `Bank`, `Transaction`, etc.):

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
} from "@/types/finance";
```

- [ ] **Step 2: Adicionar helpers de detecção + `getSubscriptions`**

Append ao final de `src/lib/data/finance.ts`:

```ts
// ─── Assinaturas ──────────────────────────────────────────

/** Normaliza a descrição para agrupar cobranças iguais. */
function normalizeDesc(desc: string): string {
  return desc
    .trim()
    .toLowerCase()
    .replace(/\s*\(\d+\/\d+\)\s*$/, "") // remove sufixo de parcela "(1/12)"
    .replace(/\s+/g, " ");
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Valor que mais se repete (usado para o dia de cobrança). */
function mode(nums: number[]): number {
  const counts = new Map<number, number>();
  let best = nums[0];
  let bestCount = 0;
  for (const n of nums) {
    const c = (counts.get(n) ?? 0) + 1;
    counts.set(n, c);
    if (c > bestCount) {
      bestCount = c;
      best = n;
    }
  }
  return best;
}

type TxSlim = Pick<
  Transaction,
  "description" | "amount" | "occurred_on" | "category_id" | "bank_id" | "card_id"
>;

/** Deriva candidatos a assinatura a partir do histórico de despesas. */
function detectCandidates(txs: TxSlim[], existing: Subscription[]): SubscriptionCandidate[] {
  const existingKeys = new Set(existing.map((s) => normalizeDesc(s.name)));

  type Group = {
    key: string;
    latestName: string;
    latestDate: string;
    latestAmount: number;
    latestCategory: number | null;
    latestBank: number | null;
    latestCard: number | null;
    months: Set<string>;
    days: number[];
    amounts: number[];
  };
  const groups = new Map<string, Group>();

  for (const t of txs) {
    const key = normalizeDesc(t.description);
    if (!key) continue;
    const amount = num(t.amount);
    const monthKey = t.occurred_on.slice(0, 7); // YYYY-MM
    const day = Number(t.occurred_on.slice(8, 10));
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        latestName: t.description.trim(),
        latestDate: t.occurred_on,
        latestAmount: amount,
        latestCategory: t.category_id,
        latestBank: t.bank_id,
        latestCard: t.card_id,
        months: new Set(),
        days: [],
        amounts: [],
      };
      groups.set(key, g);
    }
    g.months.add(monthKey);
    g.days.push(day);
    g.amounts.push(amount);
    if (t.occurred_on >= g.latestDate) {
      g.latestName = t.description.trim();
      g.latestDate = t.occurred_on;
      g.latestAmount = amount;
      g.latestCategory = t.category_id;
      g.latestBank = t.bank_id;
      g.latestCard = t.card_id;
    }
  }

  const out: SubscriptionCandidate[] = [];
  for (const g of groups.values()) {
    if (existingKeys.has(g.key)) continue;
    if (g.months.size < 3) continue;
    const med = median(g.amounts);
    const spread = Math.max(...g.amounts) - Math.min(...g.amounts);
    if (med <= 0 || spread > 0.15 * med) continue;
    out.push({
      key: g.key,
      name: g.latestName,
      amount: g.latestAmount,
      billing_day: mode(g.days),
      months: g.months.size,
      category_id: g.latestCategory,
      bank_id: g.latestBank,
      card_id: g.latestCard,
    });
  }
  out.sort((a, b) => b.months - a.months || b.amount - a.amount);
  return out.slice(0, 5);
}

/**
 * Assinaturas do usuário + candidatos detectados nos últimos 6 meses de despesas
 * (exclui pagamento de fatura e transferência) + total mensal das ativas.
 */
export async function getSubscriptions(year: number, month: number) {
  const supabase = await createClient();
  const from = shiftMonth(year, month, -5); // janela de 6 meses (inclui o atual)
  const { start } = monthBounds(from.year, from.month);
  const { end } = monthBounds(year, month);

  const [subsRes, txRes] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .order("active", { ascending: false })
      .order("amount", { ascending: false }),
    supabase
      .from("transactions")
      .select("description,amount,occurred_on,category_id,bank_id,card_id")
      .eq("type", "expense")
      .eq("is_card_payment", false)
      .eq("is_transfer", false)
      .gte("occurred_on", start)
      .lte("occurred_on", end)
      .order("occurred_on", { ascending: true }),
  ]);
  if (subsRes.error) throw new Error(subsRes.error.message);
  if (txRes.error) throw new Error(txRes.error.message);

  const subscriptions = (subsRes.data ?? []) as Subscription[];
  const txs = (txRes.data ?? []) as TxSlim[];

  const monthlyTotal = subscriptions
    .filter((s) => s.active)
    .reduce((sum, s) => sum + num(s.amount), 0);

  return { subscriptions, candidates: detectCandidates(txs, subscriptions), monthlyTotal };
}

export type SubscriptionsData = Awaited<ReturnType<typeof getSubscriptions>>;
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: compila sem erros (função exportada mas ainda não consumida — ok).

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/finance.ts
git commit -m "feat(financas): getSubscriptions + deteccao de candidatos (#7)"
```

---

### Task 4: Server Actions de assinatura

**Files:**
- Modify: `src/lib/actions/finance.ts` (import + append de 3 actions)

**Interfaces:**
- Consumes: `subscriptionInput`, `ctx()`, `revalidate()` (já existem no arquivo).
- Produces: `createSubscription(raw)`, `updateSubscription(id, raw)`, `deleteSubscription(id)`.

- [ ] **Step 1: Importar o schema**

Em `src/lib/actions/finance.ts`, no bloco de import de `@/lib/validation/finance`, adicionar `subscriptionInput` à lista:

```ts
import {
  transactionInput,
  bankInput,
  cardInput,
  categoryInput,
  installmentInput,
  transferInput,
  subscriptionInput,
  type TransactionInput,
} from "@/lib/validation/finance";
```

- [ ] **Step 2: Adicionar as actions**

Append ao final de `src/lib/actions/finance.ts`:

```ts
// ─── Assinaturas ──────────────────────────────────────────
export async function createSubscription(raw: unknown) {
  const input = subscriptionInput.parse(raw);
  const { supabase, userId } = await ctx();
  const { error } = await supabase
    .from("subscriptions")
    .insert({ ...input, user_id: userId });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function updateSubscription(id: number, raw: unknown) {
  const input = subscriptionInput.partial().parse(raw);
  const { supabase } = await ctx();
  const { error } = await supabase.from("subscriptions").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteSubscription(id: number) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
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
git commit -m "feat(financas): actions de assinatura (create/update/delete) (#7)"
```

---

### Task 5: Componente `SubscriptionsSection`

**Files:**
- Create: `src/components/finance/subscriptions-section.tsx`

**Interfaces:**
- Consumes: `createSubscription`/`updateSubscription`/`deleteSubscription`; `Modal`; `MoneyInput`; `formatBRL`/`parseBRL`; `formatDateBR`/`todayISO`/`shiftMonth`; tipos `Subscription`/`SubscriptionCandidate`/`Category`/`BankWithBalance`/`CardWithInvoice`.
- Produces: componente `SubscriptionsSection` (default named export) com props `{ subscriptions, candidates, monthlyTotal, categories, banks, cards }`.

- [ ] **Step 1: Criar o componente**

Create `src/components/finance/subscriptions-section.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit3, Trash2, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, parseBRL } from "@/lib/money";
import { formatDateBR, todayISO, shiftMonth } from "@/lib/dates";
import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from "@/lib/actions/finance";
import { Modal } from "@/components/ui/modal";
import { MoneyInput } from "./money-input";
import type {
  BankWithBalance,
  CardWithInvoice,
  Category,
  Subscription,
  SubscriptionCandidate,
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

/** Próximo dia `day` a partir de hoje (fuso SP), como YYYY-MM-DD. */
function nextCharge(day: number): string {
  const [y, m, d] = todayISO().split("-").map(Number);
  const clamp = (yy: number, mm: number) =>
    Math.min(day, new Date(Date.UTC(yy, mm, 0)).getUTCDate());
  if (day >= d) {
    return `${y}-${String(m).padStart(2, "0")}-${String(clamp(y, m)).padStart(2, "0")}`;
  }
  const nx = shiftMonth(y, m, 1);
  return `${nx.year}-${String(nx.month).padStart(2, "0")}-${String(clamp(nx.year, nx.month)).padStart(2, "0")}`;
}

export function SubscriptionsSection({
  subscriptions,
  candidates,
  monthlyTotal,
  categories,
  banks,
  cards,
}: {
  subscriptions: Subscription[];
  candidates: SubscriptionCandidate[];
  monthlyTotal: number;
  categories: Category[];
  banks: BankWithBalance[];
  cards: CardWithInvoice[];
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🔁");
  const [amount, setAmount] = useState("");
  const [billingDay, setBillingDay] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [pay, setPay] = useState("");
  const [saving, setSaving] = useState(false);

  const expenseCats = categories.filter((c) => c.kind === "expense");
  const catById = new Map(categories.map((c) => [c.id, c]));
  const bankById = new Map(banks.map((b) => [b.id, b]));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  const active = subscriptions.filter((s) => s.active);
  const paused = subscriptions.filter((s) => !s.active);

  function reset() {
    setEditingId(null);
    setName("");
    setIcon("🔁");
    setAmount("");
    setBillingDay("");
    setCategoryId("");
    setPay("");
  }
  function openNew() {
    reset();
    setOpen(true);
  }
  function openEdit(s: Subscription) {
    setEditingId(s.id);
    setName(s.name);
    setIcon(s.icon);
    setAmount(String(s.amount).replace(".", ","));
    setBillingDay(s.billing_day ? String(s.billing_day) : "");
    setCategoryId(s.category_id ? String(s.category_id) : "");
    setPay(payValue(s.bank_id, s.card_id));
    setOpen(true);
  }
  function openFromCandidate(c: SubscriptionCandidate) {
    reset();
    setName(c.name);
    setAmount(String(c.amount).replace(".", ","));
    setBillingDay(String(c.billing_day));
    setCategoryId(c.category_id ? String(c.category_id) : "");
    setPay(payValue(c.bank_id, c.card_id));
    setOpen(true);
  }

  async function save() {
    const value = parseBRL(amount);
    if (!name.trim() || !value || value <= 0) {
      toast.error("Preencha nome e um valor válido.");
      return;
    }
    const day = billingDay ? Number(billingDay) : null;
    if (day !== null && (day < 1 || day > 31)) {
      toast.error("Dia da cobrança deve ser entre 1 e 31.");
      return;
    }
    setSaving(true);
    const base = {
      name: name.trim(),
      icon: icon.trim() || "🔁",
      amount: value,
      billing_day: day,
      category_id: categoryId ? Number(categoryId) : null,
      ...parsePay(pay),
    };
    try {
      if (editingId) {
        await updateSubscription(editingId, base);
      } else {
        await createSubscription({ ...base, active: true });
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

  async function toggle(s: Subscription) {
    try {
      await updateSubscription(s.id, { active: !s.active });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  }

  async function remove(s: Subscription) {
    if (!confirm(`Excluir a assinatura "${s.name}"?`)) return;
    try {
      await deleteSubscription(s.id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  function payLabel(s: Subscription): string | null {
    if (s.bank_id) {
      const b = bankById.get(s.bank_id);
      return b ? `${b.icon} ${b.name}` : null;
    }
    if (s.card_id) {
      const c = cardById.get(s.card_id);
      return c ? `💳 ${c.name}` : null;
    }
    return null;
  }

  const empty = subscriptions.length === 0 && candidates.length === 0;

  return (
    <div className="glass card-glow rounded-2xl border border-border p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold">Assinaturas</h3>
          <p className="text-sm text-muted-foreground">
            {active.length} ativa{active.length === 1 ? "" : "s"} ·{" "}
            <span className="num font-semibold text-foreground">{formatBRL(monthlyTotal)}</span> / mês
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1 self-start rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Nova
        </button>
      </div>

      {candidates.length > 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Detectamos cobranças recorrentes no seu histórico:
          </p>
          <div className="flex flex-wrap gap-2">
            {candidates.map((c) => (
              <button
                key={c.key}
                onClick={() => openFromCandidate(c)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary/50 hover:bg-accent"
                title="Adicionar como assinatura"
              >
                <span className="font-medium">{c.name}</span>
                <span className="num text-muted-foreground">{formatBRL(c.amount)}</span>
                <Plus className="h-3 w-3 text-primary" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {empty ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma assinatura cadastrada.
          </p>
        ) : (
          <>
            {active.map((s) => (
              <SubRow
                key={s.id}
                s={s}
                cat={s.category_id ? catById.get(s.category_id) ?? null : null}
                payLabel={payLabel(s)}
                onToggle={() => toggle(s)}
                onEdit={() => openEdit(s)}
                onRemove={() => remove(s)}
              />
            ))}
            {paused.length > 0 && (
              <p className="pt-2 text-xs font-medium text-muted-foreground">Pausadas</p>
            )}
            {paused.map((s) => (
              <SubRow
                key={s.id}
                s={s}
                cat={s.category_id ? catById.get(s.category_id) ?? null : null}
                payLabel={payLabel(s)}
                onToggle={() => toggle(s)}
                onEdit={() => openEdit(s)}
                onRemove={() => remove(s)}
                muted
              />
            ))}
          </>
        )}
      </div>

      {open && (
        <Modal onClose={() => setOpen(false)} title={`${editingId ? "Editar" : "Nova"} Assinatura`}>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={2}
                className="w-12 rounded-lg border border-border bg-muted px-2 py-2 text-center text-sm"
                placeholder="🔁"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="Nome (ex: Netflix)"
                className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Valor mensal (R$)</label>
              <MoneyInput value={amount} onChange={setAmount} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Dia da cobrança (opcional)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                placeholder="ex: 15"
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
                {expenseCats.map((c) => (
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
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar assinatura"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SubRow({
  s,
  cat,
  payLabel,
  onToggle,
  onEdit,
  onRemove,
  muted = false,
}: {
  s: Subscription;
  cat: Category | null;
  payLabel: string | null;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  muted?: boolean;
}) {
  const sub: string[] = [];
  if (cat) sub.push(`${cat.icon} ${cat.name}`);
  if (payLabel) sub.push(payLabel);
  if (s.billing_day) sub.push(`todo dia ${s.billing_day} · próx. ${formatDateBR(nextCharge(s.billing_day))}`);

  return (
    <div
      className={`flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-accent/30 ${
        muted ? "opacity-50" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="shrink-0 text-xl">{s.icon}</span>
        <div className="min-w-0">
          <p className="truncate font-medium">{s.name}</p>
          <p className="truncate text-xs text-muted-foreground">{sub.join(" · ") || "Sem detalhes"}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="num font-semibold">{formatBRL(Number(s.amount))}</span>
        <button
          onClick={onToggle}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          title={s.active ? "Pausar" : "Reativar"}
        >
          {s.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button onClick={onEdit} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
          <Edit3 className="h-4 w-4" />
        </button>
        <button onClick={onRemove} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
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
git add src/components/finance/subscriptions-section.tsx
git commit -m "feat(financas): UI da secao de assinaturas (#7)"
```

---

### Task 6: Plugar na página de Finanças + verificação

**Files:**
- Modify: `src/app/(app)/financas/page.tsx`

**Interfaces:**
- Consumes: `getSubscriptions` (Task 3), `SubscriptionsSection` (Task 5).
- Produces: seção de assinaturas renderizada em `/financas`.

- [ ] **Step 1: Importar data + componente**

Em `src/app/(app)/financas/page.tsx`:

Trocar a linha:
```ts
import { getFinanceData, getBankStatement } from "@/lib/data/finance";
```
por:
```ts
import { getFinanceData, getBankStatement, getSubscriptions } from "@/lib/data/finance";
```

Adicionar (junto dos outros imports de componente, ex. após a linha do `Statement`):
```ts
import { SubscriptionsSection } from "@/components/finance/subscriptions-section";
```

- [ ] **Step 2: Carregar as assinaturas em paralelo com o extrato**

Trocar o bloco:
```ts
  const statement = selectedBankId
    ? await getBankStatement(selectedBankId, year, month)
    : null;
```
por:
```ts
  const [statement, subs] = await Promise.all([
    selectedBankId ? getBankStatement(selectedBankId, year, month) : Promise.resolve(null),
    getSubscriptions(year, month),
  ]);
```

- [ ] **Step 3: Renderizar a seção após contas+cartões**

Logo **após** o bloco `{/* contas + cartões */}` (o `</Reveal>` que fecha o grid com `BankManager`/`CardManager`) e **antes** do bloco `{/* despesas por categoria + transações */}`, inserir:
```tsx
      {/* assinaturas recorrentes */}
      <Reveal>
        <SubscriptionsSection
          subscriptions={subs.subscriptions}
          candidates={subs.candidates}
          monthlyTotal={subs.monthlyTotal}
          categories={categories}
          banks={banks}
          cards={cards}
        />
      </Reveal>
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 5: Rodar a migração no Supabase (operacional)**

Copiar o conteúdo de `supabase/migrations/20260701000010_subscriptions.sql` e colar no **Supabase → SQL Editor**; executar. (Sem isso, a seção lança erro ao ler `subscriptions`.)

- [ ] **Step 6: Verificação manual no app**

Rodar `npm run dev` e em `/financas`:
- Criar uma assinatura (nome, valor, dia, categoria, meio de pagamento) → aparece na lista e entra no **total mensal**.
- Pausar → sai do total e vai para "Pausadas" (apagada); reativar → volta.
- Editar → mudanças persistem.
- Excluir → some (após `confirm`).
- "próxima cobrança": coerente com o dia informado (mês atual se ainda não passou, senão o próximo).
- Se houver ≥3 despesas mensais de mesma descrição/valor no histórico, um **candidato** aparece; clicar "+" abre o modal pré-preenchido; após salvar, o candidato some da faixa.
- Confirmar que a assinatura **não** aparece em Receitas/Despesas nem no extrato bancário (não é transação).

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/financas/page.tsx"
git commit -m "feat(financas): secao de assinaturas na pagina de financas (#7)"
```

---

## Self-Review (preenchido pelo autor do plano)

**Spec coverage:**
- Modelo de dados (spec §4) → Task 1. Tipos (§5) → Task 1. Validação (§6) → Task 2. Leitura + detecção (§7) → Task 3. Actions (§8) → Task 4. UI (§9) → Task 5. Página (§10) → Task 6. Verificação (§12) → Task 6. ✔ Sem lacunas.

**Placeholder scan:** Sem TBD/TODO; todo passo tem código real e comando com resultado esperado. ✔

**Type consistency:** `Subscription`/`SubscriptionCandidate` (Task 1) usados igualzinho em `getSubscriptions` (Task 3) e no componente (Task 5). `subscriptionInput` (Task 2) consumido nas actions (Task 4). Nomes de actions (`createSubscription`/`updateSubscription`/`deleteSubscription`) idênticos entre Task 4 e Task 5. `getSubscriptions(year, month)` retorna `{ subscriptions, candidates, monthlyTotal }`, exatamente o que a página desestrutura em `subs.*` (Task 6). ✔
