# Onda 17 Implementation Plan: login Google, ordem de tarefas por filtro, centralização das abas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar as 3 sugestões novas do dono: entrar com a conta Google sem perder a conta atual, reordenar tarefas com filtro ativo, e centralizar todas as abas na tela como já acontece em Finanças.

**Architecture:** Centralização resolvida por uma coluna de app única no `(app)/layout.tsx` mais `mx-auto` no wrapper externo de cada rota. Reordenação filtrada resolvida por uma função pura que permuta apenas os slots da ordem global ocupados pelos itens visíveis, sem migração e sem mexer na Server Action. Login Google pelo provider do Supabase Auth, com vinculação de identidade no `/perfil` para garantir o mesmo `user_id`, botão escondido no WebView do APK por decisão tomada no servidor, e atrás de um interruptor de env.

**Tech Stack:** Next 16.2.12 (App Router, Server Components e Server Actions) · React 19 · TypeScript strict · Tailwind v4 · `@supabase/ssr` e `@supabase/supabase-js` · `@dnd-kit` · sonner · Capacitor 8 (APK Android).

**Spec:** `docs/superpowers/specs/2026-07-29-onda17-login-google-ordem-tarefas-centralizacao-design.md`

## Global Constraints

- **Sem migração SQL nesta onda.** Nenhuma tarefa cria ou altera tabela, coluna, policy ou índice.
- **NUNCA usar travessão (`—`) nem `–` em texto visível ao usuário** (UI, labels, placeholders, toasts, mensagens de erro). Usar vírgula, ponto, dois-pontos, parênteses ou "e". Hífen simples é permitido quando for hífen de verdade.
- **Não existe framework de testes no projeto.** A validação de cada tarefa é `npm run build` mais verificação no navegador. Onde há lógica pura, a tarefa inclui um harness temporário em Node, que é apagado antes do commit.
- **Arquitetura:** Server Components leem (`src/lib/data/*`), Server Actions mutam (`src/lib/actions/*`, `"use server"`, Zod em `src/lib/validation/*`, `user_id` via `auth.getUser()`, `revalidatePath`). Sem `any`. Regra de negócio fora do JSX.
- **Não tocar** nos `flex-1` e `min-w-0` do `src/app/(app)/layout.tsx`: são a correção da sugestão #32.
- **Datas** por `src/lib/dates.ts`, **dinheiro** por `src/lib/money.ts`. Nenhuma tarefa aqui precisa dos dois, mas nada de `toISOString().split`.
- **Modais** só via `src/components/ui/modal.tsx`. Nenhuma tarefa aqui cria modal.
- Cada tarefa termina em commit próprio, na branch `feat/onda17-google-ordem-centralizacao`.
- O classificador de segurança do harness ficou intermitente durante o planejamento, o que bloqueia `Bash`. Se `npm run build` ou `git commit` não puderem rodar, **dizer isso explicitamente** no relato da tarefa em vez de presumir sucesso.

## Mapa de arquivos

**Criados**
| Arquivo | Responsabilidade |
|---|---|
| `src/lib/tasks/reorder.ts` | Função pura da reordenação filtrada. Zero dependências, zero import. |
| `src/lib/auth/webview.ts` | Detectar WebView do APK a partir da string de user-agent. Função pura. |
| `src/lib/auth/ensure-profile.ts` | Garantir nome no perfil e descartar avatar externo depois do login OAuth. Server-only. |
| `src/components/auth/google-button.tsx` | Botão "Entrar com Google" (client), navegação via `signInWithOAuth`. |
| `src/components/profile/google-identity.tsx` | Seção "Conta Google" do /perfil (client): vincular e desvincular. |

**Modificados**
| Arquivo | Mudança |
|---|---|
| `src/app/(app)/layout.tsx` | Coluna do app: `mx-auto w-full max-w-7xl`. |
| `src/app/(app)/page.tsx` | `mx-auto` no wrapper. |
| `src/app/(app)/financas/page.tsx` | Remove `mx-auto max-w-7xl` (virou papel do layout). |
| `src/app/(app)/perfil/page.tsx` | `mx-auto` no wrapper e seção "Conta Google". |
| `src/app/(app)/sugestoes/page.tsx` | `mx-auto` no wrapper externo. |
| `src/app/(app)/admin/sugestoes/page.tsx` | `mx-auto` no wrapper externo. |
| `src/components/tasks/tasks-view.tsx` | `mx-auto`, fim do `canReorder`, `onDragEnd` sobre a lista visível. |
| `src/components/passwords/passwords-view.tsx` | `mx-auto` no wrapper. |
| `src/app/(auth)/login/page.tsx` | Botão Google acima do formulário, decidido no servidor. |
| `src/app/api/auth/callback/route.ts` | Chama `ensureProfile` depois do `exchangeCodeForSession`. |
| `capacitor.config.ts` | `appendUserAgent: "ZeniteApp"`. |
| `HANDOFF.md` | Registro da Onda 17. |

**Inalterados de propósito:** `src/lib/actions/task.ts` e `src/lib/validation/task.ts` (o `reorderTasks` atual já serve), `src/components/calendar/calendar-view.tsx` (não tem largura própria, quem limita passa a ser o layout), `src/components/suggestions/suggestions-view.tsx` e `admin-suggestions-view.tsx` (wrappers internos), e todo o fluxo `/api/google/*` do Calendário.

---

### Task 1: Centralização das abas (sugestão 3)

**Files:**
- Modify: `src/app/(app)/layout.tsx:35`
- Modify: `src/app/(app)/page.tsx:72`
- Modify: `src/app/(app)/financas/page.tsx:80`
- Modify: `src/app/(app)/perfil/page.tsx:11`
- Modify: `src/app/(app)/sugestoes/page.tsx:8`
- Modify: `src/app/(app)/admin/sugestoes/page.tsx:18`
- Modify: `src/components/tasks/tasks-view.tsx:123`
- Modify: `src/components/passwords/passwords-view.tsx:121`
- Test: nenhum arquivo de teste (não há framework). Verificação por medição no navegador, no passo 4.

**Interfaces:**
- Consumes: nada.
- Produces: nada em código. Só a garantia visual de que existe uma coluna de app centralizada de `max-w-7xl` no `(app)/layout.tsx`, dentro da qual as páginas se centralizam.

- [ ] **Step 1: A coluna do app no layout**

Em `src/app/(app)/layout.tsx`, o div interno do `<main>`. Manter o comentário do `min-w-0` que está acima do `<main>` e não tocar em `min-w-0 flex-1`.

De:

```tsx
      <main className="min-w-0 flex-1">
        <div className="px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] md:px-10 md:pt-10 md:pb-10">
```

Para:

```tsx
      <main className="min-w-0 flex-1">
        {/* Coluna do app: uma largura maxima só, centralizada. Cada pagina
            centraliza a propria largura de leitura dentro dela (mx-auto no
            wrapper externo da rota). Tambem é o que limita o calendario, que
            nao tem largura propria. */}
        <div className="mx-auto w-full max-w-7xl px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+6rem)] md:px-10 md:pt-10 md:pb-10">
```

- [ ] **Step 2: `mx-auto` nas páginas, e Finanças abrindo mão do dela**

Cinco edições de uma classe. Em `src/app/(app)/page.tsx`:

```tsx
    <div className="mx-auto max-w-5xl space-y-5 md:space-y-8">
```

Em `src/app/(app)/financas/page.tsx` (a página perde a largura, que agora é do layout):

```tsx
    <div className="space-y-6">
```

Em `src/app/(app)/perfil/page.tsx`, `src/app/(app)/sugestoes/page.tsx` e `src/app/(app)/admin/sugestoes/page.tsx`, o wrapper externo de cada um:

```tsx
    <div className="mx-auto max-w-3xl space-y-6">
```

Em `src/components/tasks/tasks-view.tsx:123` e `src/components/passwords/passwords-view.tsx:121`:

```tsx
    <div className="mx-auto max-w-4xl space-y-6">
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ Compiled successfully`, sem erro de tipo. Se o build falhar por algo não relacionado (rede, Supabase indisponível no prerender), relatar a saída real, não presumir.

- [ ] **Step 4: Medir no navegador**

Subir o dev server e medir a coluna. Ferramentas: `preview_start {name: "dev"}`, depois `javascript_tool`.

A área logada exige sessão. Se o navegador da sessão não tiver sessão, medir na página que não exige (`/login` não tem a coluna) **não serve**: nesse caso, construir uma repro fiel da estrutura (`<div class="flex min-h-screen">` mais `<main class="min-w-0 flex-1">` mais o div da coluna com as classes finais) e medir nela, **dizendo no relato que foi repro e não o app logado**.

Medição, com o app logado em `/tarefas`, a 1280px e a 390px:

```js
(() => {
  const col = document.querySelector('main > div');
  const r = col.getBoundingClientRect();
  const doc = document.documentElement;
  return {
    larguraColuna: Math.round(r.width),
    folgaEsquerda: Math.round(r.left),
    folgaDireita: Math.round(doc.clientWidth - r.right),
    conteudo: (() => { const c = col.firstElementChild ? col.querySelector('[class*="max-w-"]') : null; return c ? Math.round(c.getBoundingClientRect().left) : null; })(),
    overflowPx: Math.max(0, doc.scrollWidth - doc.clientWidth),
  };
})()
```

Expected a 1280px: `overflowPx: 0`, e `folgaEsquerda` aproximadamente igual a `folgaDireita` (é o que prova a centralização; antes a folga da direita era grande e a da esquerda zero).
Expected a 390px: `overflowPx: 0` e a coluna ocupando a largura toda (`folgaEsquerda` 0, porque abaixo de 1280 a largura máxima não morde).

Repetir em `/` (dashboard) e `/calendario`. No calendário, confirmar que a largura agora tem teto de 1280px em vez de esticar.

- [ ] **Step 5: Varredura de travessão**

Run: `rg "—|–" src`
Expected: nenhuma linha nova em relação ao que já existia. Se aparecer algo em string de UI, corrigir antes do commit.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/layout.tsx src/app/\(app\)/page.tsx src/app/\(app\)/financas/page.tsx src/app/\(app\)/perfil/page.tsx src/app/\(app\)/sugestoes/page.tsx src/app/\(app\)/admin/sugestoes/page.tsx src/components/tasks/tasks-view.tsx src/components/passwords/passwords-view.tsx
git commit -m "feat(ui): centraliza as abas numa coluna unica de app (sugestao 3)"
```

---

### Task 2: Função pura da reordenação filtrada (sugestão 2, parte 1)

**Files:**
- Create: `src/lib/tasks/reorder.ts`
- Test: harness temporário `<scratchpad>/check-reorder.mjs` mais a compilação do arquivo pelo `tsc` local. Ambos apagados no fim (o projeto não tem framework de testes e não vai passar a ter nesta onda).

**Interfaces:**
- Consumes: nada. O arquivo é deliberadamente sem imports, para poder ser compilado e exercitado isolado.
- Produces:
  ```ts
  export function reorderWithinFilter<T extends { id: number }>(
    order: T[],
    shown: T[],
    activeId: number,
    overId: number
  ): T[] | null
  ```
  Devolve a nova ordem **global** (mesmo comprimento e mesmo conjunto de ids da entrada), ou `null` quando não há nada para fazer ou quando a entrada é inconsistente. A Task 3 consome exatamente esta assinatura.

- [ ] **Step 1: Escrever o harness que falha**

Criar `<scratchpad>/check-reorder.mjs` (o diretório de scratchpad da sessão, nunca dentro do projeto):

```js
import { reorderWithinFilter } from "./reorder.js";

let falhas = 0;
function ok(nome, real, esperado) {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a === b) return console.log(`ok   ${nome}`);
  falhas++;
  console.log(`FALHA ${nome}\n  esperado ${b}\n  real     ${a}`);
}

const t = (id) => ({ id });
const ids = (lista) => (lista === null ? null : lista.map((x) => x.id));

// 1) sem filtro: comporta-se como um arrayMove comum
{
  const order = [t(1), t(2), t(3), t(4)];
  ok("sem filtro, move 4 para o topo", ids(reorderWithinFilter(order, order, 4, 1)), [4, 1, 2, 3]);
}

// 2) filtrado: permuta so os slots dos visiveis, os escondidos ficam parados
{
  const order = [t(10), t(11), t(12), t(13), t(14), t(15)];
  const shown = [order[1], order[3], order[4]]; // slots 1, 3 e 4
  ok("filtrado, move o ultimo visivel para o topo", ids(reorderWithinFilter(order, shown, 14, 11)), [10, 14, 12, 11, 13, 15]);
}

// 3) filtrado, move o primeiro visivel para o fim
{
  const order = [t(10), t(11), t(12), t(13), t(14), t(15)];
  const shown = [order[1], order[3], order[4]];
  ok("filtrado, move o primeiro visivel para o fim", ids(reorderWithinFilter(order, shown, 11, 14)), [10, 13, 12, 14, 11, 15]);
}

// 4) origem igual ao destino: nada a fazer
{
  const order = [t(1), t(2), t(3)];
  ok("mesmo id", reorderWithinFilter(order, order, 2, 2), null);
}

// 5) id fora da lista visivel: nada a fazer
{
  const order = [t(1), t(2), t(3)];
  const shown = [order[0], order[2]];
  ok("id ausente em shown", reorderWithinFilter(order, shown, 2, 3), null);
}

// 6) shown com item que nao esta em order: entrada inconsistente
{
  const order = [t(1), t(2)];
  ok("shown fora de order", reorderWithinFilter(order, [t(9), t(1)], 9, 1), null);
}

// 7) preserva o objeto, nao so o id (a UI depende dos campos da tarefa)
{
  const order = [{ id: 1, title: "a" }, { id: 2, title: "b" }];
  const res = reorderWithinFilter(order, order, 2, 1);
  ok("preserva o objeto", res && res[0].title, "b");
}

// 8) nao muta a entrada
{
  const order = [t(1), t(2), t(3)];
  reorderWithinFilter(order, order, 3, 1);
  ok("entrada intacta", ids(order), [1, 2, 3]);
}

console.log(falhas === 0 ? "\nTUDO OK" : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
```

- [ ] **Step 2: Rodar o harness e ver falhar**

O `reorder.js` ainda não existe (nem o `.ts` de origem).

Run (uma linha, no diretório do projeto; `<scratch>` é o diretório de scratchpad da sessão):
`node "<scratch>/check-reorder.mjs"`
Expected: FALHA com `ERR_MODULE_NOT_FOUND` para `./reorder.js`.

- [ ] **Step 3: Implementar a função**

Criar `src/lib/tasks/reorder.ts`:

```ts
/**
 * Reordenação de tarefas com filtro ativo (sugestão 2).
 *
 * A coluna `tasks.position` é uma ordem GLOBAL por usuário. Quando a lista
 * está filtrada (por categoria ou por status), arrastar não pode reescrever a
 * lista inteira: a regra é permutar apenas as posições que os itens VISÍVEIS já
 * ocupavam na ordem global. Quem está escondido pelo filtro não se move.
 *
 *   antes:  [0]A  [1]casa-1  [2]B  [3]casa-2  [4]casa-3  [5]C
 *   visível: casa-1, casa-2, casa-3 (slots 1, 3 e 4)
 *   ação:   arrastar casa-3 para o topo da lista visível
 *   depois: [0]A  [1]casa-3  [2]B  [3]casa-1  [4]casa-2  [5]C
 *
 * Sem imports de propósito: é lógica pura, exercitável isolada.
 */
export function reorderWithinFilter<T extends { id: number }>(
  order: T[],
  shown: T[],
  activeId: number,
  overId: number
): T[] | null {
  if (activeId === overId) return null;

  const de = shown.findIndex((item) => item.id === activeId);
  const para = shown.findIndex((item) => item.id === overId);
  if (de < 0 || para < 0) return null;

  // Os slots que os visíveis ocupam na ordem global, em ordem crescente.
  const slots: number[] = [];
  for (const item of shown) {
    const slot = order.findIndex((o) => o.id === item.id);
    if (slot < 0) return null; // shown tem item que não está em order
    slots.push(slot);
  }
  slots.sort((a, b) => a - b);

  // Move dentro da lista visível, sem mutar a entrada.
  const movidos = [...shown];
  const [arrastado] = movidos.splice(de, 1);
  movidos.splice(para, 0, arrastado);

  // Escreve os visíveis de volta nos mesmos slots.
  const proxima = [...order];
  slots.forEach((slot, i) => {
    proxima[slot] = movidos[i];
  });

  // Rede de segurança: a lista global vai inteira para o servidor, então um id
  // perdido ou duplicado viraria perda de dado. Se acontecer, aborta.
  if (proxima.length !== order.length) return null;
  const antes = new Set(order.map((o) => o.id));
  const depois = new Set(proxima.map((o) => o.id));
  if (depois.size !== antes.size) return null;
  for (const id of antes) if (!depois.has(id)) return null;

  return proxima;
}
```

- [ ] **Step 4: Compilar o arquivo e rodar o harness**

O projeto não tem runner de TS. Usar o `tsc` local para gerar o `.js` ao lado do harness. O arquivo não tem imports, então compila isolado, sem os aliases `@/` do `tsconfig`.

Run (uma linha):
`npx tsc src/lib/tasks/reorder.ts --outDir "<scratch>" --target es2022 --module esnext`

Expected: sem saída (sucesso). Gera `<scratch>/reorder.js`.

Run: `node "<scratch>/check-reorder.mjs"`
Expected: 8 linhas `ok` e `TUDO OK`, com código de saída 0.

Se algum caso falhar, corrigir `src/lib/tasks/reorder.ts` e repetir os dois comandos. Não seguir para o commit com falha.

- [ ] **Step 5: Build do projeto**

Run: `npm run build`
Expected: `✓ Compiled successfully`. O arquivo novo ainda não tem consumidor, então o build só prova que compila em strict mode.

- [ ] **Step 6: Limpar e commitar**

Apagar `<scratch>/check-reorder.mjs` e `<scratch>/reorder.js` (são de sessão, nunca entram no repo). Conferir que `git status` não lista nada fora de `src/lib/tasks/reorder.ts`.

```bash
git add src/lib/tasks/reorder.ts
git commit -m "feat(tarefas): funcao pura de reordenacao com filtro ativo"
```

---

### Task 3: Ligar a reordenação filtrada na UI (sugestão 2, parte 2)

**Files:**
- Modify: `src/components/tasks/tasks-view.tsx` (linhas 22, 54, 106-120, 204-227, e o componente `SortableTask` em 235-276)

**Interfaces:**
- Consumes: `reorderWithinFilter<T extends { id: number }>(order, shown, activeId, overId): T[] | null` da Task 2, e a Server Action `reorderTasks(ids: unknown)` que já existe em `src/lib/actions/task.ts` (recebe a lista completa de ids na ordem nova).
- Produces: nada para tarefas posteriores.

- [ ] **Step 1: Importar a função e apagar o bloqueio**

No import de actions (linha 22), adicionar o import da função pura logo abaixo:

```tsx
import { deleteTask, setTaskStatus, reorderTasks } from "@/lib/actions/task";
import { reorderWithinFilter } from "@/lib/tasks/reorder";
```

Apagar a linha 54 inteira, com o comentário:

```tsx
  // reordenar só quando nenhum filtro está ativo (ordem = lista completa)
  const canReorder = filter === "all" && catFilter === "all";
```

- [ ] **Step 2: `onDragEnd` sobre a lista visível**

Substituir a função `onDragEnd` (linhas 106-120) por:

```tsx
  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    // A lista pode estar filtrada: reordena entre os visíveis e devolve a ordem
    // global, sem tirar do lugar quem o filtro esconde.
    const next = reorderWithinFilter(order, shown, Number(active.id), Number(over.id));
    if (!next) return;
    setOrder(next); // otimista
    try {
      await reorderTasks(next.map((t) => t.id));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao reordenar");
      setOrder(tasks); // reverte
    }
  }
```

Nota para quem implementa: `active.id` do dnd-kit é `string | number` e os ids das tarefas são `number` (é o `id` que vai em `SortableContext items`), por isso o `Number(...)`. O `arrayMove` do `@dnd-kit/sortable` deixa de ser usado aqui; se o import dele ficar sem uso, o lint acusa, então remover `arrayMove` da lista de imports do `@dnd-kit/sortable` (mantendo `SortableContext`, `verticalListSortingStrategy` e `useSortable`).

- [ ] **Step 3: Tirar o `canReorder` do render e do SortableTask**

Na lista (linha 217), remover a prop:

```tsx
                    onToggle={() => toggle(t)}
```

ou seja, apagar a linha `canReorder={canReorder}` de dentro do `<SortableTask ... />`.

Em `SortableTask`, remover `canReorder` dos parâmetros e do tipo, deixar o `useSortable` sem `disabled` e a alça sempre visível:

```tsx
function SortableTask({
  t,
  category,
  done,
  overdue,
  onToggle,
  onEdit,
  onRemove,
}: {
  t: Task;
  category: TaskCategory | null;
  done: boolean;
  overdue: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: t.id,
  });
```

E o bloco da alça deixa de ser condicional:

```tsx
      <button
        type="button"
        className="mt-0.5 cursor-grab touch-none text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
        title="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: `✓ Compiled successfully`. Erro provável se algo escapou: `'canReorder' is declared but its value is never read` ou `arrayMove is defined but never used`. Corrigir e repetir.

- [ ] **Step 5: Conferir no navegador (app logado)**

`preview_start {name: "dev"}`, abrir `/tarefas`. Precisa de sessão e de pelo menos 4 tarefas, sendo 2 ou mais numa categoria. Se não houver, criar pela UI.

Roteiro:
1. Sem filtro, arrastar uma tarefa e confirmar que a ordem muda e persiste depois de `F5`.
2. Filtrar uma categoria, confirmar que **a alça aparece** (antes desaparecia), arrastar o último visível para o topo, `F5`, confirmar que a ordem filtrada se manteve.
3. Limpar o filtro e confirmar que as tarefas de fora da categoria continuam nas mesmas posições relativas de antes.
4. Filtrar por status (Pendentes) e repetir o arrasto, confirmando que funciona igual.

Checagem programática da ordem persistida, útil para o relato:

```js
[...document.querySelectorAll('main h3')].map(h => h.textContent)
```

Se a sessão do navegador não permitir chegar em `/tarefas`, **não** declarar verificado: relatar que a prova ficou na verificação do dono e que o comportamento da lógica está coberto pelo harness da Task 2.

- [ ] **Step 6: Commit**

```bash
git add src/components/tasks/tasks-view.tsx
git commit -m "feat(tarefas): permite reordenar com filtro de categoria ou status ativo (sugestao 2)"
```

---

### Task 4: Botão "Entrar com Google" no /login (sugestão 1, parte 1)

**Files:**
- Create: `src/lib/auth/webview.ts`
- Create: `src/components/auth/google-button.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Test: harness temporário `<scratchpad>/check-webview.mjs` para o detector de user-agent, apagado no fim.

**Interfaces:**
- Consumes: `createClient()` de `src/lib/supabase/client.ts` (cliente de navegador, publishable key).
- Produces:
  - `isWebViewUA(ua: string | null | undefined): boolean` em `src/lib/auth/webview.ts`;
  - `<GoogleButton />` em `src/components/auth/google-button.tsx`, sem props, client component.

- [ ] **Step 1: Harness do detector de user-agent**

Criar `<scratch>/check-webview.mjs`:

```js
import { isWebViewUA } from "./webview.js";

let falhas = 0;
function ok(nome, real, esperado) {
  if (real === esperado) return console.log(`ok   ${nome}`);
  falhas++;
  console.log(`FALHA ${nome}: esperado ${esperado}, real ${real}`);
}

// APK novo, com o token proprio do capacitor.config.ts
ok("token proprio", isWebViewUA("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 ZeniteApp"), true);
// APK que ja esta instalado hoje: WebView do Android marca "; wv)"
ok("android webview", isWebViewUA("Mozilla/5.0 (Linux; Android 14; SM-A536E Build/UP1A; wv) AppleWebKit/537.36 Version/4.0 Chrome/120 Mobile Safari/537.36"), true);
// Navegadores de verdade
ok("chrome android", isWebViewUA("Mozilla/5.0 (Linux; Android 14; SM-A536E) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"), false);
ok("safari ios", isWebViewUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1"), false);
ok("chrome desktop", isWebViewUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"), false);
// Ausencia de UA nao pode esconder o botao na web
ok("sem ua", isWebViewUA(null), false);
ok("vazio", isWebViewUA(""), false);

console.log(falhas === 0 ? "\nTUDO OK" : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node "<scratch>/check-webview.mjs"`
Expected: FALHA com `ERR_MODULE_NOT_FOUND` para `./webview.js`.

- [ ] **Step 3: Implementar o detector**

Criar `src/lib/auth/webview.ts`:

```ts
/**
 * Detecta o WebView do app Android (Capacitor) pela string de user-agent.
 *
 * Por que existe: o Google recusa o fluxo OAuth dentro de WebView
 * ("disallowed_useragent"), então o botão de entrar com Google não deve
 * aparecer no APK. A decisão é tomada no servidor (a página /login é dinâmica),
 * o que evita flash e descasamento de hidratação.
 *
 * Dois sinais, de propósito:
 *  1. "ZeniteApp", token próprio adicionado em capacitor.config.ts
 *     (appendUserAgent). Determinístico, mas só vale a partir do próximo APK.
 *  2. "; wv)", marca do WebView do Android, que cobre o APK já instalado.
 *
 * Na dúvida (sem user-agent), devolve false: melhor mostrar o botão na web do
 * que escondê-lo de quem consegue usá-lo.
 */
export function isWebViewUA(ua: string | null | undefined): boolean {
  if (!ua) return false;
  if (ua.includes("ZeniteApp")) return true;
  return /;\s*wv\)/i.test(ua);
}
```

- [ ] **Step 4: Compilar e rodar o harness**

Run: `npx tsc src/lib/auth/webview.ts --outDir "<scratch>" --target es2022 --module esnext`
Expected: sem saída.

Run: `node "<scratch>/check-webview.mjs"`
Expected: 7 linhas `ok` e `TUDO OK`.

- [ ] **Step 5: O botão**

Criar `src/components/auth/google-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/**
 * "Entrar com Google" (Supabase Auth, provider Google).
 *
 * IMPORTANTE: tem que ser navegação do cliente, NÃO Server Action com redirect.
 * A CSP do projeto tem `form-action 'self'`, e o Chrome aplica essa diretiva à
 * cadeia de redirect depois de um submit de formulário, então um redirect para
 * accounts.google.com saindo de action seria bloqueado pelo navegador.
 * Por isso este botão fica FORA do <form> do login (dentro dele, um clique
 * submeteria o login por senha).
 */
export function GoogleButton() {
  const [busy, setBusy] = useState(false);

  async function entrar() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        toast.error(error.message);
        setBusy(false);
      }
      // Sucesso: o navegador sai da página. Não mexe no estado.
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o login do Google");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={entrar}
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
    >
      <GoogleG />
      {busy ? "Abrindo o Google..." : "Entrar com Google"}
    </button>
  );
}

/** G do Google nas 4 cores oficiais. Inline, porque a CSP não permite SVG externo. */
function GoogleG() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
```

- [ ] **Step 6: Renderizar no /login, decidido no servidor**

Em `src/app/(auth)/login/page.tsx`, adicionar os imports:

```tsx
import { headers } from "next/headers";
import { GoogleButton } from "@/components/auth/google-button";
import { isWebViewUA } from "@/lib/auth/webview";
```

Dentro do componente, depois do `const { error, message } = await searchParams;`:

```tsx
  // O botão do Google só entra quando o provider está configurado (interruptor
  // de env) e fora do WebView do APK, onde o Google recusa o fluxo OAuth.
  const ua = (await headers()).get("user-agent");
  const mostrarGoogle =
    process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ON === "1" && !isWebViewUA(ua);
```

E, entre o parágrafo de mensagem e o `<form>` (ou seja, antes de `<form className="mt-6 space-y-4">`), o bloco:

```tsx
          {mostrarGoogle && (
            <div className="mt-6 space-y-4">
              <GoogleButton />
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}
```

Nota: o `<form>` logo abaixo já tem `mt-6`. Com o bloco acima presente, o espaçamento fica confortável; não mudar o `mt-6` do form.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: `✓ Compiled successfully`. A rota `/login` já era dinâmica (usa `searchParams`), então `headers()` não muda o modo de renderização.

- [ ] **Step 8: Conferir no navegador**

`preview_start {name: "dev"}` e abrir `/login`.

1. Sem `NEXT_PUBLIC_GOOGLE_LOGIN_ON` no `.env.local`: o botão **não** aparece. Confirmar com `document.body.innerText.includes("Entrar com Google") === false`.
2. Setar `NEXT_PUBLIC_GOOGLE_LOGIN_ON=1` no `.env.local`, reiniciar o dev server, recarregar: o botão aparece acima do divisor "ou". Confirmar que o botão está **fora** do form:
   ```js
   (() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Entrar com Google')); return { existe: !!b, dentroDeForm: !!b?.closest('form') }; })()
   ```
   Expected: `{ existe: true, dentroDeForm: false }`.
3. Clicar não é exercitável sem o provider configurado no Supabase. Se clicar, o esperado é um `toast` com a mensagem do Supabase (provider desabilitado), o que **também é uma verificação válida** do tratamento de erro. Relatar o que aconteceu de fato.

- [ ] **Step 9: Limpar e commitar**

Apagar `<scratch>/check-webview.mjs` e `<scratch>/webview.js`. Não commitar `.env.local` (não é versionado).

```bash
git add src/lib/auth/webview.ts src/components/auth/google-button.tsx src/app/\(auth\)/login/page.tsx
git commit -m "feat(auth): botao entrar com Google no login, escondido no WebView do APK"
```

---

### Task 5: `ensureProfile` no callback do OAuth (sugestão 1, parte 2)

**Files:**
- Create: `src/lib/auth/ensure-profile.ts`
- Modify: `src/app/api/auth/callback/route.ts`

**Interfaces:**
- Consumes: `createClient()` de `src/lib/supabase/server.ts`.
- Produces: `ensureProfile(supabase: SupabaseServerClient, user: User): Promise<void>`, onde `SupabaseServerClient = Awaited<ReturnType<typeof createClient>>`. Nunca lança: só registra no log e devolve.

- [ ] **Step 1: Implementar**

Criar `src/lib/auth/ensure-profile.ts`:

```ts
import "server-only";
import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Origem do nosso Storage. Avatar de fora dela é descartado (a CSP barraria). */
const ORIGEM_SUPABASE = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://qlqewlrzjlbwrybwrimt.supabase.co"
).origin;

/**
 * Nome de exibição a partir do metadata do usuário.
 *
 * O gatilho `handle_new_user` (migração 0005) lê `display_name`, que é o que o
 * nosso cadastro manda. O Google manda `full_name` e `name`, então um usuário
 * criado pelo login Google cairia no app com a saudação vazia.
 */
function nomeDoMetadata(user: User): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  for (const chave of ["display_name", "full_name", "name"] as const) {
    const valor = meta[chave];
    if (typeof valor === "string" && valor.trim().length > 0) return valor.trim();
  }
  const local = user.email?.split("@")[0]?.trim();
  return local && local.length > 0 ? local : null;
}

/**
 * Aceita só avatar servido pelo nosso Storage. O Google manda a URL do
 * googleusercontent.com, que a CSP (`img-src 'self' data: blob: <supabase>`)
 * barra, resultando em avatar quebrado. Descartar é melhor que abrir domínio
 * externo na CSP.
 */
function avatarAceito(url: unknown): boolean {
  if (typeof url !== "string" || url.length === 0) return false;
  try {
    return new URL(url).origin === ORIGEM_SUPABASE;
  } catch {
    return false;
  }
}

/**
 * Roda depois de trocar o código por sessão (login Google ou vinculação de
 * identidade). Idempotente: em conta já completa, não escreve nada. Nunca
 * lança, porque falhar aqui não pode impedir o login.
 */
export async function ensureProfile(
  supabase: SupabaseServerClient,
  user: User
): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("ensureProfile: leitura falhou:", error.message);
    return;
  }

  // Sem linha: o gatilho não rodou (ex.: migração 0005 ausente). Cria o mínimo.
  if (!data) {
    const { error: erroInsert } = await supabase
      .from("profiles")
      .insert({ id: user.id, display_name: nomeDoMetadata(user), avatar_url: null });
    if (erroInsert) console.error("ensureProfile: insert falhou:", erroInsert.message);
    return;
  }

  const patch: { display_name?: string; avatar_url?: null } = {};
  if (!data.display_name) {
    const nome = nomeDoMetadata(user);
    if (nome) patch.display_name = nome;
  }
  if (data.avatar_url && !avatarAceito(data.avatar_url)) patch.avatar_url = null;

  if (Object.keys(patch).length === 0) return;

  const { error: erroUpdate } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
  if (erroUpdate) console.error("ensureProfile: update falhou:", erroUpdate.message);
}
```

- [ ] **Step 2: Chamar no callback**

Em `src/app/api/auth/callback/route.ts`, adicionar o import:

```ts
import { ensureProfile } from "@/lib/auth/ensure-profile";
```

E substituir o trecho da troca do código:

```ts
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(fail);

  return NextResponse.redirect(new URL(next, req.url));
```

por:

```ts
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(fail);

  // Login Google: o gatilho do banco não conhece os campos de metadata do
  // Google, e a foto de lá seria barrada pela CSP. Completa o que falta.
  // Não pode derrubar o login: ensureProfile trata os próprios erros.
  if (data.user) await ensureProfile(supabase, data.user);

  return NextResponse.redirect(new URL(next, req.url));
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ Compiled successfully`. Se o tipo de `data.user` reclamar, conferir que o import de `User` vem de `@supabase/supabase-js`.

- [ ] **Step 4: Conferir que o fluxo de senha não regrediu**

O mesmo callback serve à recuperação de senha, então essa é a regressão a vigiar. Sem provider do Google configurado, o exercício possível é o caminho de erro:

`preview_start {name: "dev"}`, abrir `/api/auth/callback` sem parâmetros.
Expected: redirect para `/login?error=Link%20inv%C3%A1lido%20ou%20expirado` (o `!code` continua barrando antes de qualquer coisa).

Confirmar por `read_network_requests` ou pela URL final da aba. O fluxo completo de reset (com e-mail real) fica na verificação do dono, junto com a configuração de Redirect URLs.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/ensure-profile.ts src/app/api/auth/callback/route.ts
git commit -m "feat(auth): completa o perfil apos login OAuth e descarta avatar externo"
```

---

### Task 6: Seção "Conta Google" no /perfil (sugestão 1, parte 3)

**Files:**
- Create: `src/components/profile/google-identity.tsx`
- Modify: `src/app/(app)/perfil/page.tsx`

**Interfaces:**
- Consumes: `createClient()` de `src/lib/supabase/client.ts`; `getUserIdentities`, `linkIdentity` e `unlinkIdentity` do `@supabase/auth-js` (confirmados na versão instalada).
- Produces: `<GoogleIdentity />`, sem props, client component.

- [ ] **Step 1: O componente**

Criar `src/components/profile/google-identity.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import type { UserIdentity } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Vincular a conta Google à conta ATUAL (não é login, é linkIdentity).
 *
 * Por que existe: todos os dados do app são por `user_id`. Se o login Google
 * criasse um usuário novo, o app abriria vazio. Vinculando a identidade aqui,
 * o "Entrar com Google" passa a cair sempre no mesmo usuário.
 *
 * Exige "Manual linking" ligado no painel do Supabase (Authentication).
 */
export function GoogleIdentity() {
  const [carregando, setCarregando] = useState(true);
  const [busy, setBusy] = useState(false);
  const [identidades, setIdentidades] = useState<UserIdentity[]>([]);

  const carregar = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUserIdentities();
    if (error) {
      toast.error(error.message);
      setCarregando(false);
      return;
    }
    setIdentidades(data?.identities ?? []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const google = identidades.find((i) => i.provider === "google");

  async function vincular() {
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/perfil`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        toast.error(error.message);
        setBusy(false);
      }
      // Sucesso: sai da página para o Google.
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível abrir o Google");
      setBusy(false);
    }
  }

  async function desvincular() {
    if (!google) return;
    // Trava de segurança: sem outra identidade, desvincular tranca o dono fora.
    if (identidades.length < 2) {
      toast.error("Esta é a única forma de entrar na conta. Defina uma senha antes de desvincular.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.unlinkIdentity(google);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Conta Google desvinculada.");
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível desvincular");
    } finally {
      setBusy(false);
    }
  }

  if (carregando) return null;

  if (google) {
    const email =
      typeof google.identity_data?.email === "string" ? google.identity_data.email : "conta Google";
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground">
          Vinculada: <span className="font-medium">{email}</span>
        </p>
        <button
          onClick={desvincular}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
        >
          <Unlink className="h-4 w-4" /> {busy ? "Desvinculando..." : "Desvincular"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={vincular}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    >
      <Link2 className="h-4 w-4" /> {busy ? "Abrindo o Google..." : "Vincular conta Google"}
    </button>
  );
}
```

- [ ] **Step 2: A seção na página**

Em `src/app/(app)/perfil/page.tsx`, adicionar o import:

```tsx
import { GoogleIdentity } from "@/components/profile/google-identity";
```

E, entre a seção "Trocar senha" e a seção "Notificações", no mesmo padrão de card:

```tsx
      {process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ON === "1" && (
        <Reveal>
          <div className="glass rounded-2xl border border-border p-6">
            <h2 className="font-semibold">Conta Google</h2>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">
              Vincule para entrar com o Google nesta mesma conta, com os seus dados.
            </p>
            <GoogleIdentity />
          </div>
        </Reveal>
      )}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Conferir no navegador**

Com `NEXT_PUBLIC_GOOGLE_LOGIN_ON=1` e sessão ativa, abrir `/perfil`:

1. A seção "Conta Google" aparece entre "Trocar senha" e "Notificações", com o botão Vincular.
2. Sem `NEXT_PUBLIC_GOOGLE_LOGIN_ON`, a seção não existe.
3. Clicar em Vincular sem o provider configurado no Supabase deve mostrar `toast` com a mensagem do Supabase, não quebrar a página. Conferir também `read_console_messages` limpo de erro não tratado.

O caminho felizmente completo (vincular de verdade, ver o e-mail, desvincular) depende da configuração do dono e fica na verificação dele.

- [ ] **Step 5: Commit**

```bash
git add src/components/profile/google-identity.tsx src/app/\(app\)/perfil/page.tsx
git commit -m "feat(auth): secao Conta Google no perfil (vincular e desvincular)"
```

---

### Task 7: Token de UA no APK, HANDOFF e fechamento da onda

**Files:**
- Modify: `capacitor.config.ts`
- Modify: `HANDOFF.md`

**Interfaces:**
- Consumes: `isWebViewUA` da Task 4 (o token daqui é o sinal 1 dela).
- Produces: nada em código.

- [ ] **Step 1: O token de user-agent**

Em `capacitor.config.ts`, dentro de `android`:

```ts
  android: {
    backgroundColor: "#080b12",
    // Marca o WebView do app no user-agent. É o sinal determinístico que o
    // isWebViewUA (src/lib/auth/webview.ts) usa para esconder o botão de login
    // com Google, que o Google recusa em WebView. Só vale a partir do próximo
    // APK gerado; até lá o detector cai no heurístico "; wv)".
    appendUserAgent: "ZeniteApp",
  },
```

- [ ] **Step 2: Registrar a Onda 17 no HANDOFF**

Duas edições em `HANDOFF.md`:

1. A data do topo, hoje `**Atualizado: 2026-07-27.**`, vira `**Atualizado: 2026-07-29.**`.
2. Na seção 2 ("Estado atual"), acrescentar a linha da Onda 17.
3. Depois de "### 3.17 Onda 16 ...", acrescentar a seção nova:

```markdown
### 3.18 Onda 17: login com Google, ordem de tarefas por filtro e centralização das abas — 2026-07-29
Três sugestões novas do dono (chegaram por chat: a tabela `suggestions` estava inacessível na
sessão, o classificador do harness ficou intermitente). Spec em
`docs/superpowers/specs/2026-07-29-onda17-login-google-ordem-tarefas-centralizacao-design.md`,
plano em `docs/superpowers/plans/2026-07-29-onda17-google-ordem-centralizacao.md`.
**Sem migração.**

- **Centralização das abas:** existia só em /financas (`mx-auto max-w-7xl`); as outras páginas
  tinham largura máxima SEM `mx-auto` e encostavam na esquerda. Agora a coluna do app é definida
  uma vez no `(app)/layout.tsx` (`mx-auto w-full max-w-7xl`), cada rota centraliza sua largura de
  leitura com `mx-auto` no wrapper externo, e /financas abriu mão da largura própria (virou papel
  do layout, resultado visual idêntico). Efeito colateral bem-vindo: o calendário, que não tinha
  teto de largura, passou a respeitar a coluna. Não se tocou nos `min-w-0 flex-1` do `<main>`
  (correção da #32).
- **Ordem de tarefas com filtro:** o bloqueio era explícito (`canReorder = filter === "all" &&
  catFilter === "all"`). Como `tasks.position` é ordem GLOBAL por usuário, a solução não precisou
  de migração nem de mudança na Server Action: a função pura `reorderWithinFilter`
  (`src/lib/tasks/reorder.ts`) permuta apenas os slots que os itens visíveis já ocupavam, deixando
  os escondidos parados, e valida que nenhum id se perdeu antes de deixar salvar. A alça passou a
  aparecer com qualquer filtro, inclusive o de status.
- **Login com Google:** provider do Supabase Auth, separado do Google Calendário (que segue com
  OAuth próprio e tokens em `google_accounts`). Peças: `components/auth/google-button.tsx`
  (client, `signInWithOAuth`), seção "Conta Google" no /perfil
  (`components/profile/google-identity.tsx`, `linkIdentity`/`unlinkIdentity`),
  `lib/auth/ensure-profile.ts` no callback e `lib/auth/webview.ts`.
  - *Decisão que evita perder dados:* vincular a identidade no /perfil antes de usar o botão
    garante o MESMO `user_id`. Login Google criando usuário novo abriria o app vazio.
  - *Cuidado com a CSP:* o botão tem que ser navegação do cliente, NUNCA Server Action com
    redirect, porque `form-action 'self'` faz o Chrome barrar a cadeia de redirect para
    accounts.google.com depois de um submit de formulário.
  - *Avatar:* o Google manda a URL do googleusercontent.com, que a CSP (`img-src`) barraria. O
    `ensureProfile` descarta avatar de fora do nosso Storage e preenche o nome a partir de
    `full_name`/`name` (o gatilho `handle_new_user` só conhece `display_name`).
  - *APK Android:* o Google recusa OAuth em WebView, então o botão é escondido lá, decidido no
    servidor pelo user-agent. `capacitor.config.ts` ganhou `appendUserAgent: "ZeniteApp"` (sinal
    determinístico, válido do próximo APK em diante) e o detector também cobre o `; wv)` do APK
    já instalado.
  - *Interruptor:* o botão e a seção só aparecem com `NEXT_PUBLIC_GOOGLE_LOGIN_ON=1`, para o
    código poder subir antes da configuração.
- **Pendente do dono:** (a) Google Cloud, adicionar o redirect
  `https://qlqewlrzjlbwrybwrimt.supabase.co/auth/v1/callback` no cliente válido; (b) Supabase,
  Authentication, ligar o provider Google com Client ID e Secret, ligar **Manual linking** e
  conferir a allowlist de Redirect URLs; (c) setar `NEXT_PUBLIC_GOOGLE_LOGIN_ON=1` na Vercel e no
  `.env.local`; (d) testar na ordem: entrar por senha, vincular no /perfil, sair, entrar com
  Google e confirmar que os dados aparecem (prova do mesmo `user_id`); (e) marcar as três
  sugestões como feito em /admin/sugestoes.
```

- [ ] **Step 3: Varredura de travessão e build final**

Run: `rg "—|–" src`
Expected: nenhuma ocorrência nova em string de UI. (O `HANDOFF.md` está fora de `src` e o histórico dele já usa travessão nos títulos, o que não é texto de UI.)

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add capacitor.config.ts HANDOFF.md
git commit -m "docs: registra a Onda 17 no HANDOFF e marca o WebView no user-agent"
```

- [ ] **Step 5: Fechamento**

Não fazer merge nem push por conta própria. Relatar ao dono:

1. o que foi verificado por medição e o que ficou por conta dele (login Google, que exige a configuração);
2. a lista de ações dele (seção 7 da spec);
3. que a branch `feat/onda17-google-ordem-centralizacao` está pronta para revisão, merge na `main` e push (a Vercel publica sozinha).

---

## Self-review deste plano

- **Cobertura da spec:** seção 3 da spec (centralização) na Task 1, incluindo a tabela arquivo por arquivo e o calendário; seção 4 (ordem de tarefas) nas Tasks 2 e 3, com a função pura e a ligação na UI; seção 5 (login Google) nas Tasks 4, 5 e 6, cobrindo 5.2 (botão), 5.3 (vincular), 5.4 (callback e perfil), 5.5 (WebView, com o `capacitor.config.ts` na Task 7) e 5.6 (interruptor de env); seção 6 (validação) distribuída nos passos de build, medição e varredura; seção 7 (ação do dono) no fechamento da Task 7 e no HANDOFF; seção 8 (pendências operacionais) registrada nas Global Constraints e no HANDOFF.
- **Sem placeholder:** todo passo que mexe em código tem o código exato. Onde não é exercitável aqui (fluxo real do Google), o plano manda dizer o que não foi verificado em vez de presumir.
- **Consistência de tipos:** `reorderWithinFilter<T extends { id: number }>(order, shown, activeId, overId): T[] | null` é definida na Task 2 e consumida com essa mesma assinatura na Task 3, com `Number(active.id)` porque o dnd-kit entrega `string | number`. `isWebViewUA(ua: string | null | undefined): boolean` é definida na Task 4 e consumida na mesma tarefa (`headers().get("user-agent")` devolve `string | null`) e citada na Task 7. `ensureProfile(supabase, user)` é definida na Task 5 com `SupabaseServerClient = Awaited<ReturnType<typeof createClient>>` e consumida no callback da mesma tarefa. `GoogleButton` e `GoogleIdentity` não recebem props em nenhum ponto.
