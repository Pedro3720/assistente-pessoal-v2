# Onda 14: calendário, card de contas e revisão do extrato

> **Para quem for executar:** use `superpowers:subagent-driven-development` (recomendado) ou
> `superpowers:executing-plans` para implementar tarefa a tarefa. Os passos usam checkbox
> (`- [ ]`) para acompanhamento.

**Objetivo:** deixar a grade do calendário legível, trocar os 4 indicadores de Finanças por um
card de contas expansível no estilo Pierre, e permitir criar/editar categorias direto na revisão
do extrato importado, com seletores modernos.

**Arquitetura:** tudo em componentes client já existentes ou novos, sem tocar em banco. Server
Components seguem lendo e passando dados prontos; nenhuma action nova é criada (as de banco e
categoria já existem). O seletor novo é genérico e reusável, com painel via portal (regra do
projeto para qualquer coisa que flutua).

**Stack:** Next 16 (App Router), React 19, Tailwind 4, motion, lucide-react, sonner.

## Restrições globais

- Spec: `docs/superpowers/specs/2026-07-28-calendario-contas-import-design.md`.
- **Não há framework de testes.** O ciclo de cada tarefa é: implementar → `npm run build` →
  verificar no navegador com medição → commit.
- **Nenhuma migração de banco.** Nenhuma action nova.
- **Sem travessão (— ou –) em texto visível.** Varrer com `rg "—|–" src` antes de commitar.
- **`prefers-reduced-motion`:** toda animação nova usa `useReducedMotion()`
  (`src/hooks/use-reduced-motion.ts`) ou os tokens de `src/lib/motion.ts`.
- **Sem `any`.** TypeScript strict; o build falha em erro de tipo.
- **Dinheiro** sempre por `formatBRL`/`parseBRL` (`src/lib/money.ts`); cores de valor pelos
  tokens `--positive`/`--negative` (classes `text-positive`/`text-negative`).
- **Medir a 320px e 375px** em toda tela alterada: `document.documentElement.scrollWidth` deve
  ser igual a `clientWidth` (não regredir a correção #32).
- Qualquer coisa que flutue (painel, popover, modal) vai via `createPortal` no `document.body`.

## Estrutura de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `src/components/calendar/calendar-view.tsx` | grade e cabeçalho do mês | modificar |
| `src/components/finance/accounts-summary.tsx` | card de contas (colapsado + expandido) | criar |
| `src/components/finance/bank-manager.tsx` | card "Contas" antigo | remover |
| `src/app/(app)/financas/page.tsx` | monta a página, passa dados prontos | modificar |
| `src/components/ui/select-menu.tsx` | seletor genérico com painel em portal | criar |
| `src/components/finance/category-select.tsx` | seletor de categoria + criar/editar | criar |
| `src/components/finance/import-modal.tsx` | etapa de revisão do extrato | modificar |

---

### Task 1: Calendário que respira

**Arquivos:**
- Modificar: `src/components/calendar/calendar-view.tsx` (cabeçalho ~124-144, grade ~170-216)

**Interfaces:**
- Consome: `byDate: Map<string, EventOccurrence[]>`, `clickDay(dateStr)`, `setViewing(o)`,
  `today`, `firstWeekday`, `daysInMonth`, `pad()`, `MONTH_NAMES`, `WEEKDAY_SHORT` (todos já
  existem no arquivo).
- Produz: nada para outras tarefas.

- [ ] **Passo 1: trocar o cabeçalho pelo mês em tipo grande**

Substituir o bloco que começa em `<h1 className="text-gradient ...">Calendário</h1>` e vai até o
fechamento da `<div className="mt-3 flex items-center gap-2">` por:

```tsx
<div>
  <p className="num text-sm font-medium text-muted-foreground">{year}</p>
  <h1
    className="text-gradient-animated text-3xl font-bold leading-none tracking-tighter md:text-4xl"
    style={{ fontFamily: "var(--font-display)" }}
  >
    {MONTH_NAMES[month - 1]}
  </h1>
  <div className="mt-3 flex items-center gap-2">
    <button onClick={() => goMonth(offset - 1)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-accent" aria-label="Mês anterior">
      <ChevronLeft className="h-4 w-4" />
    </button>
    <button onClick={() => goMonth(offset + 1)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-accent" aria-label="Próximo mês">
      <ChevronRight className="h-4 w-4" />
    </button>
    {offset !== 0 && (
      <button onClick={() => goMonth(0)} className="ml-1 text-xs text-primary hover:underline">
        Mês atual
      </button>
    )}
  </div>
</div>
```

- [ ] **Passo 2: trocar a grade inteira**

Substituir o conteúdo da `<div className="glass card-glow flex-1 rounded-2xl border border-border p-6">`
(cabeçalho dos dias da semana + grade, linhas ~170-216) por:

```tsx
<div className="grid grid-cols-7">
  {WEEKDAY_SHORT.map((d, i) => (
    <div
      key={d}
      className={`py-2 text-center text-[11px] font-medium uppercase tracking-wide ${
        i === 0 || i === 6 ? "text-muted-foreground/50" : "text-muted-foreground"
      }`}
    >
      {d}
    </div>
  ))}
</div>
<div className="grid grid-cols-7 border-t border-border">
  {Array.from({ length: firstWeekday }).map((_, i) => (
    <div key={`e-${i}`} className="min-h-[76px] border-b border-r border-border/50 md:min-h-[116px]" />
  ))}
  {Array.from({ length: daysInMonth }).map((_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${pad(month)}-${pad(day)}`;
    const dayEvents = byDate.get(dateStr) ?? [];
    const isToday = dateStr === today;
    const col = (firstWeekday + i) % 7;
    const weekend = col === 0 || col === 6;
    return (
      <button
        key={day}
        onClick={() => clickDay(dateStr)}
        className={`min-h-[76px] border-b border-r border-border/50 p-1.5 text-left align-top transition-colors hover:bg-accent/40 md:min-h-[116px] md:p-2 ${
          weekend ? "bg-muted/20" : ""
        }`}
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold md:h-8 md:w-8 md:text-base ${
            isToday
              ? "bg-primary text-primary-foreground shadow-[0_0_18px_-4px_var(--primary)]"
              : weekend
                ? "text-muted-foreground"
                : "text-foreground"
          }`}
        >
          {day}
        </span>

        {/* celular: pontinhos coloridos (referência do dono) */}
        <span className="mt-1 flex flex-wrap items-center gap-1 md:hidden">
          {dayEvents.slice(0, 3).map((o) => (
            <span key={o.key} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: o.event.color }} />
          ))}
          {dayEvents.length > 3 && (
            <span className="num text-[9px] leading-none text-muted-foreground">+{dayEvents.length - 3}</span>
          )}
        </span>

        {/* desktop: evento escrito */}
        <span className="mt-1 hidden flex-col gap-0.5 md:flex">
          {dayEvents.slice(0, 2).map((o) => (
            <span
              key={o.key}
              onClick={(e) => {
                e.stopPropagation();
                setViewing(o);
              }}
              className="truncate rounded px-1 py-0.5 text-[10px] text-white"
              style={{ backgroundColor: o.event.color }}
            >
              {o.time} {o.event.title}
            </span>
          ))}
          {dayEvents.length > 2 && (
            <span className="num text-[10px] font-medium text-primary">+{dayEvents.length - 2}</span>
          )}
        </span>
      </button>
    );
  })}
</div>
```

Detalhe importante: os filhos do `<button>` são `<span>`, não `<div>`. `<div>` dentro de
`<button>` é HTML inválido e o React 19 reclama em hidratação.

- [ ] **Passo 3: reduzir o padding do card da grade**

Na mesma `<div className="glass card-glow flex-1 ...">`, trocar `p-6` por `p-3 md:p-4`, para a
grade encostar menos nas bordas no celular.

- [ ] **Passo 4: build**

```bash
npm run build
```
Esperado: `Compiled successfully` e nenhum erro de TypeScript.

- [ ] **Passo 5: verificar no navegador**

Abrir o preview (`preview_start` com a config `dev`), ir para `/calendario` logado, e medir a
375px e a 320px:

```js
JSON.stringify({
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  celulas: document.querySelectorAll(".grid-cols-7 button").length,
  alturaCelula: Math.round(document.querySelector(".grid-cols-7 button").getBoundingClientRect().height),
  pontinhosVisiveis: getComputedStyle(document.querySelector(".grid-cols-7 button span:nth-child(2)")).display,
})
```
Esperado: `overflow` 0 nas duas larguras, `alturaCelula` >= 76, e os pontinhos visíveis (não
`none`) a 375px.

- [ ] **Passo 6: commit**

```bash
git add src/components/calendar/calendar-view.tsx
git commit -m "feat(calendario): grade legivel, mes em destaque e pontinhos no celular"
```

---

### Task 2: Card de contas no estilo Pierre

**Arquivos:**
- Criar: `src/components/finance/accounts-summary.tsx`
- Modificar: `src/app/(app)/financas/page.tsx`
- Remover: `src/components/finance/bank-manager.tsx`

**Interfaces:**
- Consome: `BankWithBalance` (`src/types/finance.ts`: `id`, `name`, `icon`, `balance`),
  `createBank`/`deleteBank` (`src/lib/actions/finance.ts`), `MoneyInput`, `AnimatedNumber`,
  `useReducedMotion`, `DUR`/`EASE` de `src/lib/motion.ts`.
- Produz: `AccountsSummary({ banks, income, expense, invoicesTotal })`, usado só pela página de
  Finanças.

- [ ] **Passo 1: criar o componente**

Criar `src/components/finance/accounts-summary.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, CreditCard, Plus, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { formatBRL, parseBRL } from "@/lib/money";
import { createBank, deleteBank } from "@/lib/actions/finance";
import { AnimatedNumber } from "@/components/effects/animated-number";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { DUR, EASE } from "@/lib/motion";
import { MoneyInput } from "./money-input";
import type { BankWithBalance } from "@/types/finance";

export function AccountsSummary({
  banks,
  income,
  expense,
  invoicesTotal,
}: {
  banks: BankWithBalance[];
  income: number;
  expense: number;
  invoicesTotal: number;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🏦");
  const [opening, setOpening] = useState("");
  const [saving, setSaving] = useState(false);

  const total = banks.reduce((s, b) => s + b.balance, 0);
  // conta em destaque: a de maior saldo (é o "rosto" do card, como no app de referência)
  const main = banks.reduce<BankWithBalance | null>(
    (best, b) => (!best || b.balance > best.balance ? b : best),
    null
  );

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createBank({
        name: name.trim(),
        icon: icon || "🏦",
        opening_balance: parseBRL(opening) || 0,
      });
      setName("");
      setIcon("🏦");
      setOpening("");
      setAdding(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar conta");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta conta? As transações ficam sem conta vinculada.")) return;
    try {
      await deleteBank(id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <div className="glass card-glow rounded-2xl border border-border p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 text-left"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-2xl">
          {main?.icon ?? "🏦"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-muted-foreground">Saldo em contas</span>
          <AnimatedNumber
            value={total}
            currency
            className={`block text-2xl font-bold leading-tight ${total < 0 ? "text-negative" : ""}`}
          />
          <span className="block text-xs text-muted-foreground">
            {banks.length === 0
              ? "Nenhuma conta cadastrada"
              : `${banks.length} ${banks.length === 1 ? "conta conectada" : "contas conectadas"}`}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: DUR.enter, ease: EASE.out }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-t border-border pt-4">
              {/* indicadores do mês (vieram do topo da página) */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <TrendingUp className="h-3 w-3 text-positive" /> Entradas
                  </p>
                  <p className="num mt-1 text-sm font-semibold text-positive">{formatBRL(income)}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <TrendingDown className="h-3 w-3 text-negative" /> Despesas
                  </p>
                  <p className="num mt-1 text-sm font-semibold text-negative">{formatBRL(expense)}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CreditCard className="h-3 w-3" /> Faturas
                  </p>
                  <p className="num mt-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {formatBRL(invoicesTotal)}
                  </p>
                </div>
              </div>

              {/* lista de contas */}
              <div className="mt-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Contas</h3>
                <button
                  onClick={() => setAdding((v) => !v)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
                >
                  <Plus className="h-3 w-3" /> Nova conta
                </button>
              </div>

              {adding && (
                <div className="mt-2 space-y-2 rounded-xl border border-dashed border-border p-3">
                  <div className="flex gap-2">
                    <input
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      maxLength={2}
                      className="w-12 rounded-lg border border-border bg-muted px-2 py-2 text-center text-sm"
                      placeholder="🏦"
                    />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                      placeholder="Nome da conta"
                      className="min-w-0 flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Saldo inicial</label>
                    <MoneyInput value={opening} onChange={setOpening} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={save}
                      disabled={saving || !name.trim()}
                      className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving ? "Salvando..." : "Adicionar"}
                    </button>
                    <button
                      onClick={() => setAdding(false)}
                      className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {banks.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Adicione sua primeira conta para acompanhar o saldo.
                </p>
              ) : (
                <div className="mt-2 divide-y divide-border">
                  {banks.map((bank) => (
                    <div key={bank.id} className="group flex items-center gap-3 py-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-base">
                        {bank.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{bank.name}</span>
                      <span
                        className={`num shrink-0 text-sm font-semibold ${bank.balance >= 0 ? "text-positive" : "text-negative"}`}
                      >
                        {formatBRL(bank.balance)}
                      </span>
                      <button
                        onClick={() => remove(bank.id)}
                        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                        aria-label={`Excluir ${bank.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Passo 2: usar na página e remover os 4 indicadores**

Em `src/app/(app)/financas/page.tsx`:

1. Trocar o import do `BankManager` por:
```tsx
import { AccountsSummary } from "@/components/finance/accounts-summary";
```
2. Apagar a constante `stats` (o array com Saldo do mês / Entradas / Despesas / Faturas) e o
   bloco `<Reveal stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">…</Reveal>`
   inteiro.
3. No lugar do bloco removido, colocar:
```tsx
<Reveal>
  <AccountsSummary
    banks={banks}
    income={totals.income}
    expense={totals.expense}
    invoicesTotal={invoicesTotal}
  />
</Reveal>
```
4. Na grade que tinha `<BankManager />` e `<CardManager />`, remover o `BankManager` e deixar o
   `CardManager` em largura total:
```tsx
<Reveal>
  <CardManager cards={cards} banks={banks} />
</Reveal>
```
5. Remover os imports que ficaram sem uso: `Wallet`, `TrendingUp`, `TrendingDown`, `CreditCard`
   de `lucide-react` e `AnimatedNumber`, se não forem mais usados no arquivo. O build acusa
   qualquer sobra.

- [ ] **Passo 3: remover o componente antigo**

```bash
rm src/components/finance/bank-manager.tsx
```
Conferir que ninguém mais o importa:
```bash
rg "bank-manager|BankManager" src
```
Esperado: nenhum resultado.

- [ ] **Passo 4: build**

```bash
npm run build
```
Esperado: `Compiled successfully`, sem erro de import ou variável não usada.

- [ ] **Passo 5: verificar no navegador**

Em `/financas`, medir a 375px:
```js
JSON.stringify({
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  cardContas: !!document.querySelector('[aria-expanded]'),
  textoResumo: document.querySelector('[aria-expanded]')?.innerText.replace(/\n/g, " | "),
})
```
Esperado: `overflow` 0 e o resumo com "Saldo em contas", o valor somado e "N contas conectadas".
Clicar no card e confirmar que a lista e os indicadores aparecem.

- [ ] **Passo 6: commit**

```bash
git add src/app/(app)/financas/page.tsx src/components/finance/accounts-summary.tsx
git add -u src/components/finance/bank-manager.tsx
git commit -m "feat(financas): card de contas expansivel no lugar dos 4 indicadores"
```

---

### Task 3: Seletor genérico com painel em portal

**Arquivos:**
- Criar: `src/components/ui/select-menu.tsx`

**Interfaces:**
- Produz (usado pelas tarefas 4 e 5):
```ts
export type SelectOption = {
  value: string;
  label: string;
  icon?: string;   // emoji
  color?: string;  // cor do ponto à esquerda
};

export function SelectMenu(props: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;          // classes do botão
  footer?: React.ReactNode;    // rodapé fixo dentro do painel
  onEditOption?: (opt: SelectOption) => void; // mostra lápis no item
}): React.JSX.Element;
```

- [ ] **Passo 1: criar o componente**

```tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Pencil } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  icon?: string;
  color?: string;
};

/**
 * Seletor com painel próprio (via portal, como o modal do projeto), no lugar
 * do <select> nativo: mostra ícone e cor de cada opção e aceita um rodapé
 * (usado para "Nova categoria") e edição por item.
 */
export function SelectMenu({
  value,
  options,
  onChange,
  placeholder = "Selecionar",
  disabled = false,
  className = "",
  footer,
  onEditOption,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  footer?: React.ReactNode;
  onEditOption?: (opt: SelectOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [busca, setBusca] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  // a busca só existe em lista longa; zera ao fechar para não "lembrar" filtro
  const comBusca = options.length > 8;
  useEffect(() => {
    if (!open) setBusca("");
  }, [open]);
  const visiveis = comBusca && busca.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(busca.trim().toLowerCase()))
    : options;

  // posiciona o painel sob o botão; se não couber embaixo, abre para cima
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const espacoAbaixo = window.innerHeight - r.bottom;
    const altura = Math.min(320, options.length * 40 + (footer ? 56 : 0) + 16);
    setPos({
      top: espacoAbaixo < altura + 8 ? Math.max(8, r.top - altura - 6) : r.bottom + 6,
      left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 220) - 8)),
      width: Math.max(r.width, 220),
    });
  }, [open, options.length, footer]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2 py-1.5 text-xs transition-colors hover:border-primary/40 disabled:opacity-50 ${className}`}
      >
        {selected?.color && (
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />
        )}
        <span className={`min-w-0 flex-1 truncate text-left ${selected ? "" : "text-muted-foreground"}`}>
          {selected ? `${selected.icon ?? ""} ${selected.label}`.trim() : placeholder}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
      </button>

      {mounted && open &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed z-[110] max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-2xl"
          >
            {comBusca && (
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoFocus
                placeholder="Buscar..."
                className="mb-1 w-full rounded-lg border border-border bg-muted px-2 py-1.5 text-xs outline-none focus:border-primary/50"
              />
            )}
            {visiveis.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">Nada encontrado.</p>
            )}
            {visiveis.map((o) => (
              <div key={o.value} className="group flex items-center gap-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-accent"
                >
                  {o.color && (
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: o.color }} />
                  )}
                  {o.icon && <span className="shrink-0">{o.icon}</span>}
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.value === value && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
                {onEditOption && o.value !== "" && (
                  <button
                    type="button"
                    onClick={() => onEditOption(o)}
                    aria-label={`Editar ${o.label}`}
                    className="shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {footer && <div className="mt-1 border-t border-border pt-1">{footer}</div>}
          </div>,
          document.body
        )}
    </>
  );
}
```

- [ ] **Passo 2: build**

```bash
npm run build
```
Esperado: `Compiled successfully`. O componente ainda não é usado por ninguém; isso é esperado
nesta tarefa.

- [ ] **Passo 3: commit**

```bash
git add src/components/ui/select-menu.tsx
git commit -m "feat(ui): seletor com painel em portal, base para os menus do import"
```

---

### Task 4: Seletor de categoria com criar e editar

**Arquivos:**
- Criar: `src/components/finance/category-select.tsx`

**Interfaces:**
- Consome: `SelectMenu`, `SelectOption` (Task 3); `createCategory`, `updateCategory`
  (`src/lib/actions/finance.ts`); `Category` e `TxType` (`src/types/finance.ts`).
- Produz (usado pela Task 5):
```ts
export function CategorySelect(props: {
  value: number | null;
  categories: Category[];  // já filtradas por kind pelo chamador
  kind: TxType;            // usado ao criar uma categoria nova
  disabled?: boolean;
  onChange: (id: number | null) => void;
}): React.JSX.Element;
```

- [ ] **Passo 1: criar o componente**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/lib/actions/finance";
import { SelectMenu, type SelectOption } from "@/components/ui/select-menu";
import type { Category, TxType } from "@/types/finance";

/**
 * Seletor de categoria da revisão do extrato: além de escolher, permite criar
 * uma categoria nova e editar nome e ícone das existentes sem sair da tela.
 *
 * IMPORTANTE: categoria NÃO tem cor no banco. O schema é
 * `categoryInput = { name, icon, kind }` (src/lib/validation/finance.ts) e o
 * tipo `Category` é `{ id, name, icon, kind }`. Campo extra enviado para a
 * action seria descartado silenciosamente pelo Zod, dando a impressão de que
 * salvou. A identidade visual da categoria é o emoji.
 */
export function CategorySelect({
  value,
  categories,
  kind,
  disabled = false,
  onChange,
}: {
  value: number | null;
  categories: Category[];
  kind: TxType;
  disabled?: boolean;
  onChange: (id: number | null) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<{ id: number | null; name: string; icon: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const options: SelectOption[] = [
    { value: "", label: "Sem categoria" },
    ...categories.map((c) => ({
      value: String(c.id),
      label: c.name,
      icon: c.icon,
    })),
  ];

  async function salvar() {
    if (!form || !form.name.trim()) return;
    setSaving(true);
    try {
      if (form.id === null) {
        await createCategory({ name: form.name.trim(), icon: form.icon, kind });
      } else {
        await updateCategory(form.id, { name: form.name.trim(), icon: form.icon });
      }
      setForm(null);
      router.refresh();
      toast.success(form.id === null ? "Categoria criada" : "Categoria atualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar categoria");
    } finally {
      setSaving(false);
    }
  }

  const editor = form && (
    <div className="space-y-2 p-2">
      <div className="flex gap-1.5">
        <input
          value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
          maxLength={2}
          placeholder="🏷️"
          className="w-10 rounded-lg border border-border bg-muted px-1 py-1.5 text-center text-xs"
        />
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoFocus
          placeholder="Nome da categoria"
          className="min-w-0 flex-1 rounded-lg border border-border bg-muted px-2 py-1.5 text-xs"
        />
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={salvar}
          disabled={saving || !form.name.trim()}
          className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setForm(null)}
          className="rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <SelectMenu
      value={value === null ? "" : String(value)}
      options={options}
      disabled={disabled}
      placeholder="Sem categoria"
      className="w-44"
      onChange={(v) => onChange(v === "" ? null : Number(v))}
      onEditOption={(o) => {
        const c = categories.find((x) => String(x.id) === o.value);
        if (c) setForm({ id: c.id, name: c.name, icon: c.icon });
      }}
      footer={
        form ? (
          editor
        ) : (
          <button
            type="button"
            onClick={() => setForm({ id: null, name: "", icon: "🏷️" })}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-primary hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" /> Nova categoria
          </button>
        )
      }
    />
  );
}
```

- [ ] **Passo 2: (já verificado ao escrever o plano, só confirmar que não mudou)**

As assinaturas foram conferidas no código: `createCategory(raw)` valida com
`categoryInput = z.object({ name, icon, kind })` e `updateCategory(id, raw)` usa
`categoryInput.partial()`. O código do Passo 1 já bate com isso. Confirmar com:

```bash
grep -n "categoryInput = " -A 5 src/lib/validation/finance.ts
```
Esperado: os três campos `name`, `icon`, `kind` e **nenhum** campo de cor.

- [ ] **Passo 3: build**

```bash
npm run build
```
Esperado: `Compiled successfully`.

- [ ] **Passo 4: commit**

```bash
git add src/components/finance/category-select.tsx
git commit -m "feat(financas): seletor de categoria com criar e editar"
```

---

### Task 5: Revisão do extrato usando os seletores novos

**Arquivos:**
- Modificar: `src/components/finance/import-modal.tsx` (etapa `categorize`, ~276-373)

**Interfaces:**
- Consome: `SelectMenu` (Task 3) e `CategorySelect` (Task 4).
- Produz: nada.

- [ ] **Passo 1: importar os componentes**

No topo de `import-modal.tsx`, junto dos outros imports:
```tsx
import { SelectMenu } from "@/components/ui/select-menu";
import { CategorySelect } from "./category-select";
```

- [ ] **Passo 2: trocar o seletor de conta do cabeçalho**

Substituir o `<select>` de conta (o que tem `value={bankId ?? ""}`) por:
```tsx
<SelectMenu
  value={bankId === null ? "" : String(bankId)}
  onChange={(v) => setBankId(v === "" ? null : Number(v))}
  placeholder="Sem conta"
  className="w-44"
  options={[
    { value: "", label: "Sem conta" },
    ...banks.map((b) => ({ value: String(b.id), label: b.name, icon: b.icon ?? undefined })),
  ]}
/>
```

- [ ] **Passo 3: trocar o select de Tipo por chip**

Substituir a `<td>` do tipo (a que contém o `<select>` com `value={row.type}`) por:
```tsx
<td className="px-4 py-3">
  <button
    type="button"
    disabled={row.skip}
    onClick={() => {
      const type: TxType = row.type === "expense" ? "income" : "expense";
      update(row.id, { type, categoryId: null, isCardPayment: false });
    }}
    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
      row.type === "income"
        ? "bg-positive/15 text-positive hover:bg-positive/25"
        : "bg-negative/15 text-negative hover:bg-negative/25"
    }`}
    title="Alternar entre despesa e receita"
  >
    {row.type === "income" ? "Receita" : "Despesa"}
  </button>
</td>
```

- [ ] **Passo 4: trocar o select de categoria e o de cartão**

Substituir a `<td>` da categoria inteira (o bloco `{row.isCardPayment ? (<select…cardId…>) : (<select…categoryId…>)}`) por:
```tsx
<td className="px-4 py-3">
  {row.isCardPayment ? (
    <SelectMenu
      value={row.cardId === null ? "" : String(row.cardId)}
      disabled={row.skip}
      placeholder="💳 Fatura de qual cartão?"
      className="w-44 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-300"
      onChange={(v) => update(row.id, { cardId: v === "" ? null : Number(v) })}
      options={cards.map((c) => ({ value: String(c.id), label: c.name, icon: "💳" }))}
    />
  ) : (
    <CategorySelect
      value={row.categoryId}
      categories={categories.filter((c) => c.kind === row.type)}
      kind={row.type}
      disabled={row.skip}
      onChange={(id) => update(row.id, { categoryId: id })}
    />
  )}
</td>
```

- [ ] **Passo 5: dar respiro à tabela e usar as cores semânticas**

Na mesma etapa:
1. trocar todos os `py-2.5` das `<td>` por `py-3`;
2. na `<td>` do valor, trocar `text-emerald-600` por `text-positive` e `text-red-500` por
   `text-negative`, e acrescentar a classe `num`:
```tsx
<td className={`num whitespace-nowrap px-4 py-3 text-right text-xs font-semibold ${row.type === "income" ? "text-positive" : "text-negative"}`}>
```

- [ ] **Passo 6: build**

```bash
npm run build
```
Esperado: `Compiled successfully`.

- [ ] **Passo 7: verificar no navegador**

Em `/financas`, abrir "Importar extrato", subir um CSV de teste e, na etapa Revisar:
1. abrir o seletor de categoria de uma linha e confirmar que o painel aparece por cima do modal
   (o painel usa `z-[110]`, acima do `z-[100]` do modal);
2. criar uma categoria pelo rodapé e confirmar que ela aparece selecionada na linha;
3. clicar no lápis de uma categoria, renomear e confirmar que a lista atualiza;
4. medir: `document.documentElement.scrollWidth - document.documentElement.clientWidth` deve ser 0.

- [ ] **Passo 8: varredura de travessão e commit**

```bash
rg "—|–" src
git add src/components/finance/import-modal.tsx
git commit -m "feat(financas): revisao do extrato com seletores modernos e categorias editaveis"
```

---

## Fechamento (após as 5 tarefas)

- [ ] Atualizar o `HANDOFF.md` com a Onda 14: o que mudou, arquivos, decisões (eventos seguem
      nas células com pontinhos no celular; indicadores migraram para dentro do card de contas;
      seletor próprio no lugar do nativo) e o que ficou pendente de validação do dono.
- [ ] `npm run build` final.
- [ ] Rodar `/graphify . --update` (o grafo tem arquivo novo e um removido).
- [ ] Merge na `main` e push (a Vercel publica).
