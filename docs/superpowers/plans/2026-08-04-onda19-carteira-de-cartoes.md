# Onda 19: carteira de cartões, plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a aba Cartões de Finanças numa carteira com leque, grade e cartão aberto, com arte composta a partir do emissor, ciclo de fatura real e detalhe completo por cartão, conforme `docs/superpowers/specs/2026-08-04-onda19-carteira-de-cartoes-design.md`.

**Architecture:** Três blocos independentes que se encontram na tela. Primeiro os dados (colunas de identidade do cartão e biblioteca de emissores completa), depois a regra de negócio nova (ciclo de fatura em funções puras, ligada ao cálculo existente), e por fim a interface (arte do cartão, carteira de três estados e detalhe). Cada bloco é verificável sozinho.

**Tech Stack:** Next.js App Router (Server Components leem, Server Actions mutam), Tailwind v4, `motion` ^12.42.2 (já instalado, importado como `motion/react`), `lucide-react`, Supabase com RLS `own_rows`, zod para validação.

## Global Constraints

- **Não existe framework de testes neste projeto.** O ciclo de verificação de cada task é `npm run build` seguido de conferência manual. Onde este plano diz "verificar", é isso. Não instale framework de teste.
- **Nunca usar `—` (em dash) nem `–` (en dash) em texto visível ao usuário.** Usar vírgula, ponto, dois-pontos, parênteses ou "e".
- **Nenhuma dependência nova.** `motion` e `lucide-react` já estão no projeto. Não instale `@hugeicons`, `framer-motion` nem biblioteca de ícones adicional.
- Dinheiro sempre por `src/lib/money.ts` (decimal em reais, não centavos); datas sempre por `src/lib/dates.ts`.
- Server Components leem dados; Server Actions mutam. Nunca buscar dado em client component.
- A CLI do Supabase está bloqueada nesta máquina: migração é SQL colado à mão no SQL Editor pelo dono do projeto.
- **Número completo de cartão, CVV e validade não entram no schema nem no formulário.** Só os quatro últimos dígitos.
- `--chart-1` a `--chart-5` não mudam: é a paleta categórica validada para daltonismo.
- Um commit por task, com a task verificada antes.

---

## Estrutura de arquivos

**Criados**

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20260701000019_card_identity.sql` | Colunas de identidade do cartão |
| `src/lib/finance/banks-extra.ts` | Emissores fora do pacote, escrito à mão |
| `src/lib/finance/issuers.ts` | União das duas listas e resolução do asset |
| `src/lib/finance/billing-cycle.ts` | Janela do ciclo e melhor dia de compra, funções puras |
| `src/hooks/use-outside-click.ts` | Fecha a carteira ao clicar fora |
| `src/components/finance/card-art.tsx` | Arte do cartão |
| `src/components/finance/card-wallet.tsx` | Os três estados da carteira |
| `src/components/finance/card-detail.tsx` | Casca do detalhe do cartão aberto |
| `src/components/finance/card-invoice-rows.tsx` | Movimentações da fatura com categoria editável |
| `src/components/finance/card-installments.tsx` | Parcelamentos em aberto com título editável |
| `src/components/finance/card-forecast.tsx` | Projeção das próximas faturas |

**Modificados**

`scripts/gen-banks.mjs`, `src/lib/finance/banks.ts` (regenerado), `src/types/finance.ts`, `src/lib/validation/finance.ts`, `src/lib/actions/finance.ts`, `src/lib/data/finance.ts`, `src/components/finance/card-manager.tsx`, `src/app/(app)/financas/page.tsx`, `src/components/finance/accounts-card.tsx`, `HANDOFF.md`.

---

## Fase A: dados e biblioteca

### Task 1: Identidade do cartão

**Files:**
- Create: `supabase/migrations/20260701000019_card_identity.sql`
- Modify: `src/types/finance.ts`
- Modify: `src/lib/validation/finance.ts`
- Modify: `src/lib/actions/finance.ts`
- Modify: `src/components/finance/card-manager.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `CreditCard` ganha `network: string | null`, `holder: string | null`, `last4: string | null`, `tier: string | null`. Todas as tasks de arte dependem desses nomes.

- [ ] **Step 1: Escrever a migração**

```sql
-- supabase/migrations/20260701000019_card_identity.sql
-- ─── IDENTIDADE DO CARTÃO (Onda 19) ────────────────────────
-- Campos que permitem desenhar o cartão parecido com o real.
-- Todos opcionais: cartão existente continua válido sem nenhum deles.
-- NUNCA guardamos número completo, CVV ou validade.

alter table public.credit_cards
  add column if not exists network text
    check (network is null or network in
      ('visa', 'mastercard', 'elo', 'amex', 'hipercard')),
  add column if not exists holder text,
  add column if not exists last4 text
    check (last4 is null or last4 ~ '^[0-9]{4}$'),
  add column if not exists tier text
    check (tier is null or tier in
      ('standard', 'gold', 'platinum', 'black'));

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Entregar a migração para o dono rodar**

A CLI do Supabase está bloqueada nesta máquina. Peça ao dono para colar o SQL no Supabase, SQL Editor, e **aguarde a confirmação antes do Step 3**, porque os steps seguintes leem e escrevem essas colunas.

- [ ] **Step 3: Acrescentar os campos ao tipo**

Em `src/types/finance.ts`, na interface `CreditCard`, depois de `color`:

```ts
  /** bandeira: visa, mastercard, elo, amex, hipercard */
  network: string | null;
  /** nome impresso no cartão */
  holder: string | null;
  /** quatro últimos dígitos; nunca o número completo */
  last4: string | null;
  /** variante: standard, gold, platinum, black. Define o tom da arte */
  tier: string | null;
```

- [ ] **Step 4: Estender a validação**

Em `src/lib/validation/finance.ts`, no schema `cardInput`, acrescentar:

```ts
  network: z.enum(["visa", "mastercard", "elo", "amex", "hipercard"]).nullable().optional(),
  holder: z.string().trim().max(60).nullable().optional(),
  last4: z.string().regex(/^[0-9]{4}$/, "Informe os quatro últimos dígitos").nullable().optional(),
  tier: z.enum(["standard", "gold", "platinum", "black"]).nullable().optional(),
```

Leia o arquivo antes: siga o estilo dos campos que já existem ali, inclusive o uso de `.partial()` para o caminho de atualização.

- [ ] **Step 5: Aceitar os campos na Server Action**

Em `src/lib/actions/finance.ts`, nas actions de criar e atualizar cartão, incluir os quatro campos no objeto enviado ao Supabase. Não invente formato de erro: siga o padrão zod mais throw/catch que o arquivo já usa.

- [ ] **Step 6: Acrescentar os campos ao formulário**

Em `src/components/finance/card-manager.tsx`, acrescentar quatro controles ao formulário existente, seguindo o padrão visual dos campos que já estão lá:

- **Bandeira:** `SelectMenu` com as opções `visa`, `mastercard`, `elo`, `amex`, `hipercard`, rotuladas "Visa", "Mastercard", "Elo", "Amex" e "Hipercard".
- **Titular:** input de texto, rótulo "Titular", placeholder "Nome impresso no cartão".
- **Quatro últimos dígitos:** input de texto com `inputMode="numeric"` e `maxLength={4}`, rótulo "Quatro últimos dígitos".
- **Variante:** `SelectMenu` com `standard`, `gold`, `platinum`, `black`, rotuladas "Padrão", "Gold", "Platinum" e "Black".

A API do `SelectMenu` em `src/components/ui/select-menu.tsx` é `{ value, options, onChange, placeholder?, disabled?, className?, footer?, onEditOption? }`, com `options: SelectOption[]`. Ele é controlado: guarde cada valor no estado do formulário, como os outros campos fazem.

- [ ] **Step 7: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No app: criar um cartão preenchendo os quatro campos novos, salvar, reabrir para editar e conferir que os valores voltaram. Deixar um cartão sem nenhum deles e confirmar que salva igual.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260701000019_card_identity.sql src/types/finance.ts src/lib/validation/finance.ts src/lib/actions/finance.ts src/components/finance/card-manager.tsx
git commit -m "feat(cartoes): identidade do cartao (bandeira, titular, digitos, variante)"
```

---

### Task 2: Biblioteca de emissores completa

**Files:**
- Modify: `scripts/gen-banks.mjs`
- Modify: `src/lib/finance/banks.ts` (regenerado, nunca à mão)
- Create: `src/lib/finance/banks-extra.ts`
- Create: `src/lib/finance/issuers.ts`

**Interfaces:**
- Consumes: `BANKS` e o tipo `Bank` de `src/lib/finance/banks.ts`.
- Produces: `ISSUERS: Issuer[]`, `issuerBySlug(slug): Issuer | null`, `issuerAsset(issuer): string`.

- [ ] **Step 1: Estender a lista do gerador**

`scripts/gen-banks.mjs` tem uma lista `BANCOS` com 28 entradas, enquanto o pacote `@edusites/bancos-brasil` oferece 41. Acrescentar os 13 que faltam, com o nome de exibição correto:

```
cora         -> Cora
infinitepay  -> InfinitePay
wise         -> Wise
paypal       -> PayPal
stripe       -> Stripe
revolut      -> Revolut
efibank      -> Efí
ton          -> Ton
iugu         -> Iugu
asaas        -> Asaas
ngcash       -> NG Cash
avenue       -> Avenue
nomad        -> Nomad
```

O gerador também precisa de uma cor por slug no mapa `CORES`. Para cada slug novo, use a cor de marca do próprio pacote se ele expuser; se não expuser, defina a cor a partir do SVG do pacote (o tom dominante do símbolo). Registre no relatório qual cor você usou para cada um.

- [ ] **Step 2: Regerar**

Rodar: `node scripts/gen-banks.mjs`
Esperado: 41 arquivos em `public/banks/` e `src/lib/finance/banks.ts` com 41 entradas. O script imprime os slugs que não encontrou; a lista deve sair vazia.

- [ ] **Step 3: Criar a lista de emissores extras**

```ts
// src/lib/finance/banks-extra.ts
import type { Bank } from "./banks";

/**
 * Emissores que o pacote @edusites/bancos-brasil não cobre.
 *
 * Este arquivo é escrito à MÃO, ao contrário de banks.ts, que é gerado e
 * seria sobrescrito. O asset de cada um vive em public/banks/<slug>.<ext>
 * e é fornecido pelo dono, a partir do material de marca do emissor.
 */
export type ExtraBank = Bank & { ext: "svg" | "png" };

export const BANKS_EXTRA: ExtraBank[] = [
  { slug: "renner", nome: "Renner", cor: "#E30613", ext: "png" },
];
```

- [ ] **Step 4: Criar o resolvedor**

```ts
// src/lib/finance/issuers.ts
import { BANKS, type Bank } from "./banks";
import { BANKS_EXTRA, type ExtraBank } from "./banks-extra";

export type Issuer = Bank | ExtraBank;

/**
 * Lista única de emissores: a gerada tem precedência sobre a manual, para o
 * pacote continuar sendo a fonte preferencial quando um slug existir nos dois.
 */
export const ISSUERS: Issuer[] = [
  ...BANKS,
  ...BANKS_EXTRA.filter((e) => !BANKS.some((b) => b.slug === e.slug)),
];

const PORSLUG = new Map(ISSUERS.map((i) => [i.slug, i]));

export function issuerBySlug(slug: string | null | undefined): Issuer | null {
  if (!slug) return null;
  return PORSLUG.get(slug) ?? null;
}

/**
 * Caminho do selo. A extensão é declarada na lista, não descoberta em runtime:
 * o navegador não consulta o sistema de arquivos, e errar a extensão daria
 * imagem quebrada em vez de fallback.
 */
export function issuerAsset(issuer: Issuer): string {
  const ext = "ext" in issuer ? issuer.ext : "svg";
  return `/banks/${issuer.slug}.${ext}`;
}
```

- [ ] **Step 5: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

Rodar: `ls public/banks | wc -l`
Esperado: 41.

**O arquivo `public/banks/renner.png` provavelmente ainda não existe**, porque depende do dono. Isso é esperado e não trava a task: o componente de arte da Task 5 trata asset ausente. Registre no relatório se o arquivo estava presente ou não.

- [ ] **Step 6: Commit**

```bash
git add scripts/gen-banks.mjs src/lib/finance/banks.ts src/lib/finance/banks-extra.ts src/lib/finance/issuers.ts public/banks
git commit -m "feat(financas): biblioteca de emissores completa e lista de extras"
```

---

## Fase B: ciclo de fatura

### Task 3: Funções puras do ciclo

**Files:**
- Create: `src/lib/finance/billing-cycle.ts`

**Interfaces:**
- Consumes: nada. Sem acesso a banco, sem import de Supabase.
- Produces: `cycleWindow(closingDay, dueDay, year, month): CycleWindow | null` e `bestPurchaseDay(closingDay): number`.

- [ ] **Step 1: Criar a lib**

```ts
// src/lib/finance/billing-cycle.ts
/**
 * Ciclo de fatura do cartão.
 *
 * Até a Onda 19, closing_day e due_day eram guardados mas nenhum cálculo os
 * usava: eram texto na tela. Estas funções são puras e sem acesso a banco, o
 * que permite conferir os casos reais no olho.
 */

export type CycleWindow = { start: string; end: string };

/** Último dia do mês (mês 1-based), para travar dia maior que o mês comporta. */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Soma dias a uma data ISO, montando a data por componentes para não pegar fuso. */
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return iso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

/**
 * Janela de compras da fatura que VENCE em (year, month).
 *
 * A fatura fecha no dia `closingDay` do próprio mês do vencimento quando o
 * fechamento vem antes do vencimento; quando vem depois, fecha no mês anterior.
 * A janela vai do dia seguinte ao fechamento anterior até o fechamento atual,
 * inclusive nas duas pontas.
 *
 * Devolve null quando o cartão não tem os dois dias definidos: nesse caso quem
 * chama cai no mês-calendário, que é o comportamento anterior à Onda 19.
 */
export function cycleWindow(
  closingDay: number | null,
  dueDay: number | null,
  year: number,
  month: number
): CycleWindow | null {
  if (!closingDay || !dueDay) return null;

  // mês em que esta fatura fecha
  let cy = year;
  let cm = month;
  if (closingDay >= dueDay) {
    cm -= 1;
    if (cm === 0) {
      cm = 12;
      cy -= 1;
    }
  }

  const end = iso(cy, cm, Math.min(closingDay, lastDayOfMonth(cy, cm)));

  // fechamento do ciclo anterior
  let py = cy;
  let pm = cm - 1;
  if (pm === 0) {
    pm = 12;
    py -= 1;
  }
  const prevEnd = iso(py, pm, Math.min(closingDay, lastDayOfMonth(py, pm)));

  return { start: addDays(prevEnd, 1), end };
}

/**
 * Melhor dia de compra: o dia seguinte ao fechamento, que é quando a compra
 * cai na fatura mais distante e ganha o prazo máximo. É orientação geral, não
 * data de um mês específico.
 */
export function bestPurchaseDay(closingDay: number): number {
  return closingDay >= 31 ? 1 : closingDay + 1;
}
```

- [ ] **Step 2: Conferir os casos reais**

Este projeto não tem framework de testes nem runner de TypeScript, então a conferência é por execução direta em JavaScript. Crie um arquivo temporário `verifica-ciclo.mjs` na raiz, cole nele as quatro funções (`lastDayOfMonth`, `iso`, `addDays`, `cycleWindow`) sem as anotações de tipo, e acrescente:

```js
const casos = [
  ["Inter",        5, 12, 2026, 8, "2026-07-06", "2026-08-05"],
  ["Bradesco",    29,  8, 2026, 8, "2026-06-30", "2026-07-29"],
  ["Mercado Pago", 2,  7, 2026, 8, "2026-07-03", "2026-08-02"],
  ["Renner",      26, 10, 2026, 8, "2026-06-27", "2026-07-26"],
  ["mes curto",   31, 10, 2026, 3, "2026-01-32", "2026-02-28"],
  ["virada ano",   5, 12, 2026, 1, "2025-12-06", "2026-01-05"],
];
for (const [nome, c, d, y, m, s, e] of casos) {
  const r = cycleWindow(c, d, y, m);
  const ok = r.end === e && (s.endsWith("32") || r.start === s);
  console.log(ok ? "OK " : "FALHOU ", nome, JSON.stringify(r), "esperado end", e);
}
console.log("sem ciclo:", cycleWindow(null, 12, 2026, 8));
```

Rodar: `node verifica-ciclo.mjs`
Esperado: todas as linhas com "OK", e a última imprimindo `null`. O caso "mes curto" só verifica o `end`, porque o início dele depende de janeiro ter 31 dias e não acrescenta informação.

| Cartão | closing | due | Janela esperada da fatura de agosto de 2026 |
|---|---|---|---|
| Inter | 5 | 12 | `2026-07-06` a `2026-08-05` |
| Bradesco | 29 | 8 | `2026-06-30` a `2026-07-29` |
| Mercado Pago | 2 | 7 | `2026-07-03` a `2026-08-02` |
| Renner | 26 | 10 | `2026-06-27` a `2026-07-26` |

Conferir também: `cycleWindow(31, 10, 2026, 3)` deve fechar em `2026-02-28` (mês curto), `cycleWindow(5, 12, 2026, 1)` deve começar em `2025-12-06` (virada de ano), e `cycleWindow(null, 12, 2026, 8)` deve devolver `null`.

**Apague o arquivo temporário antes de commitar.**

- [ ] **Step 3: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

- [ ] **Step 4: Commit**

```bash
git add src/lib/finance/billing-cycle.ts
git commit -m "feat(financas): ciclo de fatura em funcoes puras"
```

---

### Task 4: Ligar o ciclo no cálculo

**Files:**
- Modify: `src/lib/data/finance.ts`

**Interfaces:**
- Consumes: `cycleWindow` da Task 3.
- Produces: `CardWithInvoice.fatura_mes` passa a ser a fatura do ciclo. Ganha também `cycle_start: string | null` e `cycle_end: string | null`, que as tasks de detalhe usam para rotular a janela.

- [ ] **Step 1: Ler o cálculo atual**

Em `src/lib/data/finance.ts`, o laço que monta `cards` hoje usa `billingKey(t.occurred_on) <= curKey`, ou seja, mês-calendário acumulado, e soma `opening_invoice` tanto em `utilizado` quanto em `faturaMes`. Leia o bloco inteiro antes de editar.

- [ ] **Step 2: Trocar a regra da fatura**

A forma alvo, a ser adaptada aos nomes reais do arquivo:

```ts
const cards: CardWithInvoice[] = cardsRaw.map((c) => {
  const janela = cycleWindow(c.closing_day, c.due_day, year, month);

  // utilizado_total continua acumulado sobre a vida toda do cartão:
  // limite é consumido por saldo, não por ciclo.
  let utilizado = num(c.opening_invoice);
  // opening_invoice NÃO entra na fatura do ciclo: ela é anterior a qualquer
  // ciclo e reapareceria em todas, inflando todas.
  let faturaMes = 0;

  for (const t of allTx) {
    if (t.card_id !== c.id || t.type !== "expense") continue;
    const delta = t.is_card_payment ? -num(t.amount) : num(t.amount);
    utilizado += delta;

    const dentro = janela
      ? t.occurred_on >= janela.start && t.occurred_on <= janela.end
      : billingKey(t.occurred_on) <= curKey; // cartão sem ciclo: comportamento antigo
    if (dentro) faturaMes += delta;
  }

  utilizado = Math.max(utilizado, 0);
  faturaMes = Math.max(faturaMes, 0);
  const em_aberto = Math.max(utilizado - faturaMes, 0);
  const disponivel = num(c.credit_limit) - utilizado;

  return {
    ...c,
    invoice: faturaMes,
    fatura_mes: faturaMes,
    em_aberto,
    utilizado_total: utilizado,
    disponivel,
    cycle_start: janela?.start ?? null,
    cycle_end: janela?.end ?? null,
  };
});
```

A comparação de datas é feita por string porque `occurred_on` é `YYYY-MM-DD`, formato em que a ordem lexicográfica é a ordem cronológica. É o padrão que o resto do arquivo já usa.

- [ ] **Step 3: Acrescentar os campos ao tipo**

Em `src/types/finance.ts`, na interface `CardWithInvoice`:

```ts
  /** primeiro dia da janela da fatura; null quando o cartão não tem ciclo */
  cycle_start: string | null;
  /** dia do fechamento desta fatura; null quando o cartão não tem ciclo */
  cycle_end: string | null;
```

- [ ] **Step 4: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No app, com dados reais: comparar o valor da fatura de cada cartão com o app do banco correspondente. **Os valores vão mudar em relação ao que a tela mostrava antes**, no card "Faturas abertas" do Dashboard e no rail da Visão geral, porque o número anterior ignorava o ciclo. Isso é a correção, não uma regressão. Anote no relatório o valor antes e depois de cada cartão.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/finance.ts src/types/finance.ts
git commit -m "feat(financas): fatura calculada pelo ciclo real do cartao"
```

---

## Fase C: arte

### Task 5: CardArt

**Files:**
- Create: `src/components/finance/card-art.tsx`

**Interfaces:**
- Consumes: `issuerBySlug`, `issuerAsset` da Task 2; `CreditCard` com os campos da Task 1.
- Produces: `<CardArt card={card} bankIcon={string | null} size="stack" | "hero" | "mini" />`.

- [ ] **Step 1: Criar o componente**

```tsx
// src/components/finance/card-art.tsx
import Image from "next/image";
import { issuerBySlug, issuerAsset } from "@/lib/finance/issuers";
import { cn } from "@/lib/utils";
import type { CreditCard } from "@/types/finance";

/** Tons por variante, aplicados sobre a cor de marca do emissor. */
const TIERS: Record<string, { claro: number; escuro: number; texto: "light" | "dark" }> = {
  standard: { claro: 18, escuro: -22, texto: "light" },
  gold: { claro: 34, escuro: -6, texto: "dark" },
  platinum: { claro: 10, escuro: -34, texto: "light" },
  black: { claro: -55, escuro: -80, texto: "light" },
};

/** Clareia (positivo) ou escurece (negativo) um hex em pontos percentuais. */
function shift(hex: string, pct: number): string {
  const n = hex.replace("#", "");
  const v = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  const out = v.map((c) => {
    const alvo = pct >= 0 ? 255 : 0;
    return Math.round(c + (alvo - c) * (Math.abs(pct) / 100));
  });
  return "#" + out.map((c) => c.toString(16).padStart(2, "0")).join("");
}

const SIZES = {
  stack: { pad: "p-4", selo: 32, num: "text-[13px]", radius: "rounded-2xl" },
  hero: { pad: "p-5", selo: 38, num: "text-[15px]", radius: "rounded-2xl" },
  mini: { pad: "p-2", selo: 22, num: "hidden", radius: "rounded-lg" },
} as const;

/**
 * Arte do cartão, composta pelo app a partir do emissor.
 *
 * Não replica o cartão físico: usa a cor de marca do banco, o selo do emissor
 * e a variante para dar o tom. Um Inter Black e um Inter Gold convivem sem
 * exigir arte por produto.
 */
export function CardArt({
  card,
  bankSlug,
  size = "stack",
  className,
}: {
  card: CreditCard;
  /** slug do banco emissor; vem de banks.icon da conta vinculada */
  bankSlug: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const issuer = issuerBySlug(bankSlug);
  const base = issuer?.cor ?? card.color ?? "#3b82f6";
  const tier = TIERS[card.tier ?? "standard"] ?? TIERS.standard;
  const s = SIZES[size];
  const claro = tier.texto === "light";

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden shadow-lg",
        s.radius,
        s.pad,
        claro ? "text-white" : "text-[#12151b]",
        className
      )}
      style={{
        aspectRatio: "1.586",
        background: `linear-gradient(135deg, ${shift(base, tier.claro)}, ${base} 46%, ${shift(base, tier.escuro)})`,
      }}
    >
      {/* brilho diagonal, em gradiente e sem imagem, para não pesar o bundle */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, rgba(255,255,255,.24) 0%, rgba(255,255,255,.05) 38%, rgba(0,0,0,.10) 70%, rgba(0,0,0,.24) 100%)",
        }}
      />

      <div className="relative flex items-start justify-between">
        {issuer ? (
          <span
            className="shrink-0 overflow-hidden rounded-full shadow"
            style={{ width: s.selo, height: s.selo }}
          >
            <Image
              src={issuerAsset(issuer)}
              alt={issuer.nome}
              width={s.selo}
              height={s.selo}
              className="h-full w-full"
              unoptimized
            />
          </span>
        ) : (
          <span className="text-xs font-bold tracking-tight">{card.name}</span>
        )}
        {card.tier ? (
          <span className="text-[8px] font-semibold uppercase tracking-[0.16em] opacity-85">
            {card.tier}
          </span>
        ) : null}
      </div>

      <div className={cn("num relative mt-auto tracking-[0.15em] opacity-95", s.num)}>
        {card.last4 ? `•••• ${card.last4}` : ""}
      </div>

      {size !== "mini" ? (
        <div className="relative mt-2 flex items-end justify-between gap-2">
          <span className="min-w-0">
            {card.holder ? (
              <span className="block truncate text-[9px] uppercase tracking-[0.12em] opacity-90">
                {card.holder}
              </span>
            ) : null}
          </span>
          {card.network ? (
            <span className="shrink-0 text-[11px] font-bold italic opacity-95">
              {card.network.toUpperCase()}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Substituir o rótulo de bandeira por logo quando o arquivo existir**

O spec prevê o SVG da bandeira em `public/networks/<network>.svg`, fornecido pelo dono. Como não dá para consultar o sistema de arquivos no navegador, declare quais existem numa constante no topo do arquivo:

```tsx
/** Bandeiras com SVG disponível em public/networks/. Acrescente aqui ao
 *  adicionar o arquivo; sem entrada, a bandeira sai como rótulo de texto. */
const NETWORK_SVG: string[] = [];
```

E no bloco da bandeira, usar `<Image src={`/networks/${card.network}.svg`} .../>` quando `NETWORK_SVG.includes(card.network)`, caindo no rótulo de texto caso contrário. Isso evita imagem quebrada enquanto os arquivos não chegam.

- [ ] **Step 3: Verificar**

Rodar: `npm run build`
Esperado: build sem erro. O componente ainda não está montado em tela; a conferência visual acontece na Task 6.

- [ ] **Step 4: Commit**

```bash
git add src/components/finance/card-art.tsx
git commit -m "feat(cartoes): arte do cartao composta pelo emissor"
```

---

## Fase D: a carteira

### Task 6: A carteira de três estados

**Files:**
- Create: `src/hooks/use-outside-click.ts`
- Create: `src/components/finance/card-wallet.tsx`
- Modify: `src/app/(app)/financas/page.tsx`

**Interfaces:**
- Consumes: `CardArt` da Task 5, `CardWithInvoice` da Task 4.
- Produces: `<CardWallet cards={CardWithInvoice[]} bankSlugById={Record<number, string | null>} renderDetail={(card) => ReactNode} />`.

- [ ] **Step 1: Criar o hook de clique fora**

```ts
// src/hooks/use-outside-click.ts
"use client";

import { useEffect, type RefObject } from "react";

/**
 * Chama `onOutside` quando o clique acontece fora do elemento.
 * Usa mousedown e touchstart para responder antes do clique completar,
 * que é o que evita o fechamento parecer atrasado no celular.
 */
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void
) {
  useEffect(() => {
    function handle(e: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      onOutside();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [ref, onOutside]);
}
```

- [ ] **Step 2: Criar a carteira**

`src/components/finance/card-wallet.tsx` é `"use client"` e implementa os três estados do spec com `motion`:

- Estado `fan`: até quatro cartões absolutos, alinhados no eixo horizontal e escalonados 38px para baixo, com rotação alternada discreta (`-2`, `1.5`, `-1`, `2` graus) e o de baixo à frente. Hover levanta 12px e traz para a frente.
- Botão "Ver todos os N cartões" **abaixo da pilha, em fluxo normal**, aparecendo só quando há mais de quatro. Ele não pode ser posicionado sobre a pilha: no protótipo isso o deixou inclicável, porque a regra de hover do cartão levantava o cartão acima do botão.
- Estado `grid`: todos os cartões numa grade `repeat(auto-fill, minmax(168px, 1fr))`, com botão de voltar.
- Estado `open`: o cartão selecionado em `size="hero"` no topo, e abaixo dele uma fileira horizontal com todos em `size="mini"`, sem sobreposição, com `overflow-x: auto` e o ativo marcado por `outline`. O ativo é trazido para a área visível com `scrollIntoView({ block: "nearest", inline: "center" })`. Abaixo da fileira, `renderDetail(cartaoAtivo)`.

Cada cartão recebe `layoutId={`card-${card.id}`}` no `motion.div`, de modo que o mesmo elemento viaje entre os três estados em vez de haver fade entre elementos diferentes. A transição é `{ type: "spring", stiffness: 160, damping: 18, mass: 1 }`.

Movimento reduzido: usar `useReducedMotion()` de `src/hooks/use-reduced-motion.ts` e, quando ativo, passar `transition={{ duration: 0 }}`.

Teclado: cada cartão é um `<button>` com `aria-pressed`, Tab percorre, Enter abre. `Escape` volta ao estado anterior. `useOutsideClick` no container volta ao leque.

Esqueleto, a ser preenchido com as classes e os blocos descritos acima:

```tsx
"use client";

import { useRef, useState } from "react";
import { motion, LayoutGroup } from "motion/react";
import { CardArt } from "./card-art";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { CardWithInvoice } from "@/types/finance";

type Estado = "fan" | "grid" | "open";

/** Deslocamento e inclinação de cada posição do leque. Quatro no máximo:
 *  além disso a pilha fica alta demais e o botão de ver todos assume. */
const LEQUE = [
  { y: 0, rot: -2 },
  { y: 38, rot: 1.5 },
  { y: 76, rot: -1 },
  { y: 114, rot: 2 },
];

export function CardWallet({
  cards,
  bankSlugById,
  renderDetail,
}: {
  cards: CardWithInvoice[];
  bankSlugById: Record<number, string | null>;
  renderDetail: (card: CardWithInvoice) => React.ReactNode;
}) {
  const [estado, setEstado] = useState<Estado>("fan");
  const [ativoId, setAtivoId] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const reduzido = useReducedMotion();

  useOutsideClick(ref, () => setEstado("fan"));

  const mola = reduzido
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 160, damping: 18, mass: 1 };

  const ativo = cards.find((c) => c.id === ativoId) ?? null;

  function abrir(id: number) {
    setAtivoId(id);
    setEstado("open");
  }

  return (
    <div ref={ref} onKeyDown={(e) => e.key === "Escape" && setEstado("fan")}>
      <LayoutGroup>
        {/* estado fan: cards.slice(0, 4) posicionados por LEQUE, absolutos */}
        {/* botao "Ver todos os N cartoes" em fluxo normal, ABAIXO da pilha */}
        {/* estado grid: todos numa grade auto-fill minmax(168px, 1fr) */}
        {/* estado open: ativo em size="hero", fileira com todos em size="mini" */}
      </LayoutGroup>
      {estado === "open" && ativo ? renderDetail(ativo) : null}
    </div>
  );
}
```

Cada cartão renderizado, em qualquer estado, tem esta forma:

```tsx
<motion.button
  key={card.id}
  layoutId={`card-${card.id}`}
  transition={mola}
  aria-pressed={card.id === ativoId}
  onClick={() => abrir(card.id)}
  className="block w-full text-left"
>
  <CardArt card={card} bankSlug={bankSlugById[card.id] ?? null} size={tamanho} />
</motion.button>
```

- [ ] **Step 3: Montar na aba Cartões**

Em `src/app/(app)/financas/page.tsx`, no bloco `aba === "cartoes"`, substituir o `CardManager` pelo `<CardWallet>`. O mapa `bankSlugById` é montado no servidor a partir de `banks`, associando `bank.id` ao `bank.icon` quando o ícone for do formato `bank:<slug>` (é como `EntityIcon` já resolve marca de banco; confira o formato real antes de escrever).

`renderDetail` é preenchido nas tasks seguintes; nesta task, devolva um bloco simples com o nome do cartão e o valor da fatura, só para o estado aberto ter conteúdo.

- [ ] **Step 4: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No app, aba Cartões: o leque aparece com até quatro cartões; **clicar em cada um dos quatro abre**, inclusive o de baixo; o botão de ver todos é clicável (esse foi o bug do protótipo); a grade abre e permite escolher; no estado aberto, todos os cartões aparecem inteiros na fileira e trocar é um clique. Conferir no celular e no desktop.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-outside-click.ts src/components/finance/card-wallet.tsx "src/app/(app)/financas/page.tsx"
git commit -m "feat(cartoes): carteira com leque, grade e cartao aberto"
```

---

### Task 7: Aba Contas

**Files:**
- Modify: `src/app/(app)/financas/page.tsx`

**Interfaces:**
- Consumes: `TAB_ITEMS` que já existe na página.
- Produces: valor de aba `contas`.

- [ ] **Step 1: Acrescentar a aba**

Em `TAB_ITEMS`, inserir `{ value: "contas", label: "Contas" }` entre `transacoes` e `cartoes`. A validação `isAba` deriva dessa mesma lista, então nada mais precisa mudar para a URL aceitar o valor novo.

- [ ] **Step 2: Mover o bloco de contas**

O `AccountsSummary` hoje é renderizado no bloco `aba === "cartoes"`, herança da Onda 18, quando ele foi para lá por ser a única porta de criação de conta. Mover para o bloco `aba === "contas"`. A aba Cartões fica só com a carteira.

- [ ] **Step 3: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No app: a barra mostra Visão geral, Transações, Contas, Cartões, Agendadas, Recorrentes. A aba Contas cria e exclui conta. A aba Cartões não tem mais o bloco de contas. Trocar de aba preserva o mês na URL.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/financas/page.tsx"
git commit -m "feat(financas): aba Contas propria"
```

---

## Fase E: o detalhe

### Task 8: Cabeçalho da fatura, limite e datas

**Files:**
- Create: `src/components/finance/card-detail.tsx`
- Modify: `src/app/(app)/financas/page.tsx`

**Interfaces:**
- Consumes: `CardWithInvoice` com `cycle_start`/`cycle_end` da Task 4, `bestPurchaseDay` da Task 3, `Meter` e `Money` da Onda 18.
- Produces: `<CardDetail card={CardWithInvoice} children={ReactNode} />`, onde `children` recebe os blocos das tasks 9 a 11.

- [ ] **Step 1: Criar a casca do detalhe**

O componente monta, nesta ordem: valor da fatura em destaque com o rótulo "Fatura de <mês>", a linha "Fecha DD/MM, vence DD/MM", o selo de estado, o `Meter` de limite e as três datas.

O estado da fatura, sem campo novo no banco:

- **Aberta:** hoje é anterior a `cycle_end`.
- **Paga:** existe transação com `is_card_payment` entre `cycle_end` e o vencimento, somando o valor da fatura ou mais.
- **Fechada:** o resto. Pagamento parcial mantém fechada e mostra quanto resta.

O selo usa `bg-positive/15 text-positive` para aberta, `bg-muted text-muted-foreground` para paga e `bg-negative/15 text-negative` para fechada.

As três datas ficam num grid de três colunas: "Melhor dia de compra" com `bestPurchaseDay(card.closing_day)`, "Fechamento" com `card.closing_day` e "Vencimento" com `card.due_day`. Cartão sem esses dias mostra "-" em vez de número.

- [ ] **Step 2: Ligar no `renderDetail`**

Trocar o bloco provisório da Task 6 pelo `<CardDetail>`.

- [ ] **Step 3: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No app: abrir cada cartão e conferir que o valor bate com o do banco, que o estado faz sentido para a data de hoje, e que um cartão sem fechamento definido mostra "-" sem quebrar.

- [ ] **Step 4: Commit**

```bash
git add src/components/finance/card-detail.tsx "src/app/(app)/financas/page.tsx"
git commit -m "feat(cartoes): cabecalho da fatura, limite e datas"
```

---

### Task 9: Movimentações da fatura com categoria editável

**Files:**
- Create: `src/components/finance/card-invoice-rows.tsx`
- Modify: `src/app/(app)/financas/page.tsx`

**Interfaces:**
- Consumes: `DataTable`/`DataTableRow`, `BrandAvatar`, `CategoryChip`, `Money` da Onda 18; `SelectMenu` de `src/components/ui/select-menu.tsx`; a Server Action de atualizar transação.
- Produces: `<CardInvoiceRows transactions={Transaction[]} categories={Category[]} janela={{start,end} | null} />`.

- [ ] **Step 1: Selecionar as transações no servidor**

Em `financas/page.tsx`, para o cartão aberto, filtrar as transações do mês já carregadas por `card_id` e pela janela `cycle_start`/`cycle_end`. Sem janela, cair no mês-calendário. Passar a lista pronta ao componente: nenhuma busca em client component.

- [ ] **Step 2: Criar o componente**

`"use client"`, porque a categoria é editável. A linha usa `DataTableRow` com `BrandAvatar` da descrição, a descrição, a categoria e o `Money`. O cabeçalho mostra "Movimentações da fatura" à esquerda e a janela formatada ("06/07 a 05/08") à direita.

A categoria é um botão que troca para o `SelectMenu` ao clicar. A API do `SelectMenu` é `{ value, options, onChange, placeholder?, disabled?, className?, footer?, onEditOption? }` com `options: SelectOption[]`. No `onChange`, chamar a Server Action de atualizar transação com o `category_id` novo, marcar a linha como salvando (opacidade reduzida e ponteiro desabilitado) e, em caso de erro, voltar ao valor anterior e mostrar o toast de erro que o app já usa.

- [ ] **Step 3: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No app: trocar a categoria de uma movimentação, recarregar a página e confirmar que persistiu; conferir que o total das movimentações bate com o valor da fatura mostrado acima.

- [ ] **Step 4: Commit**

```bash
git add src/components/finance/card-invoice-rows.tsx "src/app/(app)/financas/page.tsx"
git commit -m "feat(cartoes): movimentacoes da fatura com categoria editavel"
```

---

### Task 10: Parcelamentos em aberto

**Files:**
- Create: `src/components/finance/card-installments.tsx`
- Modify: `src/lib/actions/finance.ts`
- Modify: `src/app/(app)/financas/page.tsx`

**Interfaces:**
- Consumes: as colunas `purchase_group uuid`, `installments int` e `installment_no int` de `transactions` (migração 0007).
- Produces: `<CardInstallments groups={InstallmentGroup[]} />` e a Server Action `renameInstallmentGroup(purchaseGroup: string, titulo: string)`.

- [ ] **Step 1: Agrupar no servidor**

Em `financas/page.tsx`, montar os parcelamentos em aberto do cartão: agrupar as transações do cartão por `purchase_group` (ignorando as nulas), considerar em aberto os grupos cuja maior `installment_no` já lançada é menor que `installments`, e para cada grupo calcular título (a descrição, sem o prefixo de parcela), `installment_no` atual, `installments` total, valor da parcela e quanto falta.

Tipo:

```ts
export type InstallmentGroup = {
  purchaseGroup: string;
  titulo: string;
  atual: number;
  total: number;
  valorParcela: number;
  falta: number;
};
```

- [ ] **Step 2: Criar a Server Action de renomear**

Em `src/lib/actions/finance.ts`, seguindo o padrão zod mais throw/catch do arquivo:

```ts
export async function renameInstallmentGroup(purchaseGroup: string, titulo: string) {
  // Renomeia TODAS as parcelas da mesma compra: elas são o mesmo item, e
  // renomear só a da fatura aberta deixaria a lista inconsistente nos meses
  // seguintes.
}
```

A action valida que o título não é vazio e tem no máximo 120 caracteres, atualiza `description` de todas as transações com aquele `purchase_group`, e revalida a rota. A RLS `own_rows` garante que só as linhas do próprio usuário são afetadas; não filtre por `user_id` à mão, que é o padrão do arquivo.

- [ ] **Step 3: Criar o componente**

`"use client"`. Cada linha mostra o título, "parcela X de Y" em texto secundário e o valor da parcela. Clicar no título troca para um input que salva ao confirmar (Enter ou blur) e cancela no Escape. Abaixo da lista, uma linha com o total que falta.

Quando não houver parcelamento em aberto, o card inteiro não é renderizado.

- [ ] **Step 4: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No app: renomear um parcelamento, navegar para o mês seguinte e confirmar que a parcela seguinte também mudou de nome, que é o comportamento pretendido.

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/card-installments.tsx src/lib/actions/finance.ts "src/app/(app)/financas/page.tsx"
git commit -m "feat(cartoes): parcelamentos em aberto com titulo editavel"
```

---

### Task 11: Projeção das próximas faturas

**Files:**
- Create: `src/components/finance/card-forecast.tsx`
- Modify: `src/lib/data/finance.ts`
- Modify: `src/app/(app)/financas/page.tsx`

**Interfaces:**
- Consumes: `cycleWindow` da Task 3, as colunas de parcelamento e a estrutura de assinaturas que já existe.
- Produces: `getCardForecast(cardId: number, year: number, month: number, months?: number): Promise<{ label: string; total: number }[]>` e `<CardForecast rows={...} />`.

- [ ] **Step 1: Criar a consulta**

Em `src/lib/data/finance.ts`, seguindo o padrão das consultas vizinhas. Para cada um dos seis ciclos seguintes ao visualizado, somar:

- as transações do cartão com `occurred_on` dentro da janela daquele ciclo (que são as parcelas futuras já lançadas);
- as assinaturas vinculadas ao cartão que caem naquele ciclo.

Leia como `getSubscriptions` resolve a data de cobrança antes de escrever, e reuse a mesma regra em vez de inventar outra.

- [ ] **Step 2: Criar o componente**

Uma linha por mês, com o nome do mês à esquerda e o valor à direita. Abaixo, em texto secundário:

```
Só considera o que já está lançado: parcelas e assinaturas. Não estima gasto novo.
```

Esse texto não é opcional. Um número que parece completo sem ser é pior que número nenhum, e a projeção enxerga apenas o que já existe no banco.

- [ ] **Step 3: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No app: conferir que a soma de um mês futuro bate com as parcelas que você sabe existir naquele ciclo.

- [ ] **Step 4: Commit**

```bash
git add src/components/finance/card-forecast.tsx src/lib/data/finance.ts "src/app/(app)/financas/page.tsx"
git commit -m "feat(cartoes): projecao das proximas faturas"
```

---

### Task 12: Gerenciar o cartão no detalhe

**Files:**
- Modify: `src/components/finance/card-detail.tsx`
- Modify: `src/components/finance/card-manager.tsx`
- Modify: `src/app/(app)/financas/page.tsx`

**Interfaces:**
- Consumes: as actions de criar, editar e excluir cartão.
- Produces: nada novo.

- [ ] **Step 1: Levar editar e excluir para o rodapé do detalhe**

No fim do `CardDetail`, dois botões: "Editar cartão", que abre o modal do formulário com os campos da Task 1, e "Excluir cartão", que pede confirmação antes.

- [ ] **Step 2: Aposentar a listagem antiga**

O `CardManager` deixa de renderizar a lista de cartões: o formulário dele é extraído para ser reaproveitado pelo modal do detalhe e pelo `+ Adicionar` do cabeçalho. **Antes de remover qualquer coisa, confirme com `rg "CardManager" src` que não sobrou outro consumidor.** Se o arquivo ficar só com o formulário, renomeie o componente exportado para refletir o que ele passou a ser.

- [ ] **Step 3: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No app: criar, editar e excluir cartão pelos caminhos novos. Conferir que não sobrou nenhuma tela sem porta de entrada para criar cartão.

- [ ] **Step 4: Commit**

```bash
git add src/components/finance/card-detail.tsx src/components/finance/card-manager.tsx "src/app/(app)/financas/page.tsx"
git commit -m "feat(cartoes): gerenciar o cartao dentro do detalhe"
```

---

## Fase F: integração e fechamento

### Task 13: Rail da Visão geral

**Files:**
- Modify: `src/components/finance/cards-card.tsx`

**Interfaces:**
- Consumes: `CardArt` da Task 5.
- Produces: nada novo.

- [ ] **Step 1: Trocar o avatar pela miniatura**

O `CardsCard` da Onda 18 usa um `CardAvatar` local com as iniciais sobre a cor do cartão. Trocar por `<CardArt size="mini" />`, que agora carrega o selo do emissor. Remover o `CardAvatar` e a função de luminância dele se ficarem sem uso.

- [ ] **Step 2: Cada linha vira link para a aba**

Envolver a linha num `Link` para `/financas?aba=cartoes`, mantendo o mês quando houver. Assim o resumo da Visão geral leva ao lugar onde a ação acontece.

- [ ] **Step 3: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No app: o rail mostra miniaturas com a marca de cada emissor, e clicar leva à aba Cartões.

- [ ] **Step 4: Commit**

```bash
git add src/components/finance/cards-card.tsx
git commit -m "feat(financas): rail com miniatura do cartao e link para a aba"
```

---

### Task 14: Varreduras, build e HANDOFF

**Files:**
- Modify: `HANDOFF.md`
- Modify: o que a varredura apontar.

- [ ] **Step 1: Varredura de travessão**

Rodar: `rg "—|–" src`
Esperado: nenhuma ocorrência em string visível ao usuário. Ocorrência em comentário de código é aceitável.

- [ ] **Step 2: Varredura de dependência nova**

Rodar: `git diff main --stat -- package.json package-lock.json`
Esperado: nenhuma mudança. Se houver, uma dependência entrou sem necessidade e precisa sair: `motion` e `lucide-react` já estavam no projeto.

- [ ] **Step 3: Build limpo**

Rodar: `npm run build`
Esperado: build sem erro e sem aviso novo.

- [ ] **Step 4: Conferência final**

Percorrer a aba Cartões nos dois temas, em desktop e celular: leque, botão de ver todos, grade, cartão aberto, fileira rolável, edição de categoria e de título de parcelamento. No app instalado (Capacitor), conferir que a carteira responde ao toque e que o scroll da fileira não briga com o scroll da página.

- [ ] **Step 5: Registrar no HANDOFF**

Atualizar a data do topo e a seção de estado atual, e acrescentar a Onda 19 com: o que mudou e por quê, a migração `20260701000019_card_identity.sql` (e se já foi rodada), a mudança de significado de `fatura_mes` e o efeito dela no Dashboard, os assets que dependem do dono (`public/banks/renner.png` e os cinco de `public/networks/`), e o que ficou fora de escopo.

- [ ] **Step 6: Commit**

```bash
git add HANDOFF.md src
git commit -m "docs: registra a Onda 19 (carteira de cartoes) no HANDOFF"
```

---

## Ordem e pontos de parada

A Task 1 para esperando o dono rodar a migração: sem a coluna no banco, salvar cartão quebra. A Task 4 muda números que já aparecem em outras telas, então vale conferir os valores antes de seguir. As fases C, D e E constroem em cima e podem correr direto. A arte só fica completa quando os assets do dono chegarem, e nenhuma task depende disso para passar.
