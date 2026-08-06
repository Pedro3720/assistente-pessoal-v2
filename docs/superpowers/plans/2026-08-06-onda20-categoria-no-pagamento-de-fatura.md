# Onda 20: categoria no pagamento de fatura, plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir escolher categoria ao lançar o pagamento da fatura do cartão, e fazer esse pagamento contar como despesa nos totais, conforme `docs/superpowers/specs/2026-08-06-onda20-categoria-no-pagamento-de-fatura-design.md`.

**Architecture:** Duas mudanças independentes. A primeira libera o campo de categoria no formulário (a coluna e a Server Action já aceitam). A segunda remove três exclusões de `is_card_payment` nos agregados de despesa, que existiam para evitar dupla contagem e agora saem por decisão explícita do dono. O cálculo da fatura fica intocado.

**Tech Stack:** Next.js App Router (Server Components leem, Server Actions mutam), Tailwind v4, Supabase com RLS `own_rows`.

## Global Constraints

- **Não existe framework de testes neste projeto.** O ciclo de verificação de cada task é `npm run build` seguido de conferência manual. Não instale framework de teste.
- **Nunca usar `—` (em dash) nem `–` (en dash) em texto visível ao usuário.**
- **Nenhuma dependência nova.**
- **`src/lib/finance/invoice.ts` NÃO pode ser tocado.** O pagamento continua abatendo `utilizado_total` e continua fora do valor do ciclo. Aplicar pagamento dentro da janela do ciclo foi o bug Critical da Onda 19 que zerava a fatura seguinte em todo cartão com fechamento e vencimento preenchidos.
- Dinheiro por `src/lib/money.ts`, datas por `src/lib/dates.ts`.
- Um commit por task, com a task verificada antes.

## Nota sobre a visualização no navegador

O `CLAUDE.md` exige montar a visualização antes de implementar. **O dono dispensou essa etapa nesta onda**, e a razão está registrada: a mudança é de números, não de layout. O que a visualização mostraria (um campo aparecendo no formulário) não é o que importa aqui; o efeito real são os totais subindo, e isso só aparece com os dados reais dele. A dispensa é pontual e não altera a regra.

## Correção ao spec

A seção 4.3 do spec diz que `src/components/finance/statement.tsx` precisa passar a mostrar a categoria quando houver. **Ele já faz isso.** O código atual é:

```tsx
const label = cat
  ? cat.name
  : t.is_card_payment
    ? "Pagamento de fatura"
    : "Sem categoria";
```

`cat` vem de `t.category_id ? catById.get(t.category_id) : null`, então um pagamento com categoria já exibe o nome da categoria, e o rótulo fixo só aparece quando não há categoria, que é exatamente o comportamento pedido. **Nenhuma task toca esse arquivo.** O spec foi escrito a partir de um grep raso; esta é a correção.

---

## Estrutura de arquivos

**Modificados**

| Arquivo | Responsabilidade da mudança |
|---|---|
| `src/components/finance/transactions-section.tsx` | Deixar de esconder o campo de categoria quando o lançamento é pagamento de fatura |
| `src/app/(app)/financas/page.tsx` | Passar a incluir pagamento no laço que monta o donut |
| `src/lib/data/finance.ts` | Passar a incluir pagamento em `totals.expense` e na série de saídas por mês |
| `HANDOFF.md` | Registro da onda |

**Não tocados:** `src/lib/finance/invoice.ts`, `src/components/finance/statement.tsx`, `src/components/finance/import-modal.tsx`.

---

### Task 1: Campo de categoria no pagamento de fatura

**Files:**
- Modify: `src/components/finance/transactions-section.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: nada de novo. O formulário já monta `category_id` no objeto salvo (`category_id: categoryId ? Number(categoryId) : null`); esta task só torna o campo alcançável.

- [ ] **Step 1: Liberar o campo**

Em `src/components/finance/transactions-section.tsx`, o bloco do campo de categoria está condicionado assim:

```tsx
{!isCardPayment && !isTransfer && (
  <div className="space-y-1">
    <label className="text-sm font-medium">Categoria</label>
```

Troque a condição para:

```tsx
{!isTransfer && (
```

Transferência continua sem categoria, e isso é proposital: dinheiro trocando de bolso não é despesa e não entra em categoria nenhuma.

- [ ] **Step 2: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No app: abrir o formulário de transação, marcar "Pagamento de fatura", e confirmar que o campo Categoria aparece. Escolher uma categoria, salvar, reabrir para editar e confirmar que a categoria voltou preenchida. Confirmar também que ao marcar "Transferência" o campo continua escondido.

- [ ] **Step 3: Commit**

```bash
git add src/components/finance/transactions-section.tsx
git commit -m "feat(financas): pagamento de fatura aceita categoria"
```

---

### Task 2: Pagamento passa a contar nos agregados de despesa

**Files:**
- Modify: `src/app/(app)/financas/page.tsx`
- Modify: `src/lib/data/finance.ts`

**Interfaces:**
- Consumes: nada.
- Produces: nada de novo. Muda o valor de `totals.expense`, do donut e da série mensal.

**As três mudanças precisam sair juntas.** A Onda 19 estabeleceu que a série de saídas por mês e o donut usam exatamente o mesmo critério de "o que é despesa"; alterar um e não o outro faria os dois discordarem na mesma tela, que é a inconsistência que aquela onda gastou uma revisão inteira corrigindo.

- [ ] **Step 1: Donut e legenda**

Em `src/app/(app)/financas/page.tsx`, no laço que monta `byCat`:

```tsx
if (t.type !== "expense" || t.is_card_payment || t.is_transfer) continue;
```

Passa a ser:

```tsx
// Pagamento de fatura conta como despesa (Onda 20, decisão do dono): o
// mesmo gasto passa a ser contado na compra e no pagamento. Ver o spec
// 2026-08-06 para o porquê antes de "corrigir" isso.
if (t.type !== "expense" || t.is_transfer) continue;
```

- [ ] **Step 2: Total de despesas**

Em `src/lib/data/finance.ts`, o filtro que monta o total:

```ts
.filter((t) => t.type === "expense" && !t.is_card_payment && !t.is_transfer)
```

Passa a ser:

```ts
// Pagamento de fatura entra no total de despesas (Onda 20). O cálculo da
// fatura, em lib/finance/invoice.ts, continua tratando pagamento à parte.
.filter((t) => t.type === "expense" && !t.is_transfer)
```

- [ ] **Step 3: Série de saídas por mês**

Ainda em `src/lib/data/finance.ts`, dentro de `getMonthlyExpenseSeries`:

```ts
if (t.type !== "expense" || t.is_transfer || t.is_card_payment) continue;
```

Passa a ser:

```ts
// Mesmo critério do donut e de totals.expense: os três precisam concordar,
// senão a mesma tela mostra dois valores para a mesma coisa.
if (t.type !== "expense" || t.is_transfer) continue;
```

- [ ] **Step 4: Conferir que a fatura não mudou**

Rodar: `rg -n "is_card_payment" src/lib/finance/invoice.ts`
Esperado: as ocorrências continuam lá, intocadas. Se este arquivo aparecer no `git diff` desta task, algo saiu do escopo.

- [ ] **Step 5: Verificar**

Rodar: `npm run build`
Esperado: build sem erro.

No app, com dados reais: anotar antes e depois o "Despesas" do Dashboard, o total do mês no donut e a barra do mês corrente no gráfico de saídas. Os três devem subir pelo valor dos pagamentos de fatura daquele mês, e devem subir **pelo mesmo valor**, porque agora usam o mesmo critério. Conferir também que a fatura, o limite e o disponível de cada cartão continuam iguais aos de antes.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/financas/page.tsx" src/lib/data/finance.ts
git commit -m "feat(financas): pagamento de fatura conta como despesa nos totais"
```

---

### Task 3: Varreduras e HANDOFF

**Files:**
- Modify: `HANDOFF.md`
- Modify: o que a varredura apontar.

- [ ] **Step 1: Varredura de travessão**

Rodar: `rg "—|–" src`
Esperado: nenhuma ocorrência em string visível ao usuário. Comentário de código é aceitável.

- [ ] **Step 2: Confirmar que nada saiu do escopo**

Rodar: `git diff main --stat`
Esperado: apenas `src/components/finance/transactions-section.tsx`, `src/app/(app)/financas/page.tsx`, `src/lib/data/finance.ts` e `HANDOFF.md`. Se `invoice.ts`, `statement.tsx`, `import-modal.tsx` ou `package.json` aparecerem, algo passou do combinado.

- [ ] **Step 3: Build limpo**

Rodar: `npm run build`
Esperado: build sem erro e sem aviso novo.

- [ ] **Step 4: Registrar no HANDOFF**

Atualizar a data do topo e a seção de estado atual, e acrescentar a Onda 20 com:

- o que mudou e por quê;
- **que a dupla contagem é decisão consciente do dono**, com o motivo, para ninguém tratar como bug depois;
- que os totais de meses passados mudaram, e que não houve migração do histórico;
- que `invoice.ts` ficou de fora de propósito, e a consequência de mexer nele;
- que a importação continua trazendo pagamento sem categoria.

- [ ] **Step 5: Commit**

```bash
git add HANDOFF.md src
git commit -m "docs: registra a Onda 20 (categoria no pagamento de fatura) no HANDOFF"
```

---

## Ordem e pontos de parada

A Task 1 é isolada e sem risco: libera um campo. A Task 2 é a que muda números já conferidos pelo dono, então vale parar depois dela e comparar os valores antes de seguir. Não há migração de banco nesta onda.
