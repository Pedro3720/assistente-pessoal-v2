# Navegação iPhone estilo Pierre Implementation Plan

> **Para quem executar:** implementar tarefa a tarefa. Sem framework de testes neste projeto:
> a verificação de cada tarefa é `npm run build` + checagem no navegador em viewport de iPhone
> (390x844), medindo via DOM/JS como nas ondas anteriores. Validação final é no iPhone do dono.

**Goal:** dar ao app uma navegação nativa de iPhone: barra inferior fixa com as 4 seções do dia a dia
e um botão central de ação rápida, no lugar de depender só do menu hambúrguer.

**Architecture:** um componente `BottomNav` (client, `md:hidden`) fixo no rodapé, com safe-area, que
usa `usePathname` para o estado ativo. O botão central abre uma folha inferior (`QuickActions`,
via portal) com 3 atalhos de criação, que navegam com `?new=1`; cada tela abre seu modal de criação
ao detectar esse parâmetro. O desktop (md+) continua exatamente como está, com a sidebar.

**Tech Stack:** Next 16 App Router, React 19, Tailwind v4, lucide-react.

## Global Constraints

- **Nunca usar travessão `—`/`–` em texto visível** (regra do `CLAUDE.md`).
- **Desktop inalterado:** tudo da barra inferior fica atrás de `md:hidden`.
- **Safe areas:** a barra e a folha respeitam `env(safe-area-inset-bottom)` (home indicator).
- **Modais via portal** (`createPortal` no `document.body`), senão ficam presos atrás de ancestrais
  com `transform` (lição do bug #31).
- **O hambúrguer permanece** como acesso a "Mais" (Senhas, Sugestões, Admin, Perfil, tema, Sair),
  porque 4 abas + Mais + botão central não cabem numa barra iOS.
- Validação: `npm run build` + viewport 390x844 no preview.

---

### Task 1: Folha de ações rápidas (QuickActions)

Feita primeiro porque a Task 2 (barra) importa este componente.

**Files:**
- Create: `src/components/layout/quick-actions.tsx`

**Interfaces:**
- Produces: `QuickActions({ onClose }: { onClose: () => void })`, folha inferior via portal com 3
  atalhos que navegam para `/financas?new=1`, `/tarefas?new=1`, `/calendario?new=1`.

- [ ] **Step 1: criar** `src/components/layout/quick-actions.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Wallet, ListChecks, Calendar, X } from "lucide-react";

const ACTIONS = [
  { label: "Nova transação", href: "/financas?new=1", icon: Wallet },
  { label: "Nova tarefa", href: "/tarefas?new=1", icon: ListChecks },
  { label: "Novo evento", href: "/calendario?new=1", icon: Calendar },
];

export function QuickActions({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        data-testid="quick-actions"
        className="w-full rounded-t-3xl border-t border-border bg-popover p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Criar</p>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-1">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.href}
                onClick={() => {
                  onClose();
                  router.push(a.href);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-accent"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: build**

Run: `npm run build`
Expected: compila sem erro.

- [ ] **Step 3: commit**

```bash
git add src/components/layout/quick-actions.tsx
git commit -m "feat(nav): folha de acoes rapidas (criar transacao/tarefa/evento)"
```

---

### Task 2: Barra de navegação inferior (BottomNav)

**Files:**
- Create: `src/components/layout/bottom-nav.tsx`
- Modify: `src/app/(app)/layout.tsx` (renderizar a barra + reservar espaço no conteúdo)

**Interfaces:**
- Consumes: `QuickActions` (Task 1).
- Produces: `BottomNav()`, barra fixa `md:hidden` com abas Início, Finanças, [+], Tarefas, Agenda.

- [ ] **Step 1: criar** `src/components/layout/bottom-nav.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ElementType } from "react";
import { LayoutDashboard, Wallet, ListChecks, Calendar, Plus } from "lucide-react";
import { QuickActions } from "./quick-actions";

const TABS = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/financas", label: "Finanças", icon: Wallet },
  { href: "/tarefas", label: "Tarefas", icon: ListChecks },
  { href: "/calendario", label: "Agenda", icon: Calendar },
];

function Tab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.6} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [quickOpen, setQuickOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <nav
        aria-label="Navegação principal"
        data-testid="bottom-nav"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="flex h-16 items-center justify-around px-2">
          {TABS.slice(0, 2).map((t) => (
            <Tab key={t.href} href={t.href} label={t.label} icon={t.icon} active={isActive(t.href)} />
          ))}
          <button
            onClick={() => setQuickOpen(true)}
            aria-label="Ações rápidas"
            className="-mt-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
          >
            <Plus className="h-6 w-6" />
          </button>
          {TABS.slice(2).map((t) => (
            <Tab key={t.href} href={t.href} label={t.label} icon={t.icon} active={isActive(t.href)} />
          ))}
        </div>
      </nav>
      {quickOpen && <QuickActions onClose={() => setQuickOpen(false)} />}
    </>
  );
}
```

- [ ] **Step 2: integrar** em `src/app/(app)/layout.tsx`

Adicionar o import:

```tsx
import { BottomNav } from "@/components/layout/bottom-nav";
```

Trocar o padding inferior do conteúdo (reserva 4rem da barra) e renderizar a barra. O bloco do
`<main>` fica assim:

```tsx
      <main className="flex-1">
        <div className="px-4 pt-[calc(env(safe-area-inset-top)+5rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] md:px-10 md:pt-10 md:pb-10">
          <IosInstallHint />
          <NotificationBanner />
          {children}
        </div>
      </main>
      <BottomNav />
```

(O `<BottomNav />` fica fora do `<main>`, como último filho do `<div className="flex min-h-screen">`.)

- [ ] **Step 3: build**

Run: `npm run build`
Expected: compila sem erro.

- [ ] **Step 4: verificar no navegador** (viewport 390x844, rota pública temporária se necessário):
  - `document.querySelector('[data-testid="bottom-nav"]')` existe e sua borda inferior encosta na
    viewport;
  - a barra some em viewport `>= 768px` (classe `md:hidden`);
  - clicar no botão "+" faz aparecer `[data-testid="quick-actions"]`;
  - o conteúdo não fica escondido atrás da barra (o `pb` reserva 6rem).

- [ ] **Step 5: commit**

```bash
git add src/components/layout/bottom-nav.tsx "src/app/(app)/layout.tsx"
git commit -m "feat(nav): barra inferior de navegacao no mobile com acao central"
```

---

### Task 3: Abrir o modal de criação via `?new=1`

Faz os atalhos da folha caírem direto no formulário, em vez de só abrir a tela.

**Files:**
- Modify: `src/components/tasks/tasks-view.tsx`
- Modify: `src/components/calendar/calendar-view.tsx`
- Modify: `src/components/finance/transactions-section.tsx`

**Interfaces:**
- Consumes: os links `?new=1` da Task 1.
- Produces: cada tela abre seu modal de criação ao montar com `new=1` e limpa a URL.

- [ ] **Step 1: tarefas.** Em `src/components/tasks/tasks-view.tsx`, trocar o import de navegação
  (o arquivo já importa `useEffect`):

```tsx
import { useRouter, useSearchParams } from "next/navigation";
```

e, logo após a linha `const catById = useMemo(...)`, adicionar:

```tsx
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setModalOpen(true);
      router.replace("/tarefas");
    }
  }, [searchParams, router]);
```

- [ ] **Step 2: calendário.** Em `src/components/calendar/calendar-view.tsx`, trocar os imports
  (o arquivo importa `useMemo, useState`, falta `useEffect`):

```tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
```

e, logo após a linha `const [viewing, setViewing] = useState<EventOccurrence | null>(null);`, adicionar:

```tsx
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setPresetDate(null);
      setModalOpen(true);
      router.replace("/calendario");
    }
  }, [searchParams, router]);
```

- [ ] **Step 3: finanças.** Em `src/components/finance/transactions-section.tsx`, trocar o import de
  navegação (o arquivo já importa `useEffect`):

```tsx
import { useRouter, useSearchParams } from "next/navigation";
```

e, logo após a linha `const [fullOpen, setFullOpen] = useState(false);`, adicionar:

```tsx
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditingId(null);
      setOpen(true);
      router.replace("/financas");
    }
  }, [searchParams, router]);
```

- [ ] **Step 4: build**

Run: `npm run build`
Expected: compila sem erro.

- [ ] **Step 5: verificar** no navegador: abrir `/tarefas?new=1` e confirmar que o modal de nova
  tarefa abre sozinho e a URL volta para `/tarefas`. Repetir para `/calendario?new=1` e
  `/financas?new=1`.

- [ ] **Step 6: commit**

```bash
git add src/components/tasks/tasks-view.tsx src/components/calendar/calendar-view.tsx src/components/finance/transactions-section.tsx
git commit -m "feat(nav): atalhos de criacao abrem o modal direto (?new=1)"
```

---

## Self-Review (feito)

- **Cobertura:** barra com as 4 abas escolhidas (Início, Finanças, Tarefas, Agenda) + botão central
  de ação rápida (Task 2), folha com os 3 atalhos (Task 1), e os atalhos caindo no formulário (Task 3).
- **Conflito resolvido:** "Mais" continua no hambúrguer existente, documentado nas constraints.
- **Placeholders:** nenhum. Na Task 3, os três passos trazem o código completo com os nomes de estado
  reais de cada arquivo (`setModalOpen`/`setEditing` em tarefas e calendário, `setOpen`/`setEditingId`
  em transações), conferidos no código antes de escrever o plano.
- **Consistência de tipos/nomes:** `QuickActions({ onClose })` é consumido exatamente assim pela
  `BottomNav`; os hrefs `?new=1` da Task 1 batem com as rotas tratadas na Task 3.
- **Desktop:** intocado (tudo `md:hidden`); o `pb` extra do conteúdo só vale no mobile.
- **Fora de escopo (para um plano futuro):** redesenho visual dos cards, cantos mais arredondados,
  e substituir o hambúrguer por uma aba "Mais" caso o botão central seja removido um dia.
