# Onda 18: redesign visual clean, plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar no Zênite o sistema de design monocromático descrito em `docs/superpowers/specs/2026-08-03-onda18-redesign-visual-clean-design.md`, entregando tokens, shell, biblioteca base e a tela piloto de Finanças.

**Architecture:** Retokenização por cima (mesmos nomes de token, valores novos, mais `--panel` e `--subtle-foreground`), de modo que todas as rotas herdem a pele nova de imediato. Sobre isso entram um shell de app-frame só no desktop e uma biblioteca de nove primitivos em `src/components/ui/`. Finanças é a única tela que ganha os componentes novos nesta onda.

**Tech Stack:** Next.js App Router (Server Components leem, Server Actions mutam), Tailwind v4 com `@theme inline`, recharts (só o donut), lucide-react, Supabase com RLS `own_rows`, Capacitor para o app instalado.

## Global Constraints

- **Não existe framework de testes neste projeto.** O ciclo de verificação de cada task é `npm run build` seguido de conferência manual no preview. Onde este plano diz "verificar", é isso.
- **Nunca usar `—` (em dash) nem `–` (en dash) em texto visível ao usuário.** Usar vírgula, ponto, dois-pontos, parênteses ou "e".
- Dinheiro sempre por `src/lib/money.ts`; datas sempre por `src/lib/dates.ts`.
- Server Components leem dados; Server Actions mutam. Nunca buscar dado em client component.
- A CLI do Supabase está bloqueada nesta máquina: migração é SQL colado à mão no SQL Editor pelo dono do projeto.
- **A estrutura do mobile não muda nesta onda.** Nada de header fixo, scroll interno ou mudança de safe-area. Só a pele.
- `--chart-1` a `--chart-5` não mudam em nenhuma task: são a paleta categórica já validada para daltonismo.
- Um commit por task, com a task inteira verificada antes.

---

## Estrutura de arquivos

**Criados**

| Arquivo | Responsabilidade |
|---|---|
| `src/app/(auth)/layout.tsx` | Segura o grão que sai do root layout |
| `src/components/ui/app-frame.tsx` | Moldura e painel com scroll interno no desktop |
| `src/components/ui/panel-header.tsx` | Linha de topo do painel |
| `src/components/ui/segmented.tsx` | Abas em pill |
| `src/components/ui/search-input.tsx` | Campo de busca pill |
| `src/components/ui/meter.tsx` | Barra de 4px com linha de rótulos |
| `src/components/ui/money.tsx` | Valor tabular com sinal e cor |
| `src/components/ui/category-chip.tsx` | Marcador de cor e nome |
| `src/components/ui/brand-avatar.tsx` | Círculo com logo ou inicial |
| `src/components/ui/data-table.tsx` | Casca de tabela |
| `src/lib/finance/brands.ts` | Mapa de palavra-chave para marca |
| `src/components/finance/accounts-card.tsx` | Card "Contas" do rail |
| `src/components/finance/cards-card.tsx` | Card "Cartões" do rail |
| `src/components/finance/category-legend.tsx` | Legenda do donut com meter |
| `src/components/finance/monthly-expense-chart.tsx` | Barras de saídas por mês |

**Modificados**

`src/app/globals.css`, `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/components/layout/sidebar.tsx`, `src/components/ui/button.tsx`, `src/lib/finance/category-chart.ts`, `src/lib/data/finance.ts`, `src/app/(app)/financas/page.tsx`, `src/components/finance/category-manager.tsx`, `src/types/finance.ts`.

---

## Fase A: fundação

### Task 1: Tokens, raio e fontes

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/app/(auth)/layout.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: tokens CSS `--panel` e `--subtle-foreground`, utilitárias Tailwind `bg-panel`, `text-subtle-foreground`. Todas as tasks seguintes usam esses nomes.

- [ ] **Step 1: Adicionar os dois tokens novos ao `@theme inline` e remover o de fonte de número**

Em `src/app/globals.css`, dentro do bloco `@theme inline`, apagar a linha `--font-num: var(--font-num);` e acrescentar, logo abaixo de `--color-foreground`:

```css
  --color-panel: var(--panel);
  --color-subtle-foreground: var(--subtle-foreground);
```

- [ ] **Step 2: Substituir o bloco `:root` inteiro**

```css
:root {
  --background: #eef0f4;
  --foreground: #1c2430;
  --panel: #f7f8fa;
  --card: #ffffff;
  --card-foreground: #1c2430;
  --popover: #ffffff;
  --popover-foreground: #1c2430;
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --secondary: #f2f4f7;
  --secondary-foreground: #1c2430;
  --muted: #eceff3;
  --muted-foreground: #4a5566;
  --subtle-foreground: #64707f;
  --accent: #e7eaf0;
  --accent-foreground: #1c2430;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --positive: #16a34a;
  --negative: #e11d48;
  --border: rgba(15, 23, 42, 0.08);
  --input: rgba(15, 23, 42, 0.14);
  --ring: #2563eb;
  /* Paleta CATEGÓRICA (identidade de série), ordem fixa, nunca ciclada.
     Validada nos dois modos para daltonismo e contraste. NÃO alterar. */
  --chart-1: #3b82f6;
  --chart-2: #d97706;
  --chart-3: #0891b2;
  --chart-4: #7c3aed;
  --chart-5: #059669;
  /* lg = 12px (card), xl ~ 17px (painel) */
  --radius: 0.75rem;
  --sidebar: #eef0f4;
  --sidebar-foreground: #1c2430;
  --sidebar-primary: #2563eb;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #e7eaf0;
  --sidebar-accent-foreground: #1c2430;
  --sidebar-border: rgba(15, 23, 42, 0.08);
  --sidebar-ring: #2563eb;
}
```

- [ ] **Step 3: Substituir o bloco `.dark` inteiro**

```css
.dark {
  --background: #05070c;
  --foreground: #e9edf5;
  --panel: #0b0f17;
  --card: #111722;
  --card-foreground: #e9edf5;
  --popover: #141b27;
  --popover-foreground: #e9edf5;
  --primary: #3b82f6;
  --primary-foreground: #ffffff;
  --secondary: #18202d;
  --secondary-foreground: #e9edf5;
  --muted: #0f141d;
  --muted-foreground: #97a3b5;
  --subtle-foreground: #737f90;
  --accent: #212a3a;
  --accent-foreground: #e9edf5;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --positive: #4ade80;
  --negative: #fb7185;
  --border: rgba(233, 237, 245, 0.07);
  --input: rgba(233, 237, 245, 0.1);
  --ring: #3b82f6;
  --chart-1: #3b82f6;
  --chart-2: #d97706;
  --chart-3: #0891b2;
  --chart-4: #7c3aed;
  --chart-5: #059669;
  --sidebar: #05070c;
  --sidebar-foreground: #e9edf5;
  --sidebar-primary: #3b82f6;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #212a3a;
  --sidebar-accent-foreground: #e9edf5;
  --sidebar-border: rgba(233, 237, 245, 0.07);
  --sidebar-ring: #3b82f6;
}
```

- [ ] **Step 4: Ajustar as utilitárias de efeito**

Na utilitária `.num`, apagar a linha `font-family: var(--font-num), system-ui, sans-serif;`, mantendo as duas linhas de numeral tabular.

Substituir os blocos `.card-glow` e `.card-glow:hover` por:

```css
  /* Onda 18: profundidade por clareamento de fundo, sem deslocamento nem halo. */
  .card-glow {
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease;
  }
  .card-glow:hover {
    background-color: var(--secondary);
  }
```

`.text-gradient`, `.text-gradient-animated` e `.glass` continuam definidas, porque as telas de auth ainda usam. O que sai é o uso delas dentro de `(app)`, nas tasks seguintes.

No `@layer base`, trocar a regra do seletor universal para o anel de foco de 2px com afastamento:

```css
  * {
    @apply border-border;
  }
  *:focus-visible {
    @apply outline-2 outline-offset-2 outline-ring;
  }
```

- [ ] **Step 5: Trocar a scrollbar por uma neutra de 6px**

Substituir o bloco `/* ─── Scrollbar custom ─── */` inteiro por:

```css
/* ─── Scrollbar custom ───────────────────────────────────── */
.dark ::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.dark ::-webkit-scrollbar-track {
  background: transparent;
}
.dark ::-webkit-scrollbar-thumb {
  background: rgba(233, 237, 245, 0.14);
  border-radius: 999px;
}
.dark ::-webkit-scrollbar-thumb:hover {
  background: rgba(233, 237, 245, 0.22);
}
```

- [ ] **Step 6: Remover a fonte de números e o grão do root layout**

Em `src/app/layout.tsx`: trocar o import da linha 2 por `import { Space_Grotesk, Inter } from "next/font/google";`, apagar todo o bloco `const plusJakarta = Plus_Jakarta_Sans({...})` (linhas 21 a 27), trocar o `className` do `body` por `` className={`${inter.variable} ${spaceGrotesk.variable}`} ``, apagar a linha `<div className="grain-overlay" aria-hidden />` e trocar `themeColor: "#080b12"` por `themeColor: "#05070c"`.

- [ ] **Step 7: Criar o layout de auth que herda o grão**

```tsx
// src/app/(auth)/layout.tsx
/**
 * As telas de entrada mantêm os efeitos decorativos (grão, gradiente animado)
 * que saíram do app: ali eles vendem o produto e não atrapalham leitura de dado.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div className="grain-overlay" aria-hidden />
    </>
  );
}
```

- [ ] **Step 8: Verificar**

Rodar: `npm run build`
Esperado: build sem erro. Se acusar `--font-num` ou `Plus_Jakarta_Sans`, sobrou referência: procurar com `rg "font-num|Plus_Jakarta" src` e limpar.

Abrir o app e conferir que `/login` ainda tem grão e que o app não tem mais.

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx "src/app/(auth)/layout.tsx"
git commit -m "feat(design): tokens da Onda 18, raio 12px e duas familias de fonte"
```

---

### Task 2: Varredura de regressão dos tokens

Trocar os valores dos tokens muda todas as rotas de uma vez. Esta task existe para achar o que ficou ilegível antes de construir por cima.

**Files:**
- Modify: os arquivos que a varredura apontar.

**Interfaces:**
- Consumes: tokens da Task 1.
- Produces: nada de novo, só telas legíveis.

- [ ] **Step 1: Achar quem dependia do azul no `--accent`**

Rodar: `rg "accent-foreground|bg-accent" src --stats`

`--accent` deixou de ser azul e virou cinza, e `--accent-foreground` deixou de ser azul claro. Em cada ocorrência, decidir: se o objetivo era "estado ativo ou selecionado", está correto e fica; se o objetivo era "destaque azul de marca", trocar por `text-primary` ou `bg-primary/10`.

- [ ] **Step 2: Achar dependência do hex literal**

Rodar: `rg "#3b82f6|#080b12|#0e131d|#131a27|#1c2536|#94a3b8" src`

Qualquer ocorrência fora de `globals.css` deve virar token. A única exceção legítima é `--chart-1`, que continua `#3b82f6` por definição.

- [ ] **Step 3: Conferir cada rota nos dois temas**

Percorrer `/`, `/calendario`, `/financas`, `/tarefas`, `/senhas`, `/sugestoes`, `/perfil` e `/admin/sugestoes`, em tema escuro e claro, largura de desktop e de celular. Anotar e corrigir só o que estiver ilegível ou invisível. Não redesenhar nada: as telas migram em ondas futuras.

Atenção especial ao tema claro: cards que antes eram `bg-card` branco sobre fundo branco agora ficam brancos sobre `#eef0f4`, o que é a correção desejada, mas qualquer card que usasse `bg-background` para parecer card vai sumir.

- [ ] **Step 4: Remover os gradientes de texto de dentro do app**

Rodar: `rg "text-gradient" "src/app/(app)" src/components`

Em cada uso dentro do app, trocar a classe `text-gradient` (ou `text-gradient-animated`) por `text-foreground`. As telas de auth ficam como estão.

- [ ] **Step 5: Verificar**

Rodar: `npm run build`
Esperado: build sem erro, e nenhuma tela com texto ilegível na conferência manual.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "fix(design): ajusta usos que dependiam dos tokens antigos"
```

---

## Fase B: shell

### Task 3: AppFrame e layout do app

**Files:**
- Create: `src/components/ui/app-frame.tsx`
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: token `--panel`.
- Produces: `<AppFrame header?: ReactNode>` que envolve o conteúdo das rotas do app.

- [ ] **Step 1: Criar o AppFrame**

```tsx
// src/components/ui/app-frame.tsx
import { cn } from "@/lib/utils";

/**
 * Moldura do app. No desktop o conteúdo vive num painel arredondado que
 * flutua sobre o fundo e rola por dentro, o que mantém o cabeçalho sempre
 * visível. No celular não há moldura: a página rola normalmente e a
 * navegação continua sendo a barra inferior.
 */
export function AppFrame({
  header,
  children,
  className,
}: {
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="md:h-screen md:p-3 md:pl-0">
      <div
        className={cn(
          "flex min-h-0 flex-col md:h-full md:overflow-hidden md:rounded-xl md:bg-panel",
          className
        )}
      >
        {header ? <div className="shrink-0">{header}</div> : null}
        <div className="min-h-0 flex-1 md:overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Ligar o AppFrame no layout do app**

Em `src/app/(app)/layout.tsx`, substituir o `<main>` inteiro (linhas 34 a 44 do arquivo atual) por:

```tsx
      <main className="min-w-0 flex-1 md:h-screen">
        <AppFrame>
          {/* Coluna do app: uma largura maxima só, centralizada. Cada pagina
              centraliza a propria largura de leitura dentro dela. */}
          <div className="mx-auto w-full max-w-7xl px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] md:px-6 md:py-6">
            <IosInstallHint />
            <NotificationBanner />
            {children}
          </div>
        </AppFrame>
      </main>
```

E acrescentar o import `import { AppFrame } from "@/components/ui/app-frame";`.

Trocar também `<div className="flex min-h-screen">` por `<div className="flex min-h-screen md:h-screen md:overflow-hidden">`, que é o que impede a página de rolar no desktop.

- [ ] **Step 3: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No preview em largura de desktop: o conteúdo aparece num painel arredondado com margem, e a rolagem acontece dentro do painel, não na janela. Em largura de celular: nada mudou, a página rola inteira e a bottom nav continua no lugar.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/app-frame.tsx "src/app/(app)/layout.tsx"
git commit -m "feat(shell): painel flutuante com scroll interno no desktop"
```

---

### Task 4: Sidebar

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: tokens da Task 1.
- Produces: nada novo, mesma API de props.

- [ ] **Step 1: Tirar a borda e o blur do `<aside>`**

Substituir o `className` do `<aside>` por:

```tsx
      className={cn(
        "hidden w-56 flex-col bg-sidebar transition-all duration-300 ease-in-out",
        "md:sticky md:top-0 md:flex md:h-screen",
        collapsed && "md:w-16"
      )}
```

A sidebar passa a ter a mesma cor da moldura e se separa do painel pelo vão, não por linha.

- [ ] **Step 2: Tirar a borda do bloco da marca**

No `<div>` da marca, trocar `"flex h-[72px] items-center justify-between gap-2 border-b border-sidebar-border px-4"` por `"flex h-[72px] items-center justify-between gap-2 px-4"`.

- [ ] **Step 3: Ajustar o item de navegação**

Substituir o `className` do `<Link>` de item por:

```tsx
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150",
                collapsed && "md:justify-center md:px-0",
                isActive
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "font-normal text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
```

E o `className` do `<Icon>` por:

```tsx
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-sidebar-accent-foreground" : "text-muted-foreground"
                )}
```

O `strokeWidth={isActive ? 2 : 1.5}` fica como está.

- [ ] **Step 4: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No preview: a sidebar não tem mais linha divisória, o item ativo é um preenchimento cinza (não azul) e os inativos estão legíveis (antes eram `foreground/45`, agora `muted-foreground`).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(shell): sidebar sem borda com item ativo neutro"
```

---

## Fase C: primitivos

### Task 5: Money e CategoryChip

**Files:**
- Create: `src/components/ui/money.tsx`
- Create: `src/components/ui/category-chip.tsx`

**Interfaces:**
- Consumes: `formatBRL` de `src/lib/money.ts`, `EntityIcon` de `src/components/ui/entity-icon.tsx`.
- Produces:
  - `<Money value: number, signed?: boolean, colorize?: boolean, className?: string />`
  - `<CategoryChip name: string, color: string, icon?: string, className?: string />`

- [ ] **Step 1: Criar o Money**

```tsx
// src/components/ui/money.tsx
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Valor em dinheiro. Concentra três regras que precisam ser iguais em todas
 * as telas: numeral tabular (para as colunas alinharem), sinal antes do
 * símbolo e cor semântica. O valor é decimal em reais, como em lib/money.
 */
export function Money({
  value,
  signed = false,
  colorize = false,
  className,
}: {
  value: number;
  /** mostra "+ " nas entradas e "- " nas saídas, em vez do menos colado */
  signed?: boolean;
  /** verde para entrada, coral para saída */
  colorize?: boolean;
  className?: string;
}) {
  const negative = value < 0;
  const prefix = signed ? (negative ? "- " : "+ ") : "";
  const shown = signed ? Math.abs(value) : value;

  return (
    <span
      className={cn(
        "num",
        colorize && (negative ? "text-negative" : "text-positive"),
        className
      )}
    >
      {prefix}
      {formatBRL(shown)}
    </span>
  );
}
```

- [ ] **Step 2: Criar o CategoryChip**

```tsx
// src/components/ui/category-chip.tsx
import { EntityIcon } from "@/components/ui/entity-icon";
import { cn } from "@/lib/utils";

/**
 * Identidade de categoria: marcador de cor e nome, sem fundo. Dezenas de
 * badges preenchidos poluiriam a tabela, então a cor vive no marcador e no
 * texto. O ícone repete a identidade para quem não distingue a cor.
 */
export function CategoryChip({
  name,
  color,
  icon,
  className,
}: {
  name: string;
  /** valor de cor pronto, normalmente "var(--chart-N)" */
  color: string;
  icon?: string;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5 text-xs", className)}>
      <span
        className="h-2 w-2 shrink-0 rounded-[3px]"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {icon ? <EntityIcon value={icon} size={13} className="h-3.5 w-3.5 shrink-0" /> : null}
      <span className="truncate" style={{ color }}>
        {name}
      </span>
    </span>
  );
}
```

- [ ] **Step 3: Verificar**

Rodar: `npm run build`
Esperado: build sem erro. Os componentes ainda não estão montados em tela; a verificação visual acontece na Task 14.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/money.tsx src/components/ui/category-chip.tsx
git commit -m "feat(ui): primitivos Money e CategoryChip"
```

---

### Task 6: Meter

O componente central da onda: serve orçamento de categoria, limite de cartão e qualquer progresso futuro.

**Files:**
- Create: `src/components/ui/meter.tsx`

**Interfaces:**
- Consumes: tokens `--muted`, `--foreground`, `--negative`.
- Produces: `<Meter value: number, max: number, leftLabel: ReactNode, rightLabel: ReactNode, className?: string />`

- [ ] **Step 1: Criar o Meter**

```tsx
// src/components/ui/meter.tsx
import { cn } from "@/lib/utils";

/**
 * Barra de progresso com rótulos. A barra trava em 100% mesmo quando o
 * consumo passa do limite, e o número real continua aparecendo no rótulo:
 * uma barra de 700% de largura não cabe na tela e não diz nada a mais.
 */
export function Meter({
  value,
  max,
  leftLabel,
  rightLabel,
  className,
}: {
  value: number;
  max: number;
  leftLabel: React.ReactNode;
  rightLabel: React.ReactNode;
  className?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const over = pct > 100;
  const width = Math.min(Math.max(pct, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">{leftLabel}</span>
        <span className={over ? "text-negative" : "text-muted-foreground"}>{rightLabel}</span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("bar-grow h-1 rounded-full", over ? "bg-negative" : "bg-foreground")}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/meter.tsx
git commit -m "feat(ui): Meter, barra de progresso com rotulos"
```

---

### Task 7: BrandAvatar e mapa de marcas

**Files:**
- Create: `src/lib/finance/brands.ts`
- Create: `src/components/ui/brand-avatar.tsx`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `brandSlugFor(description: string): string | null`
  - `<BrandAvatar name: string, size?: number, className?: string />`

- [ ] **Step 1: Criar o mapa de marcas**

Sem chamada externa: o app roda em Capacitor, e buscar logo em serviço de terceiro significaria CSP, latência e entregar a um estranho o que a pessoa consome.

```ts
// src/lib/finance/brands.ts
/**
 * Reconhecimento de marca a partir da descrição da transação.
 *
 * O logo é servido de `public/brands/<slug>.svg`, nunca de serviço externo:
 * o app roda empacotado (Capacitor) e o que a pessoa consome não deve sair
 * daqui. Sem correspondência, o avatar cai na inicial.
 */

/** palavra-chave normalizada -> slug do arquivo em public/brands */
const BRANDS: Record<string, string> = {
  uber: "uber",
  "99": "noventa-e-nove",
  ifood: "ifood",
  rappi: "rappi",
  netflix: "netflix",
  spotify: "spotify",
  amazon: "amazon",
  "mercado livre": "mercado-livre",
  mercadolivre: "mercado-livre",
  magalu: "magalu",
  americanas: "americanas",
  shopee: "shopee",
  shein: "shein",
  aliexpress: "aliexpress",
  steam: "steam",
  kabum: "kabum",
  carrefour: "carrefour",
  assai: "assai",
  atacadao: "atacadao",
  "pao de acucar": "pao-de-acucar",
  drogasil: "drogasil",
  "raia": "droga-raia",
  petrobras: "petrobras",
  shell: "shell",
  ipiranga: "ipiranga",
  mcdonald: "mcdonalds",
  "burger king": "burger-king",
  starbucks: "starbucks",
  nubank: "nubank",
  itau: "itau",
  bradesco: "bradesco",
  "google": "google",
  apple: "apple",
  duolingo: "duolingo",
};

/** Tira acento e caixa, que é como as descrições chegam do banco. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Devolve o slug da marca citada na descrição, ou null.
 * A busca é por substring: "Kabum · Teclado mecanico" casa com "kabum".
 */
export function brandSlugFor(description: string): string | null {
  const haystack = normalize(description);
  for (const [needle, slug] of Object.entries(BRANDS)) {
    if (haystack.includes(needle)) return slug;
  }
  return null;
}
```

- [ ] **Step 2: Criar o BrandAvatar**

```tsx
// src/components/ui/brand-avatar.tsx
import Image from "next/image";
import { brandSlugFor } from "@/lib/finance/brands";
import { cn } from "@/lib/utils";

/**
 * Tons neutros dessaturados para o fallback de inicial. Deliberadamente fora
 * da paleta categórica: a cor do avatar não pode competir com a cor que
 * significa categoria.
 */
const FALLBACK_TONES = ["#3a4356", "#4a4055", "#2f4a4a", "#4a4436", "#38414a"];

function toneFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return FALLBACK_TONES[Math.abs(hash) % FALLBACK_TONES.length];
}

/** Duas primeiras letras da primeira palavra com conteúdo. */
function initials(name: string): string {
  const word = name.trim().split(/\s+/)[0] ?? "";
  return word.slice(0, 2).toUpperCase() || "?";
}

export function BrandAvatar({
  name,
  size = 28,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const slug = brandSlugFor(name);

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: slug ? "#ffffff" : toneFor(name),
      }}
      aria-hidden
    >
      {slug ? (
        <Image src={`/brands/${slug}.svg`} alt="" width={size} height={size} />
      ) : (
        <span
          className="font-semibold text-white"
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 3: Criar a pasta de logos**

Criar `public/brands/` e colocar ao menos um arquivo de teste, `public/brands/uber.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#000"/><text x="16" y="21" font-family="Arial" font-size="13" font-weight="bold" fill="#fff" text-anchor="middle">U</text></svg>
```

Os demais logos entram aos poucos: enquanto o arquivo não existir, o `next/image` falha e o avatar fica vazio, então **só adicionar a chave em `BRANDS` quando o SVG correspondente existir**. Nesta task, deixar em `BRANDS` apenas as chaves que já têm arquivo, comentando as demais.

- [ ] **Step 4: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/lib/finance/brands.ts src/components/ui/brand-avatar.tsx public/brands
git commit -m "feat(ui): BrandAvatar com mapa local de marcas"
```

---

### Task 8: Segmented, SearchInput e variantes de Button

**Files:**
- Create: `src/components/ui/segmented.tsx`
- Create: `src/components/ui/search-input.tsx`
- Modify: `src/components/ui/button.tsx`

**Interfaces:**
- Consumes: `next-view-transitions`, `next/navigation`.
- Produces:
  - `<Segmented items: {value: string, label: string}[], value: string, hrefFor: (value: string) => string />`
  - `<SearchInput placeholder: string, defaultValue?: string, onChange?: ... />`
  - Variantes de botão `pill` e `chip`, e tamanho `pill`.

- [ ] **Step 1: Criar o Segmented**

```tsx
"use client";

// src/components/ui/segmented.tsx
import { Link } from "next-view-transitions";
import { cn } from "@/lib/utils";

/**
 * Abas em pill, navegadas por URL. Ser URL-driven é o que permite compartilhar
 * o link de uma aba e o que mantém a leitura de dados no servidor.
 */
export function Segmented({
  items,
  value,
  hrefFor,
  className,
}: {
  items: { value: string; label: string }[];
  value: string;
  hrefFor: (value: string) => string;
  className?: string;
}) {
  return (
    <nav className={cn("flex gap-0.5 rounded-full bg-muted p-0.5", className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Link
            key={item.value}
            href={hrefFor(item.value)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Criar o SearchInput**

```tsx
// src/components/ui/search-input.tsx
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("flex items-center gap-2 rounded-full bg-muted px-3 py-2", className)}>
      <Search className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" strokeWidth={1.5} />
      <input
        type="search"
        className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-subtle-foreground"
        {...props}
      />
    </label>
  );
}
```

- [ ] **Step 3: Acrescentar as variantes de botão**

Em `src/components/ui/button.tsx`, dentro de `variants.variant`, acrescentar:

```ts
        pill: "rounded-full bg-primary text-primary-foreground hover:bg-primary/90",
        chip: "rounded-full bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground",
```

E dentro de `variants.size`:

```ts
        pill: "h-9 rounded-full px-4 text-xs",
```

- [ ] **Step 4: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/segmented.tsx src/components/ui/search-input.tsx src/components/ui/button.tsx
git commit -m "feat(ui): Segmented, SearchInput e variantes pill do Button"
```

---

### Task 9: PanelHeader e DataTable

**Files:**
- Create: `src/components/ui/panel-header.tsx`
- Create: `src/components/ui/data-table.tsx`

**Interfaces:**
- Consumes: tokens da Task 1.
- Produces:
  - `<PanelHeader context?: ReactNode, tabs?: ReactNode, actions?: ReactNode />`
  - `<DataTable>`, `<DataTableHead>`, `<DataTableRow>`

- [ ] **Step 1: Criar o PanelHeader**

```tsx
// src/components/ui/panel-header.tsx
import { cn } from "@/lib/utils";

/**
 * Linha de topo do painel: contexto à esquerda, abas no meio, ações à direita.
 * Fica fora da área de scroll, então continua visível durante a leitura.
 * No celular quebra em duas linhas e rola na horizontal, sem virar menu.
 */
export function PanelHeader({
  context,
  tabs,
  actions,
  className,
}: {
  context?: React.ReactNode;
  tabs?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 px-4 py-3 md:flex-nowrap md:px-6",
        className
      )}
    >
      {context}
      {tabs ? <div className="min-w-0 overflow-x-auto">{tabs}</div> : null}
      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Chip de contexto do header (mês, data). */
export function PanelContext({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Criar o DataTable**

```tsx
// src/components/ui/data-table.tsx
import { cn } from "@/lib/utils";

/**
 * Casca de tabela do app: densidade de 54px, separação por hairline (não por
 * gap) e hover na linha inteira. Não sabe nada sobre o dado; as colunas são
 * montadas por quem usa.
 */
export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg bg-card", className)}>{children}</div>
  );
}

export function DataTableHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
      {children}
    </div>
  );
}

export function DataTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-[54px] items-center gap-3 border-t border-border px-3 text-sm transition-colors hover:bg-secondary first:border-t-0",
        className
      )}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/panel-header.tsx src/components/ui/data-table.tsx
git commit -m "feat(ui): PanelHeader e DataTable"
```

---

## Fase D: piloto em Finanças

### Task 10: Abas de Finanças

Finanças hoje é um scroll longo com sete seções empilhadas. As abas não inventam conteúdo: reorganizam o que já existe.

**Files:**
- Modify: `src/app/(app)/financas/page.tsx`

**Interfaces:**
- Consumes: `Segmented`, `PanelHeader`, `PanelContext`, `AppFrame`.
- Produces: `?aba=` na URL de `/financas`, com os valores `visao`, `transacoes`, `agendadas`, `cartoes`, `recorrentes`.

**Desvio consciente do spec.** O spec §6.1 lista as abas "Visão geral, Transações, Categorias, Contas", copiadas da referência. O Zênite não tem tela de Categorias (categorias são geridas por modal, via `CategoryManagerButton`) nem tela de Contas separada, e tem duas seções que a referência não tem (Agendadas e Recorrentes). As abas abaixo refletem as seções que existem de verdade. Criar telas novas de Categorias e Contas seria funcionalidade, não redesign, e fica para onda futura.

- [ ] **Step 1: Ler a página inteira antes de mexer**

`src/app/(app)/financas/page.tsx` tem a montagem dos dados no topo (linhas 1 a 78) e a árvore de seções depois. A montagem de dados não muda nesta task.

- [ ] **Step 2: Ler a aba da query string**

Na assinatura da página, junto dos `searchParams` já existentes, ler `aba` com `visao` como padrão:

```tsx
  const aba = typeof sp.aba === "string" ? sp.aba : "visao";
```

(usar o mesmo nome de variável dos `searchParams` já resolvidos no arquivo).

- [ ] **Step 3: Trocar o cabeçalho da página pelo PanelHeader**

Substituir o bloco `<Reveal className="flex flex-col gap-4 ...">` inteiro (o que tem o `<h1>`, o parágrafo e o `MonthNav`) por:

```tsx
      <PanelHeader
        context={<PanelContext>{monthLabel(year, month)}</PanelContext>}
        tabs={
          <Segmented
            value={aba}
            hrefFor={(v) => `/financas?aba=${v}${offset ? `&offset=${offset}` : ""}`}
            items={[
              { value: "visao", label: "Visão geral" },
              { value: "transacoes", label: "Transações" },
              { value: "cartoes", label: "Cartões" },
              { value: "agendadas", label: "Agendadas" },
              { value: "recorrentes", label: "Recorrentes" },
            ]}
          />
        }
        actions={<ImportButton banks={banks} cards={cards} categories={categories} />}
      />

      {/* o título só existe no celular: no desktop a sidebar e as abas já
          dizem onde você está */}
      <h1
        className="px-4 text-2xl font-bold tracking-tight md:hidden"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Finanças
      </h1>
```

O `MonthNav` passa a viver dentro do `PanelContext`: manter o componente e envolvê-lo, para não perder a navegação de mês.

- [ ] **Step 4: Condicionar cada seção à aba**

Envolver cada `<Reveal>` de seção na condição correspondente:

```tsx
      {aba === "visao" && (
        <>
          {/* AccountsSummary, CategorizationQueue, donut e transações recentes */}
        </>
      )}
      {aba === "cartoes" && <Reveal><CardManager cards={cards} banks={banks} /></Reveal>}
      {aba === "recorrentes" && <Reveal><SubscriptionsSection ... /></Reveal>}
      {aba === "agendadas" && <Reveal><PlanningSection ... /></Reveal>}
      {aba === "transacoes" && <Reveal><TransactionsSection ... /></Reveal>}
```

Manter as props de cada seção exatamente como estão hoje.

- [ ] **Step 5: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No preview: `/financas` abre em Visão geral, cada aba troca o conteúdo, a URL muda e o botão voltar do navegador funciona. O mês continua navegável.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/financas/page.tsx"
git commit -m "feat(financas): organiza a tela em abas navegadas por URL"
```

---

### Task 11: Contas e Cartões separados no rail

**Files:**
- Create: `src/components/finance/accounts-card.tsx`
- Create: `src/components/finance/cards-card.tsx`
- Modify: `src/app/(app)/financas/page.tsx`

**Interfaces:**
- Consumes: `BankWithBalance` e `CardWithInvoice` de `src/types/finance.ts`, `Meter`, `Money`, `BrandAvatar`.
- Produces: `<AccountsCard banks: BankWithBalance[] />` e `<CardsCard cards: CardWithInvoice[] />`.

- [ ] **Step 1: Criar o AccountsCard**

```tsx
// src/components/finance/accounts-card.tsx
import { BrandAvatar } from "@/components/ui/brand-avatar";
import { Money } from "@/components/ui/money";
import type { BankWithBalance } from "@/types/finance";

/**
 * Só contas de verdade. Cartão de crédito é outra entidade no modelo e tem
 * outra pergunta a responder (quanto devo, quanto sobra de limite), então
 * mora no próprio card.
 */
export function AccountsCard({ banks }: { banks: BankWithBalance[] }) {
  const total = banks.reduce((sum, b) => sum + Number(b.balance ?? 0), 0);

  return (
    <div className="rounded-lg bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Contas</h3>
        <Money value={total} className="text-xs text-muted-foreground" />
      </div>

      {banks.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma conta cadastrada.</p>
      ) : (
        banks.map((bank) => (
          <div
            key={bank.id}
            className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0"
          >
            <BrandAvatar name={bank.name} size={28} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{bank.name}</span>
              <span className="block text-[11px] text-subtle-foreground">Conta bancária</span>
            </span>
            <Money value={Number(bank.balance ?? 0)} className="text-sm font-medium" />
          </div>
        ))
      )}
    </div>
  );
}
```

Conferir o nome exato do campo de saldo em `BankWithBalance` antes de escrever: se não for `balance`, usar o que existir.

- [ ] **Step 2: Criar o CardsCard**

```tsx
// src/components/finance/cards-card.tsx
import { BrandAvatar } from "@/components/ui/brand-avatar";
import { Meter } from "@/components/ui/meter";
import { Money } from "@/components/ui/money";
import { formatBRL } from "@/lib/money";
import type { CardWithInvoice } from "@/types/finance";

export function CardsCard({ cards }: { cards: CardWithInvoice[] }) {
  return (
    <div className="rounded-lg bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Cartões</h3>
        <span className="text-[11px] text-subtle-foreground">Fatura do mês</span>
      </div>

      {cards.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum cartão cadastrado.</p>
      ) : (
        cards.map((card) => {
          const pct = card.credit_limit > 0 ? (card.utilizado_total / card.credit_limit) * 100 : 0;
          return (
            <div key={card.id} className="border-t border-border py-3 first:border-t-0 first:pt-0">
              <div className="flex items-center gap-3">
                <BrandAvatar name={card.name} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{card.name}</span>
                  <span className="block text-[11px] text-subtle-foreground">
                    {card.closing_day && card.due_day
                      ? `Fecha dia ${card.closing_day}, vence dia ${card.due_day}`
                      : "Sem datas definidas"}
                  </span>
                </span>
                <Money value={card.fatura_mes} className="text-sm font-semibold" />
              </div>
              {card.credit_limit > 0 && (
                <Meter
                  className="mt-2"
                  value={card.utilizado_total}
                  max={card.credit_limit}
                  leftLabel={`${pct.toFixed(0)}% do limite`}
                  rightLabel={`${formatBRL(card.disponivel)} disponível`}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
```

- [ ] **Step 3: Montar os dois na aba Visão geral**

Em `financas/page.tsx`, dentro do bloco `aba === "visao"`, colocar `<AccountsCard banks={banks} />` e `<CardsCard cards={cards} />` na coluna direita do grid. O `AccountsSummary` atual continua existindo por enquanto e será removido na Task 14, depois que o rail estiver validado.

- [ ] **Step 4: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No preview, aba Visão geral: dois cards distintos, cartão de crédito fora da lista de contas, barra de limite aparecendo só em cartão com limite definido, e a barra travando em 100% se o utilizado passar do limite.

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/accounts-card.tsx src/components/finance/cards-card.tsx "src/app/(app)/financas/page.tsx"
git commit -m "feat(financas): separa contas de cartoes no rail"
```

---

### Task 12: Legenda do donut com Meter

**Files:**
- Modify: `src/lib/finance/category-chart.ts`
- Create: `src/components/finance/category-legend.tsx`
- Modify: `src/app/(app)/financas/page.tsx`

**Interfaces:**
- Consumes: `CategorySlice`, `Meter`, `Money`, `CategoryChip`.
- Produces: `CategorySlice` ganha `limit: number | null`; `<CategoryLegend slices: CategorySlice[] />`.

- [ ] **Step 1: Acrescentar o limite ao CategorySlice**

Em `src/lib/finance/category-chart.ts`, no tipo `CategorySlice`, acrescentar:

```ts
  /** limite mensal da categoria, quando definido (Onda 18, fase final) */
  limit: number | null;
```

E em `buildCategorySlices`, a assinatura passa a aceitar o limite junto do ícone e do total:

```ts
export function buildCategorySlices(
  entries: [string, { icon: string; total: number; limit: number | null }][],
  expenseTotal: number
): { slices: CategorySlice[]; othersCount: number } {
```

No `head`, repassar `limit`. Na fatia "Outras", `limit: null`, porque somar limites de categorias diferentes não significa nada.

- [ ] **Step 2: Passar `limit: null` na origem, por enquanto**

Em `financas/page.tsx`, no laço que monta `byCat`, incluir `limit: null` no objeto. A Task 15 troca isso pelo valor real. Enquanto isso, a legenda mostra "Sem limite definido" para todas.

- [ ] **Step 3: Criar a CategoryLegend**

```tsx
// src/components/finance/category-legend.tsx
import { CategoryChip } from "@/components/ui/category-chip";
import { Meter } from "@/components/ui/meter";
import { Money } from "@/components/ui/money";
import { formatBRL } from "@/lib/money";
import type { CategorySlice } from "@/lib/finance/category-chart";

/**
 * Legenda do donut. Cada linha responde duas perguntas em contextos
 * separados: a fatia diz participação no gasto, a barra diz consumo do
 * limite. Assim a categoria aparece uma vez só, sem dois percentuais
 * concorrentes lado a lado.
 */
export function CategoryLegend({ slices }: { slices: CategorySlice[] }) {
  return (
    <div className="mt-4">
      {slices.map((slice) => {
        const over = slice.limit !== null && slice.limit > 0 && slice.total > slice.limit;
        const pct = slice.limit && slice.limit > 0 ? (slice.total / slice.limit) * 100 : 0;

        return (
          <div key={slice.name} className="border-t border-border py-3 first:border-t-0 first:pt-0">
            <div className="flex items-center gap-2">
              <CategoryChip
                name={slice.name}
                color={slice.color}
                icon={slice.icon}
                className="min-w-0 flex-1 text-sm font-medium"
              />
              <Money value={slice.total} className="text-xs text-muted-foreground" />
            </div>

            {slice.limit !== null && slice.limit > 0 ? (
              <Meter
                className="mt-2"
                value={slice.total}
                max={slice.limit}
                leftLabel={`${pct.toFixed(0)}% do limite`}
                rightLabel={
                  over ? "R$ 0,00 restante" : `${formatBRL(slice.limit - slice.total)} restante`
                }
              />
            ) : (
              <p className="mt-1.5 text-[11px] text-subtle-foreground">Sem limite definido</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Trocar a legenda manual pela CategoryLegend**

Em `financas/page.tsx`, apagar o bloco `<div className="mt-4 space-y-4">{expenseByCat.map(...)}</div>` inteiro (a legenda escrita à mão, com a barra de participação) e colocar no lugar:

```tsx
              <CategoryLegend slices={donut.slices} />
```

Trocar também o `className` do card que envolve o donut, de `"glass card-glow rounded-2xl border border-border p-5"` para `"rounded-lg bg-card p-4"`.

- [ ] **Step 5: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No preview: o donut continua igual, a legenda mostra nome, valor e "Sem limite definido" em todas as categorias, e nenhuma categoria aparece duas vezes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/finance/category-chart.ts src/components/finance/category-legend.tsx "src/app/(app)/financas/page.tsx"
git commit -m "feat(financas): legenda do donut preparada para orcamento"
```

---

### Task 13: Gráfico de saídas por mês

Não existe série mensal no projeto hoje: o único gráfico é o donut. Esta task cria a consulta e o componente.

**Files:**
- Modify: `src/lib/data/finance.ts`
- Create: `src/components/finance/monthly-expense-chart.tsx`
- Modify: `src/app/(app)/financas/page.tsx`

**Interfaces:**
- Consumes: cliente Supabase de servidor, `src/lib/dates.ts`.
- Produces: `getMonthlyExpenseSeries(year: number, month: number, months?: number): Promise<{ label: string; total: number; current: boolean }[]>` e `<MonthlyExpenseChart data />`.

- [ ] **Step 1: Criar a consulta da série**

Em `src/lib/data/finance.ts`, seguindo o padrão das funções já existentes no arquivo (mesma forma de obter o cliente e de tratar erro):

```ts
/**
 * Saídas somadas por mês, terminando três meses depois do mês visto, para o
 * gráfico dar contexto de passado e de compromissos já lançados à frente.
 * Exclui transferência e pagamento de fatura, que não são despesa nova, pela
 * mesma regra do donut.
 */
export async function getMonthlyExpenseSeries(
  year: number,
  month: number,
  months = 9
): Promise<{ label: string; total: number; current: boolean }[]> {
  const supabase = await createClient();

  const start = new Date(year, month - 1 - (months - 4), 1);
  const end = new Date(year, month - 1 + 4, 0);

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, date, type, is_transfer, is_card_payment")
    .gte("date", toISODate(start))
    .lte("date", toISODate(end));

  if (error || !data) return [];

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    buckets.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
  }

  for (const t of data) {
    if (t.type !== "expense" || t.is_transfer || t.is_card_payment) continue;
    const d = new Date(`${t.date}T00:00:00`);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + Number(t.amount));
  }

  return [...buckets.entries()].map(([key, total]) => {
    const [y, m] = key.split("-").map(Number);
    return {
      label: new Date(y, m, 1).toLocaleDateString("pt-BR", { month: "short" }),
      total,
      current: y === year && m === month - 1,
    };
  });
}
```

Usar o helper de data que já existe em `src/lib/dates.ts` no lugar de `toISODate` se o nome for outro, e o mesmo nome de coluna de data que as outras consultas do arquivo usam.

- [ ] **Step 2: Criar o gráfico**

Sem recharts: são nove barras, e o recharts já é a maior dependência de UI do app.

```tsx
// src/components/finance/monthly-expense-chart.tsx
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Saídas por mês, sem eixo e sem grade. O mês atual não muda de cor: ganha um
 * bloco de fundo atrás da coluna. Cor aqui significaria categoria, e não é
 * disso que o gráfico fala.
 */
export function MonthlyExpenseChart({
  data,
}: {
  data: { label: string; total: number; current: boolean }[];
}) {
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="rounded-lg bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">Saídas por mês</h3>
      <div className="flex items-end gap-1.5 overflow-x-auto">
        {data.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex min-w-[46px] flex-1 flex-col items-center rounded-lg px-1 pb-1.5",
              item.current && "bg-foreground/[0.055]"
            )}
          >
            <div className="flex h-[104px] w-full items-end justify-center">
              <div
                className={cn(
                  "bar-grow w-full max-w-[26px] rounded-t-md",
                  item.current ? "bg-muted-foreground" : "bg-secondary"
                )}
                style={{ height: `${Math.max((item.total / max) * 100, 2)}%` }}
              />
            </div>
            <span
              className={cn(
                "mt-1.5 text-[10px] capitalize",
                item.current ? "text-foreground" : "text-subtle-foreground"
              )}
            >
              {item.label}
            </span>
            <span
              className={cn(
                "num text-[10px]",
                item.current ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {formatBRL(item.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

`bar-grow` cresce na horizontal (`scaleX`), então aqui ele serve só como entrada suave. Se ficar estranho na vertical, remover a classe: o gráfico não depende dela.

- [ ] **Step 3: Montar na aba Visão geral**

Acrescentar `getMonthlyExpenseSeries(year, month).catch(() => [])` ao `Promise.all` da página e renderizar `<MonthlyExpenseChart data={serieMensal} />` no topo da coluna principal da aba Visão geral.

- [ ] **Step 4: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No preview: nove colunas, mês atual com bloco de fundo mais claro e rótulo em branco, valores batendo com o total de despesas do mês corrente mostrado no donut.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/finance.ts src/components/finance/monthly-expense-chart.tsx "src/app/(app)/financas/page.tsx"
git commit -m "feat(financas): grafico de saidas por mes sem eixos"
```

---

### Task 14: Transações com DataTable

**Files:**
- Modify: `src/components/finance/transactions-section.tsx`
- Modify: `src/app/(app)/financas/page.tsx`

**Interfaces:**
- Consumes: `DataTable`, `DataTableRow`, `BrandAvatar`, `CategoryChip`, `Money`.
- Produces: nada novo.

- [ ] **Step 1: Ler a seção de transações antes de mexer**

`src/components/finance/transactions-section.tsx` já tem filtro, busca e ações por linha. Esta task troca a apresentação da linha, não a lógica.

- [ ] **Step 2: Trocar a linha pela do sistema novo**

Envolver a lista em `<DataTable>` e cada item em `<DataTableRow>`. A lógica de filtro, busca e ações não muda: só a apresentação. Esta é a forma alvo da linha, para ser adaptada aos nomes de variável que já existem no arquivo:

```tsx
<DataTable>
  {transacoesFiltradas.map((t) => (
    <DataTableRow key={t.id}>
      {t.is_transfer ? (
        <Repeat className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      ) : t.type === "expense" ? (
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-negative" strokeWidth={1.5} />
      ) : (
        <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 text-positive" strokeWidth={1.5} />
      )}

      <BrandAvatar name={t.description} size={28} />

      <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.description}</span>

      <span className="hidden w-32 shrink-0 sm:block">
        {t.category_id ? (
          <CategoryChip
            name={categoryName(t.category_id)}
            color={categoryColorFor(t.category_id)}
            icon={categoryIcon(t.category_id)}
          />
        ) : (
          <span className="text-xs text-subtle-foreground">Sem categoria</span>
        )}
      </span>

      <span className="hidden w-16 shrink-0 text-xs text-subtle-foreground md:block">
        {shortDate(t.date)}
      </span>

      <Money
        value={t.type === "expense" ? -Number(t.amount) : Number(t.amount)}
        signed
        colorize
        className="w-28 shrink-0 text-right text-sm font-medium"
      />

      {/* menu de ações da linha, exatamente como já está hoje */}
    </DataTableRow>
  ))}
</DataTable>
```

Os helpers `categoryName`, `categoryColorFor`, `categoryIcon` e `shortDate` já têm equivalente no arquivo ou nas libs (`categoryColor` de `lib/finance/category-chart.ts`, formatação de data em `lib/dates.ts`): reusar, não recriar.

- [ ] **Step 2b: Trocar o campo de busca pelo SearchInput**

O campo de busca que já existe na seção passa a usar `<SearchInput placeholder="Buscar transação" />`, mantendo o mesmo estado e o mesmo filtro. É o que evita o componente da Task 8 nascer sem uso.

- [ ] **Step 3: Remover o AccountsSummary da Visão geral**

Agora que `AccountsCard` e `CardsCard` estão validados, tirar `<AccountsSummary ... />` da aba Visão geral e o import correspondente. O arquivo `accounts-summary.tsx` continua no projeto: ele tem a criação e a exclusão de conta, que migram para a aba Cartões e Contas numa onda futura.

Se a remoção deixar a criação de conta sem porta de entrada, manter o `AccountsSummary` na aba `cartoes` em vez de apagar da tela.

- [ ] **Step 4: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No preview, aba Transações: linhas de 54px, avatar de marca, chip de categoria sem fundo, valores alinhados em coluna com numeral tabular, entrada em verde e saída em coral. Filtro e busca continuam funcionando. Criar conta continua acessível em algum lugar.

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/transactions-section.tsx "src/app/(app)/financas/page.tsx"
git commit -m "feat(financas): tabela de transacoes no sistema novo"
```

---

## Fase E: orçamento por categoria

### Task 15: Limite mensal por categoria

Fase isolada e descartável. Se for abortada, o redesign continua íntegro e a legenda apenas mostra "Sem limite definido".

**Files:**
- Modify: `src/types/finance.ts`
- Modify: `src/components/finance/category-manager.tsx`
- Modify: a Server Action de salvar categoria (em `src/lib/actions/`, achar com `rg "categor" src/lib/actions`)
- Modify: `src/app/(app)/financas/page.tsx`
- Create: `docs/migrations/2026-08-03-monthly-limit.sql`

**Interfaces:**
- Consumes: `CategorySlice.limit` da Task 12.
- Produces: coluna `categories.monthly_limit`.

- [ ] **Step 1: Escrever a migração**

Antes de escrever, conferir o tipo exato de `credit_cards.credit_limit` no Supabase e usar o mesmo, para dinheiro não ter duas escalas no schema.

```sql
-- docs/migrations/2026-08-03-monthly-limit.sql
-- Onda 18: limite mensal por categoria (orçamento).
-- Nulo significa "sem limite", que é o padrão e o comportamento de hoje.
alter table public.categories
  add column if not exists monthly_limit numeric(14,2);
```

A tabela `categories` já tem RLS `own_rows`, e a coluna nova é coberta pela política existente. Nenhuma política nova é necessária.

- [ ] **Step 2: Entregar a migração para o dono rodar**

A CLI do Supabase está bloqueada nesta máquina. Avisar o dono do projeto para colar o SQL no Supabase, SQL Editor, e confirmar antes de seguir. **Não prosseguir sem a confirmação**, porque os steps seguintes leem a coluna.

- [ ] **Step 3: Acrescentar o campo ao tipo**

Em `src/types/finance.ts`, na interface `Category`:

```ts
  /** limite mensal de gasto; null significa sem limite */
  monthly_limit: number | null;
```

- [ ] **Step 4: Acrescentar o campo ao formulário**

Em `src/components/finance/category-manager.tsx`, acrescentar o campo ao lado dos que já existem, usando o `MoneyInput` de `src/components/finance/money-input.tsx`. Só faz sentido em categoria de despesa:

```tsx
{kind === "expense" && (
  <div>
    <label htmlFor="monthly_limit" className="text-xs text-muted-foreground">
      Limite mensal
    </label>
    <MoneyInput
      id="monthly_limit"
      name="monthly_limit"
      defaultValue={category?.monthly_limit ?? undefined}
    />
    <p className="mt-1 text-[11px] text-subtle-foreground">
      Deixe vazio para não ter limite.
    </p>
  </div>
)}
```

Conferir o nome real da prop de valor inicial do `MoneyInput` antes de escrever, e usar o mesmo padrão de `label` e `name` dos outros campos do formulário.

- [ ] **Step 5: Aceitar o campo na Server Action**

Na action de salvar categoria, ler e converter o campo antes do upsert:

```ts
  const limitRaw = String(formData.get("monthly_limit") ?? "").trim();
  const monthlyLimit = limitRaw ? parseBRL(limitRaw) : null;
  if (monthlyLimit !== null && (!Number.isFinite(monthlyLimit) || monthlyLimit < 0)) {
    return { error: "Limite mensal inválido." };
  }
```

E incluir `monthly_limit: monthlyLimit` no objeto do upsert. Importar `parseBRL` de `@/lib/money`. Devolver o erro no mesmo formato que as outras actions do arquivo já usam.

- [ ] **Step 6: Ligar o limite na origem dos dados**

Em `financas/page.tsx`, no laço que monta `byCat`, trocar o `limit: null` da Task 12 pelo valor real:

```ts
    byCat.set(key, {
      icon,
      total: (prev?.total ?? 0) + Number(t.amount),
      limit: cat?.monthly_limit ?? null,
    });
```

- [ ] **Step 7: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No preview: definir limite de R$ 500,00 numa categoria, gastar acima disso e conferir que a barra trava em 100%, fica coral e o texto mostra o percentual real e "R$ 0,00 restante". Categoria sem limite continua com "Sem limite definido". Conferir também no card de cartão que a mesma barra continua correta.

- [ ] **Step 8: Commit**

```bash
git add -A src docs/migrations
git commit -m "feat(financas): limite mensal por categoria"
```

---

## Fase F: fechamento

### Task 16: Varredura final e HANDOFF

**Files:**
- Modify: `HANDOFF.md`
- Modify: o que a varredura apontar.

- [ ] **Step 1: Varredura de travessão**

Rodar: `rg "—|–" src`
Esperado: nenhuma ocorrência em string visível ao usuário. Corrigir o que aparecer, trocando por vírgula, ponto, dois-pontos ou parênteses.

- [ ] **Step 2: Varredura de sobra dos tokens antigos**

Rodar: `rg "font-num|Plus_Jakarta|text-gradient" "src/app/(app)" src/components`
Esperado: nenhuma ocorrência dentro do app. As telas de auth podem manter `text-gradient`.

- [ ] **Step 3: Build limpo**

Rodar: `npm run build`
Esperado: build sem erro e sem aviso novo.

- [ ] **Step 4: Conferência final**

Percorrer todas as rotas nos dois temas, em desktop e celular. No app instalado (Capacitor), conferir especificamente safe-area, teclado e overscroll: o shell do mobile não mudou, então nada ali pode ter regredido.

- [ ] **Step 5: Registrar a onda no HANDOFF**

Atualizar a data do topo e a seção de estado atual, e acrescentar a Onda 18 com: o que mudou e por quê, arquivos e áreas afetadas, a migração `monthly_limit` (e se já foi rodada), o que ficou fora de escopo (barra de comando, migração visual das outras telas, app-frame no mobile) e o commit.

- [ ] **Step 6: Commit**

```bash
git add HANDOFF.md src
git commit -m "docs: registra a Onda 18 (redesign visual clean) no HANDOFF"
```

---

## Ordem e pontos de parada

As fases A e B mudam todas as telas de uma vez e são o maior risco da onda: pare e confira depois da Task 2 antes de seguir. A fase C não é visível em tela e pode correr direto. A fase D é o piloto. A fase E depende de uma migração rodada à mão e pode ser cortada sem prejuízo do resto.
