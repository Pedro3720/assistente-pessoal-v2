# Melhorias v3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar os itens 3–10: tarefas instantâneas, upload de foto corrigido, editar cartão, cartão com parcelamento e 5 valores, modal por cima (portal), aba de Sugestões, verificação do Google, e CRUD de categorias.

**Architecture:** Peças compartilhadas primeiro (`Modal` via portal, `resizeImage`, `bodySizeLimit`), depois cada item. Segue os padrões: Server Components leem (`lib/data/*`), Server Actions mutam (`lib/actions/*`, "use server", Zod, `user_id` via `auth.getUser()`, `revalidatePath`), tipos em `types/*`, Zod em `lib/validation/*`, RLS `own_rows`.

**Tech Stack:** Next.js 16.2.9 (App Router), React 19.2.4, TS strict, Tailwind v4, `@supabase/ssr` + `supabase-js`, Zod, lucide-react, sonner, `react-dom` (createPortal).

## Global Constraints

- **Projeto alvo:** `C:\Projetos\assistente-pessoal-v2` (Git Bash: `/c/Projetos/assistente-pessoal-v2`). O shell dos subagentes abre em OUTRA pasta — usar caminhos absolutos e `cd /c/Projetos/assistente-pessoal-v2 && <cmd>` sempre.
- **Branch de trabalho:** `feat/melhorias-v3` (criada no Setup). Commitar nela.
- **NÃO tocar** em `.env.local` nem `CONTEXT.md`.
- **TS strict, sem `any`.** Componentes pequenos. Regra de negócio fora do JSX.
- **Mutação client:** Server Action + (otimista ou `router.refresh()`) + `toast` em erro.
- **AGENTS.md:** este Next.js foge do treino — **antes de codar rotas/Server Actions/config, ler `node_modules/next/dist/docs/`** e ajustar a API à versão. (Passo explícito nas tasks 1, 9, 10.)
- **Sem framework de testes no repo.** Gate por task = **`npm run build` passa** (TS strict) + verificação manual descrita. Commits frequentes.
- **Migrações são aplicadas MANUALMENTE** no SQL Editor do Supabase. Entregar o SQL; a task não roda SQL.
- **Reutilizar** `formatBRL`/`parseBRL` (`lib/money.ts`), `shiftMonth`/`currentYearMonth`/`monthBounds` (`lib/dates.ts`), `uploadAvatarFile` (→ generalizado), `public.set_updated_at()`. Não duplicar.
- **UI pt-BR.** Visual: `glass card-glow rounded-2xl border border-border`, `.num`, `<Reveal>`, `<CountUp>`, variantes `dark:`.

## Setup (uma vez, antes da Task 1)

- [ ] Criar branch a partir de `main` atualizada:

```bash
cd /c/Projetos/assistente-pessoal-v2
git checkout main && git pull --ff-only
git checkout -b feat/melhorias-v3
```

## File Structure

**Criar:**
- `src/components/ui/modal.tsx` — modal genérico via `createPortal` (§Task 1).
- `src/lib/images.ts` — `resizeImage` (client) (§Task 1).
- `src/lib/storage/upload.ts` — `uploadImageFile(supabase, bucket, userId, file)` (§Task 9).
- `src/types/suggestion.ts`, `src/lib/validation/suggestion.ts`, `src/lib/data/suggestion.ts`, `src/lib/actions/suggestion.ts` (§Task 9).
- `src/app/(app)/sugestoes/page.tsx`, `src/components/suggestions/suggestions-view.tsx` (§Task 10).
- `src/components/finance/category-manager.tsx` (§Task 6).
- `supabase/migrations/20260701000007_tx_installments.sql` (§Task 7).
- `supabase/migrations/20260701000008_suggestions.sql` (§Task 9).

**Modificar:**
- `next.config.ts` — `bodySizeLimit` (§Task 1).
- `src/components/finance/transactions-section.tsx` — portal (§Task 2) + campo Parcelas + delete de grupo (§Task 8).
- `src/components/tasks/tasks-view.tsx` — otimista (§Task 3).
- `src/components/profile/avatar-picker.tsx` — resize + DataTransfer (§Task 4).
- `src/components/finance/card-manager.tsx` — editar (§Task 5) + 5 valores (§Task 8).
- `src/lib/actions/finance.ts` — `updateCategory` (§Task 6), `createInstallmentPurchase`/`deleteTransactionGroup` (§Task 7).
- `src/lib/validation/finance.ts` — `installmentInput` (§Task 7).
- `src/types/finance.ts` — campos de parcela + valores do cartão (§Task 7).
- `src/lib/data/finance.ts` — cálculo dos 5 valores (§Task 7).
- `src/lib/storage/avatar.ts` — passa a reexportar de `upload.ts` (§Task 9).
- `src/components/layout/sidebar.tsx` — item "Sugestões" (§Task 10).
- `src/app/(app)/financas/page.tsx` — botão do gerenciador de categorias (§Task 6).

---

### Task 1: Peças compartilhadas (Modal portal, resizeImage, bodySizeLimit)

**Files:**
- Create: `src/components/ui/modal.tsx`
- Create: `src/lib/images.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Produces:
  - `Modal({ onClose, title, children }: { onClose: () => void; title?: string; children: React.ReactNode })` — client, portal para `document.body`.
  - `resizeImage(file: File, max?: number, q?: number): Promise<File>` — client.

- [ ] **Step 1: Ler doc de config do Next**

Conferir em `node_modules/next/dist/docs/` onde vai `serverActions.bodySizeLimit` na 16.2.9 (esperado `experimental.serverActions.bodySizeLimit`). Ajustar o Step 4 se divergir.

- [ ] **Step 2: Criar `src/components/ui/modal.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Modal genérico renderizado via portal no <body>, para escapar de ancestrais
 * com transform/backdrop-filter (Reveal/glass) que prendem `position: fixed`.
 */
export function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-popover p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 3: Criar `src/lib/images.ts`**

```ts
/**
 * Reduz uma imagem no navegador (lado máximo `max` px) e exporta como JPEG File,
 * para caber no limite de corpo das Server Actions e economizar storage.
 * Client-only (usa document/canvas). Em falha, devolve o arquivo original.
 */
export async function resizeImage(file: File, max = 512, q = 0.85): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new window.Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Imagem inválida"));
    i.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", q)
  );
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
```

- [ ] **Step 4: Modificar `next.config.ts`**

Manter `images.remotePatterns` e adicionar o limite de Server Action. Resultado:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "qlqewlrzjlbwrybwrimt.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 5: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro (os arquivos novos ainda não são importados; tipam mesmo assim).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/modal.tsx src/lib/images.ts next.config.ts
git commit -m "feat(ui): Modal via portal, resizeImage e bodySizeLimit"
```

---

### Task 2: Modal de transação via portal (#7)

**Files:**
- Modify: `src/components/finance/transactions-section.tsx`

**Interfaces:**
- Consumes: `Modal` (Task 1).

- [ ] **Step 1: Importar o Modal**

Adicionar no topo de `transactions-section.tsx`:

```tsx
import { Modal } from "@/components/ui/modal";
```

- [ ] **Step 2: Substituir o overlay inline pelo Modal**

Trocar TODO o bloco `{open && ( <div className="fixed inset-0 z-50 …"> … </div> )}` (o overlay externo + o container branco + o header com o `<X>`) por um `<Modal>`. O conteúdo do formulário (a partir de `<div className="mt-6 space-y-4">` … até o botão Salvar) é mantido igual. Resultado do bloco:

```tsx
      {open && (
        <Modal onClose={() => setOpen(false)} title={`${editingId ? "Editar" : "Nova"} Transação`}>
          <div className="space-y-4">
            {/* tipo */}
            <div className="grid grid-cols-2 gap-2">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setType(t);
                    setCategoryId("");
                    if (t === "income") {
                      setCardId("");
                      setIsCardPayment(false);
                    }
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? t === "expense"
                        ? "border border-red-300 bg-red-50 text-red-600"
                        : "border border-green-300 bg-green-50 text-green-700"
                      : "border border-border bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {t === "expense" ? "Despesa" : "Receita"}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Descrição</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Mercado do mês"
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Valor (R$)</label>
              <MoneyInput value={amount} onChange={setAmount} />
            </div>

            {type === "expense" && (
              <label className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={isCardPayment}
                  onChange={(e) => {
                    setIsCardPayment(e.target.checked);
                    if (e.target.checked) setCategoryId("");
                  }}
                  className="accent-primary"
                />
                É pagamento de fatura de cartão
              </label>
            )}

            {!isCardPayment && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Categoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                >
                  <option value="">Sem categoria</option>
                  {kindCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {type === "expense" && cards.length > 0 && (
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  {isCardPayment ? "Cartão pago" : "Cartão (compra)"}
                </label>
                <select
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                >
                  <option value="">{isCardPayment ? "Selecione o cartão" : "Sem cartão"}</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {isCardPayment ? ` — fatura ${formatBRL(c.invoice)}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Conta</label>
              <select
                value={isPurchase ? "" : bankId}
                disabled={isPurchase}
                onChange={(e) => setBankId(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">{isPurchase ? "— compra vai para a fatura —" : "Sem conta"}</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.icon} {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
              />
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="mt-2 w-full rounded-lg bg-primary py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Salvar transação"}
            </button>
          </div>
        </Modal>
      )}
```

> Nota: o campo "Parcelas" será inserido neste formulário na Task 8. Não adicionar agora.

- [ ] **Step 3: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro.

- [ ] **Step 4: Verificação manual**

`npm run dev` → `/financas` → "Nova". Esperado: o modal abre **centralizado e por cima** de todos os cards (não mais atrás), com backdrop; fecha no X, no clique fora e no ESC.

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/transactions-section.tsx
git commit -m "fix(financas): modal de transacao via portal, por cima dos cards (#7)"
```

---

### Task 3: Tarefas otimistas (#3)

**Files:**
- Modify: `src/components/tasks/tasks-view.tsx`

**Interfaces:**
- Consumes: `setTaskStatus`, `deleteTask` (já existem).

- [ ] **Step 1: Substituir `toggle` e `remove` por versões otimistas**

Trocar as funções atuais `toggle` e `remove` (em `tasks-view.tsx`) por:

```tsx
  async function toggle(t: Task) {
    const next: TaskStatus = t.status === "completed" ? "pending" : "completed";
    setOrder((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x))); // otimista
    try {
      await setTaskStatus(t.id, next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
      setOrder(tasks); // reverte
      router.refresh();
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta tarefa?")) return;
    const snapshot = order;
    setOrder((prev) => prev.filter((x) => x.id !== id)); // otimista
    try {
      await deleteTask(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
      setOrder(snapshot); // reverte
      router.refresh();
    }
  }
```

> `counts` é derivado de `tasks` (props) e só reconcilia no próximo refresh — aceitável; a lista `shown` usa `order` e muda na hora. Não chamar `router.refresh()` no caminho de sucesso (o `useEffect([orderKey])` já reconcilia quando o servidor revalida via a Server Action).

- [ ] **Step 2: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro.

- [ ] **Step 3: Verificação manual**

`/tarefas` → clicar o círculo de concluir e o lixeira. Esperado: a mudança aparece **na hora** (sem espera perceptível). Em erro simulado, reverte com toast.

- [ ] **Step 4: Commit**

```bash
git add src/components/tasks/tasks-view.tsx
git commit -m "perf(tarefas): concluir/excluir com atualizacao otimista (#3)"
```

---

### Task 4: Upload de foto com resize (#4)

**Files:**
- Modify: `src/components/profile/avatar-picker.tsx`

**Interfaces:**
- Consumes: `resizeImage` (Task 1).

- [ ] **Step 1: Importar resizeImage e tornar `onFile` async com resize + DataTransfer**

Em `avatar-picker.tsx`, adicionar o import:

```tsx
import { resizeImage } from "@/lib/images";
```

E substituir a função `onFile` por:

```tsx
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPresetUrl(null); // foto própria vence o preset
    try {
      const small = await resizeImage(f, 512, 0.85);
      // injeta o arquivo reduzido de volta no input, para o form enviar o pequeno
      if (fileRef.current) {
        const dt = new DataTransfer();
        dt.items.add(small);
        fileRef.current.files = dt.files;
      }
      setPreview(URL.createObjectURL(small));
    } catch {
      setPreview(URL.createObjectURL(f)); // fallback: usa o original
    }
  }
```

> O `<input type="file" name="avatar_file">` e o resto do componente ficam iguais; agora o arquivo enviado já está reduzido (< 1MB), então a Server Action `updateProfile` não estoura mais o limite.

- [ ] **Step 2: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro.

- [ ] **Step 3: Verificação manual**

`/perfil` → "Enviar foto" com uma foto grande do PC (> 2MB) → Salvar. Esperado: salva sem "An unexpected response was received from the server"; o avatar aparece na sidebar após recarregar.

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/avatar-picker.tsx
git commit -m "fix(perfil): redimensiona a foto no navegador antes do upload (#4)"
```

---

### Task 5: Editar cartão de crédito (#5)

**Files:**
- Modify: `src/components/finance/card-manager.tsx`

**Interfaces:**
- Consumes: `updateCard(id, input)` (já existe em `lib/actions/finance.ts`).

- [ ] **Step 1: Estado de edição + botão de editar**

Em `card-manager.tsx`:

1. Import: trocar `import { createCard, deleteCard } from "@/lib/actions/finance";` por
   `import { createCard, updateCard, deleteCard } from "@/lib/actions/finance";` e adicionar `Pencil` ao import de `lucide-react` (`import { Plus, Trash2, X, CreditCard, Pencil } from "lucide-react";`).
2. Adicionar estado `const [editingId, setEditingId] = useState<number | null>(null);` (perto dos outros `useState`).
3. Substituir `reset()` e `save()` e adicionar `openEdit()`:

```tsx
  function reset() {
    setName(""); setBankId(""); setLimit(""); setOpening("");
    setClosing(""); setDue(""); setColor(CARD_COLORS[0]);
    setAdding(false); setEditingId(null);
  }

  function openEdit(card: CardWithInvoice) {
    setEditingId(card.id);
    setName(card.name);
    setBankId(card.bank_id ? String(card.bank_id) : "");
    setLimit(card.credit_limit ? formatBRL(card.credit_limit).replace("R$", "").trim() : "");
    setOpening(card.opening_invoice ? formatBRL(card.opening_invoice).replace("R$", "").trim() : "");
    setClosing(card.closing_day ? String(card.closing_day) : "");
    setDue(card.due_day ? String(card.due_day) : "");
    setColor(card.color);
    setAdding(true);
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const input = {
      name: name.trim(),
      bank_id: bankId ? Number(bankId) : null,
      credit_limit: parseBRL(limit) || 0,
      opening_invoice: parseBRL(opening) || 0,
      closing_day: closing ? Number(closing) : null,
      due_day: due ? Number(due) : null,
      color,
    };
    try {
      if (editingId) await updateCard(editingId, input);
      else await createCard(input);
      reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar cartão");
    } finally {
      setSaving(false);
    }
  }
```

> `formatBRL(x).replace("R$","").trim()` devolve algo como `"5.500,00"`, que o `MoneyInput` exibe e o `parseBRL` relê corretamente.

4. No título do formulário e no botão, refletir criar/editar. Trocar o texto do botão de salvar de `{saving ? "Salvando..." : "Criar cartão"}` por `{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar cartão"}`.

5. Adicionar o botão de editar ao lado do lixeira em cada cartão. Trocar o bloco do botão de excluir por:

```tsx
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => openEdit(card)}
                      className="rounded p-1.5 text-muted-foreground hover:text-primary"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remove(card.id)}
                      className="rounded p-1.5 text-muted-foreground hover:text-red-500"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
```

- [ ] **Step 2: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro.

- [ ] **Step 3: Verificação manual**

`/financas` → lápis num cartão → muda nome/limite/dias → "Salvar alterações". Esperado: persiste e a lista atualiza.

- [ ] **Step 4: Commit**

```bash
git add src/components/finance/card-manager.tsx
git commit -m "feat(financas): editar cartao de credito (#5)"
```

---

### Task 6: CRUD de categorias (#10)

**Files:**
- Modify: `src/lib/actions/finance.ts`
- Create: `src/components/finance/category-manager.tsx`
- Modify: `src/app/(app)/financas/page.tsx`

**Interfaces:**
- Consumes: `Modal` (Task 1); `createCategory`, `deleteCategory` (já existem); `Category` type.
- Produces: `updateCategory(id, raw)` em `lib/actions/finance.ts`.

- [ ] **Step 1: Adicionar `updateCategory` e endurecer `deleteCategory`**

Em `lib/actions/finance.ts`, logo após `deleteCategory`, e ajustando-a:

```ts
export async function updateCategory(id: number, raw: unknown) {
  const input = categoryInput.partial().parse(raw);
  const { supabase } = await ctx();
  const { error } = await supabase.from("categories").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}
```

E substituir a `deleteCategory` atual por uma que desvincula as transações antes (evita falha de FK caso não seja `on delete set null`):

```ts
export async function deleteCategory(id: number) {
  const { supabase } = await ctx();
  await supabase.from("transactions").update({ category_id: null }).eq("category_id", id);
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}
```

- [ ] **Step 2: Criar `src/components/finance/category-manager.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/finance";
import type { Category, TxType } from "@/types/finance";

export function CategoryManager({
  categories,
  onClose,
}: {
  categories: Category[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📌");
  const [kind, setKind] = useState<TxType>("expense");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");

  async function add() {
    if (!name.trim()) return;
    try {
      await createCategory({ name: name.trim(), icon: icon || "📌", kind });
      setName(""); setIcon("📌");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    }
  }

  async function saveEdit(id: number) {
    try {
      await updateCategory(id, { name: editName.trim(), icon: editIcon || "📌" });
      setEditingId(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta categoria? As transações ficam sem categoria.")) return;
    try {
      await deleteCategory(id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  const list = (k: TxType) => categories.filter((c) => c.kind === k);

  return (
    <Modal onClose={onClose} title="Categorias">
      <div className="space-y-5">
        {/* adicionar */}
        <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
          <div className="flex gap-2">
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              maxLength={2}
              className="w-12 rounded-lg border border-border bg-muted px-2 py-2 text-center text-sm"
              placeholder="📌"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da categoria"
              className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            {(["expense", "income"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  kind === k ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground"
                }`}
              >
                {k === "expense" ? "Despesa" : "Receita"}
              </button>
            ))}
          </div>
          <button
            onClick={add}
            disabled={!name.trim()}
            className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>

        {/* listas */}
        {(["expense", "income"] as const).map((k) => (
          <div key={k} className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {k === "expense" ? "Despesas" : "Receitas"}
            </p>
            {list(k).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma.</p>
            ) : (
              list(k).map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                  {editingId === c.id ? (
                    <>
                      <input
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        maxLength={2}
                        className="w-10 rounded border border-border bg-muted px-1 py-1 text-center text-sm"
                      />
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded border border-border bg-muted px-2 py-1 text-sm"
                      />
                      <button onClick={() => saveEdit(c.id)} className="p-1 text-green-600" title="Salvar">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground" title="Cancelar">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-base">{c.icon}</span>
                      <span className="flex-1 truncate text-sm">{c.name}</span>
                      <button
                        onClick={() => { setEditingId(c.id); setEditName(c.name); setEditIcon(c.icon); }}
                        className="p-1 text-muted-foreground hover:text-primary"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(c.id)} className="p-1 text-muted-foreground hover:text-red-500" title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Botão do gerenciador na página de Finanças**

Em `src/app/(app)/financas/page.tsx`, o card "Despesas por categoria" é um Server Component. Para abrir o modal (client), criar um pequeno wrapper client OU adicionar o botão via um client component. Abordagem mínima: criar `src/components/finance/category-manager-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Tags } from "lucide-react";
import { CategoryManager } from "./category-manager";
import type { Category } from "@/types/finance";

export function CategoryManagerButton({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
      >
        <Tags className="h-3.5 w-3.5" /> Gerenciar
      </button>
      {open && <CategoryManager categories={categories} onClose={() => setOpen(false)} />}
    </>
  );
}
```

E em `financas/page.tsx`, importar e colocar o botão no cabeçalho do card "Despesas por categoria". Trocar:

```tsx
        <div className="glass card-glow rounded-2xl border border-border p-5">
          <h3 className="font-semibold">Despesas por categoria</h3>
```

por (adicionando o import `import { CategoryManagerButton } from "@/components/finance/category-manager-button";` no topo):

```tsx
        <div className="glass card-glow rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Despesas por categoria</h3>
            <CategoryManagerButton categories={categories} />
          </div>
```

- [ ] **Step 4: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro.

- [ ] **Step 5: Verificação manual**

`/financas` → "Gerenciar" (no card de categorias) → criar categoria (despesa e receita), renomear, trocar ícone e excluir. Esperado: tudo persiste; a nova categoria aparece no select de Nova Transação.

- [ ] **Step 6: Commit**

```bash
git add src/lib/actions/finance.ts src/components/finance/category-manager.tsx src/components/finance/category-manager-button.tsx src/app/\(app\)/financas/page.tsx
git commit -m "feat(financas): CRUD de categorias (#10)"
```

---

### Task 7: Cartão parcelado — dados e cálculo (#6, parte 1)

**Files:**
- Create: `supabase/migrations/20260701000007_tx_installments.sql`
- Modify: `src/types/finance.ts`
- Modify: `src/lib/validation/finance.ts`
- Modify: `src/lib/actions/finance.ts`
- Modify: `src/lib/data/finance.ts`

**Interfaces:**
- Consumes: `shiftMonth`, `currentYearMonth` (`lib/dates.ts`).
- Produces:
  - `Transaction` ganha `purchase_group: string | null; installments: number; installment_no: number`.
  - `CardWithInvoice` ganha `fatura_mes: number; em_aberto: number; utilizado_total: number; disponivel: number` (mantém `invoice`).
  - `installmentInput` (Zod). `createInstallmentPurchase(raw)`, `deleteTransactionGroup(group: string)`.

- [ ] **Step 1: Ler doc (Server Actions) e escrever a migração `20260701000007_tx_installments.sql`**

```sql
-- Migração 0007: parcelamento de compras no cartão
alter table public.transactions add column if not exists purchase_group uuid;
alter table public.transactions add column if not exists installments  int not null default 1;
alter table public.transactions add column if not exists installment_no int not null default 1;
create index if not exists tx_purchase_group_idx on public.transactions (purchase_group);
notify pgrst, 'reload schema';
```

- [ ] **Step 2: Tipos em `src/types/finance.ts`**

No `interface Transaction`, adicionar ao final dos campos:

```ts
  purchase_group: string | null;
  installments: number;
  installment_no: number;
```

E trocar `CardWithInvoice` por:

```ts
/** Cartão com os valores de fatura/limite calculados. */
export interface CardWithInvoice extends CreditCard {
  invoice: number;        // = fatura_mes (compat)
  fatura_mes: number;     // a pagar este mês
  em_aberto: number;      // parcelas de meses futuros
  utilizado_total: number;// total consumindo limite
  disponivel: number;     // credit_limit - utilizado_total
}
```

- [ ] **Step 3: `installmentInput` em `src/lib/validation/finance.ts`**

Adicionar ao final:

```ts
export const installmentInput = transactionInput.extend({
  installments: z.number().int().min(1).max(48).default(1),
});
export type InstallmentInput = z.infer<typeof installmentInput>;
```

- [ ] **Step 4: Actions em `src/lib/actions/finance.ts`**

Adicionar os imports no topo (junto aos existentes):

```ts
import { randomUUID } from "node:crypto";
import { shiftMonth } from "@/lib/dates";
import { installmentInput } from "@/lib/validation/finance";
```

E adicionar as actions (perto das de transações):

```ts
export async function createInstallmentPurchase(raw: unknown) {
  const parsed = installmentInput.parse(raw);
  const { installments, ...core } = parsed;
  const base = normalizeTx(core);

  if (installments <= 1 || !base.card_id || base.type !== "expense" || base.is_card_payment) {
    // sem parcelamento: comporta como transação normal
    const { supabase, userId } = await ctx();
    const { error } = await supabase.from("transactions").insert({ ...base, user_id: userId });
    if (error) throw new Error(error.message);
    revalidate();
    return;
  }

  const { supabase, userId } = await ctx();
  const { data: card } = await supabase
    .from("credit_cards")
    .select("closing_day")
    .eq("id", base.card_id)
    .single();
  const closingDay = (card?.closing_day as number | null) ?? null;

  const cents = Math.round(base.amount * 100);
  const per = Math.floor(cents / installments);
  const group = randomUUID();
  const [oy, om, od] = base.occurred_on.split("-").map(Number);
  const first = closingDay && od > closingDay ? shiftMonth(oy, om, 1) : { year: oy, month: om };

  const rows = Array.from({ length: installments }, (_, i) => {
    const k = i + 1;
    const amountCents = k === installments ? cents - per * (installments - 1) : per;
    const bm = shiftMonth(first.year, first.month, k - 1);
    const occurred_on = `${bm.year}-${String(bm.month).padStart(2, "0")}-01`;
    return {
      ...base,
      amount: amountCents / 100,
      occurred_on,
      description: `${base.description} (${k}/${installments})`,
      purchase_group: group,
      installments,
      installment_no: k,
      user_id: userId,
    };
  });

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteTransactionGroup(group: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("transactions").delete().eq("purchase_group", group);
  if (error) throw new Error(error.message);
  revalidate();
}
```

- [ ] **Step 5: Cálculo dos 5 valores em `src/lib/data/finance.ts`**

1. Incluir `occurred_on` no select de `allTx`. Trocar:

```ts
    supabase
      .from("transactions")
      .select("id,amount,type,bank_id,card_id,is_card_payment"),
```

por:

```ts
    supabase
      .from("transactions")
      .select("id,amount,type,bank_id,card_id,is_card_payment,occurred_on"),
```

e ajustar o `Pick<...>` de `allTx` para incluir `"occurred_on"`.

2. Importar helper de mês: no topo, `import { monthBounds, currentYearMonth } from "@/lib/dates";` (já importa `monthBounds`; adicionar `currentYearMonth`).

3. Trocar o bloco `const cards: CardWithInvoice[] = cardsRaw.map(...)` por:

```ts
  const { year: cy, month: cm } = currentYearMonth();
  const curKey = cy * 12 + (cm - 1);
  const billingKey = (occurred_on: string) => {
    const [yy, mm] = occurred_on.split("-").map(Number);
    return yy * 12 + (mm - 1);
  };

  const cards: CardWithInvoice[] = cardsRaw.map((c) => {
    let utilizado = num(c.opening_invoice);
    let faturaMes = num(c.opening_invoice);
    for (const t of allTx) {
      if (t.card_id !== c.id || t.type !== "expense") continue;
      const delta = t.is_card_payment ? -num(t.amount) : num(t.amount);
      utilizado += delta;
      if (t.is_card_payment || billingKey(t.occurred_on) <= curKey) faturaMes += delta;
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
    };
  });
```

- [ ] **Step 6: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro. (A migração ainda não está aplicada; o build só checa tipos. Os novos campos em `Transaction` são lidos via `select("*")` no mês — ok.)

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260701000007_tx_installments.sql src/types/finance.ts src/lib/validation/finance.ts src/lib/actions/finance.ts src/lib/data/finance.ts
git commit -m "feat(financas): parcelamento e calculo de fatura/em aberto/utilizado/disponivel (#6 dados)"
```

> **Passo manual do usuário:** rodar `20260701000007_tx_installments.sql` no SQL Editor.

---

### Task 8: Cartão parcelado — UI (#6, parte 2)

**Files:**
- Modify: `src/components/finance/card-manager.tsx`
- Modify: `src/components/finance/transactions-section.tsx`

**Interfaces:**
- Consumes: `CardWithInvoice` (novos campos), `createInstallmentPurchase`, `deleteTransactionGroup` (Task 7).

- [ ] **Step 1: Exibir os 5 valores no `card-manager.tsx`**

Trocar o cálculo `usePct` e o bloco de exibição por cartão. Substituir:

```tsx
            const usePct = card.credit_limit
              ? Math.min((card.invoice / card.credit_limit) * 100, 100)
              : 0;
```

por:

```tsx
            const usePct = card.credit_limit
              ? Math.min((card.utilizado_total / card.credit_limit) * 100, 100)
              : 0;
```

E trocar o bloco (de `<div className="flex items-center justify-between"> <span ...>Fatura a pagar</span> ...` até o fechamento antes de `</div>` do cartão) por:

```tsx
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fatura a pagar (este mês)</span>
                  <span className={`num text-lg font-bold ${card.fatura_mes > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                    {formatBRL(card.fatura_mes)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Em aberto (próximas) <span className="num text-foreground">{formatBRL(card.em_aberto)}</span></span>
                  <span>Utilizado <span className="num text-foreground">{formatBRL(card.utilizado_total)}</span></span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                  <div className="bar-grow h-1.5 rounded-full bg-primary" style={{ width: `${usePct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Disponível <span className={`num ${card.disponivel < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>{formatBRL(card.disponivel)}</span></span>
                  <span>Limite total <span className="num text-foreground">{formatBRL(card.credit_limit)}</span></span>
                </div>
```

- [ ] **Step 2: Campo "Parcelas" + envio parcelado no `transactions-section.tsx`**

1. Import: trocar a linha de import das actions para incluir as novas:

```tsx
import {
  createTransaction, updateTransaction, deleteTransaction,
  ensureDefaultCategories, createInstallmentPurchase, deleteTransactionGroup,
} from "@/lib/actions/finance";
```

2. Estado: adicionar `const [parcelas, setParcelas] = useState("1");` junto aos outros estados do modal. No `reset()`, adicionar `setParcelas("1");`.

3. Campo de UI: dentro do `<Modal>` (Task 2), logo após o campo "Valor (R$)" e apenas quando `isPurchase`, inserir:

```tsx
            {isPurchase && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Parcelas</label>
                <input
                  type="number"
                  min={1}
                  max={48}
                  value={parcelas}
                  onChange={(e) => setParcelas(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
                />
                {Number(parcelas) > 1 && parseBRL(amount) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {parcelas}x de {formatBRL(parseBRL(amount) / Number(parcelas))} · 1ª parcela na fatura, o resto em aberto
                  </p>
                )}
              </div>
            )}
```

4. `save()`: no ramo de criação (quando `!editingId`), usar parcelamento se for compra parcelada. Trocar:

```tsx
      if (editingId) await updateTransaction(editingId, input);
      else await createTransaction(input);
```

por:

```tsx
      if (editingId) {
        await updateTransaction(editingId, input);
      } else if (isPurchase && Number(parcelas) > 1) {
        await createInstallmentPurchase({ ...input, installments: Number(parcelas) });
      } else {
        await createTransaction(input);
      }
```

> Editar uma transação continua editando só aquela linha (parcela). Não há parcelamento na edição.

5. Excluir compra parcelada: trocar `remove(id)` para excluir o grupo quando houver `purchase_group`:

```tsx
  async function remove(id: number) {
    const t = transactions.find((x) => x.id === id);
    try {
      if (t?.purchase_group) {
        if (!confirm("Excluir a compra parcelada inteira (todas as parcelas)?")) return;
        await deleteTransactionGroup(t.purchase_group);
      } else {
        await deleteTransaction(id);
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }
```

- [ ] **Step 3: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro.

- [ ] **Step 4: Verificação manual (com a migração 0007 aplicada)**

`/financas` → Nova → Despesa → escolher um cartão (compra) → Valor R$ 1.200,00 → Parcelas 6 → Salvar.
Esperado: no cartão, **Fatura a pagar ≈ R$ 200,00**, **Em aberto ≈ R$ 1.000,00**, **Utilizado R$ 1.200,00**, **Disponível = limite − 1.200**. A lista mostra a parcela "(1/6)" no mês atual; excluir pede confirmação da compra inteira.

- [ ] **Step 5: Commit**

```bash
git add src/components/finance/card-manager.tsx src/components/finance/transactions-section.tsx
git commit -m "feat(financas): UI de parcelas e 5 valores do cartao (#6 ui)"
```

---

### Task 9: Sugestões — banco, storage e backend (#8, parte 1)

**Files:**
- Create: `supabase/migrations/20260701000008_suggestions.sql`
- Create: `src/lib/storage/upload.ts`
- Modify: `src/lib/storage/avatar.ts`
- Create: `src/types/suggestion.ts`
- Create: `src/lib/validation/suggestion.ts`
- Create: `src/lib/data/suggestion.ts`
- Create: `src/lib/actions/suggestion.ts`

**Interfaces:**
- Produces: `uploadImageFile(supabase, bucket, userId, file)`; `Suggestion` type; `getSuggestions()`; `createSuggestion(formData)`, `setSuggestionStatus(id, status)`, `deleteSuggestion(id)`.

- [ ] **Step 1: Ler doc (Server Actions/upload) e escrever a migração `20260701000008_suggestions.sql`**

```sql
-- Migração 0008: sugestões de melhorias + bucket de prints
create table if not exists public.suggestions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  image_url   text,
  status      text not null default 'aberto' check (status in ('aberto','feito')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists suggestions_user_idx on public.suggestions (user_id);

drop trigger if exists suggestions_set_updated_at on public.suggestions;
create trigger suggestions_set_updated_at before update on public.suggestions
  for each row execute function public.set_updated_at();

alter table public.suggestions enable row level security;
drop policy if exists "own_rows" on public.suggestions;
create policy "own_rows" on public.suggestions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('suggestions','suggestions', true)
  on conflict (id) do nothing;
drop policy if exists "sugg_public_read" on storage.objects;
create policy "sugg_public_read" on storage.objects for select using (bucket_id = 'suggestions');
drop policy if exists "sugg_own_write" on storage.objects;
create policy "sugg_own_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'suggestions' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Criar `src/lib/storage/upload.ts` (generaliza o avatar)**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

/** Sobe uma imagem para {bucket}/{userId}/... e devolve a URL pública. */
export async function uploadImageFile(
  supabase: SupabaseClient,
  bucket: string,
  userId: string,
  file: File
): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/${Date.now()}.${ext || "jpg"}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 3: `src/lib/storage/avatar.ts` passa a reusar `uploadImageFile`**

Substituir o conteúdo por:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadImageFile } from "./upload";

/** Sobe a foto para avatars/{userId}/... e devolve a URL pública. */
export function uploadAvatarFile(supabase: SupabaseClient, userId: string, file: File): Promise<string> {
  return uploadImageFile(supabase, "avatars", userId, file);
}
```

- [ ] **Step 4: `src/types/suggestion.ts`**

```ts
export type SuggestionStatus = "aberto" | "feito";

export interface Suggestion {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  status: SuggestionStatus;
  created_at: string;
}
```

- [ ] **Step 5: `src/lib/validation/suggestion.ts`**

```ts
import { z } from "zod";

export const suggestionInput = z.object({
  title: z.string().trim().min(1, "Informe um título"),
  description: z.string().trim().nullable().default(null),
  image_url: z.string().trim().nullable().default(null),
});
export const suggestionStatus = z.enum(["aberto", "feito"]);
```

- [ ] **Step 6: `src/lib/data/suggestion.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import type { Suggestion } from "@/types/suggestion";

export async function getSuggestions(): Promise<Suggestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suggestions")
    .select("id, title, description, image_url, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Suggestion[];
}
```

- [ ] **Step 7: `src/lib/actions/suggestion.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { suggestionInput, suggestionStatus } from "@/lib/validation/suggestion";
import { uploadImageFile } from "@/lib/storage/upload";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, userId: user.id };
}

export async function createSuggestion(formData: FormData): Promise<void> {
  const { supabase, userId } = await ctx();

  let image_url: string | null = null;
  const file = formData.get("image_file");
  if (file instanceof File && file.size > 0) {
    image_url = await uploadImageFile(supabase, "suggestions", userId, file);
  }

  const input = suggestionInput.parse({
    title: formData.get("title"),
    description: (formData.get("description") as string) || null,
    image_url,
  });

  const { error } = await supabase.from("suggestions").insert({ ...input, user_id: userId });
  if (error) throw new Error(error.message);
  revalidatePath("/sugestoes");
}

export async function setSuggestionStatus(id: number, status: unknown): Promise<void> {
  const value = suggestionStatus.parse(status);
  const { supabase } = await ctx();
  const { error } = await supabase.from("suggestions").update({ status: value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/sugestoes");
}

export async function deleteSuggestion(id: number): Promise<void> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("suggestions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/sugestoes");
}
```

- [ ] **Step 8: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro. (`uploadAvatarFile` mantém a assinatura; `actions/auth.ts` e `actions/profile.ts` seguem compilando.)

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260701000008_suggestions.sql src/lib/storage/upload.ts src/lib/storage/avatar.ts src/types/suggestion.ts src/lib/validation/suggestion.ts src/lib/data/suggestion.ts src/lib/actions/suggestion.ts
git commit -m "feat(sugestoes): tabela, storage e backend (#8 dados)"
```

> **Passo manual do usuário:** rodar `20260701000008_suggestions.sql` no SQL Editor.

---

### Task 10: Sugestões — página e navegação (#8, parte 2)

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Create: `src/app/(app)/sugestoes/page.tsx`
- Create: `src/components/suggestions/suggestions-view.tsx`

**Interfaces:**
- Consumes: `getSuggestions`, `createSuggestion`, `setSuggestionStatus`, `deleteSuggestion`, `resizeImage`, `Suggestion`.

- [ ] **Step 1: Item "Sugestões" na sidebar**

Em `src/components/layout/sidebar.tsx`: adicionar `Lightbulb` ao import de `lucide-react` e um item ao array `navItems` (após "Senhas"):

```tsx
  { href: "/sugestoes", label: "Sugestões", icon: Lightbulb },
```

(Ler o arquivo para localizar o array `navItems` exato antes de editar.)

- [ ] **Step 2: Criar `src/components/suggestions/suggestions-view.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2, Check, RotateCcw, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { resizeImage } from "@/lib/images";
import { createSuggestion, setSuggestionStatus, deleteSuggestion } from "@/lib/actions/suggestion";
import { formatDateBR } from "@/lib/dates";
import type { Suggestion } from "@/types/suggestion";

export function SuggestionsView({ suggestions }: { suggestions: Suggestion[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const small = await resizeImage(f, 1024, 0.85);
      const dt = new DataTransfer();
      dt.items.add(small);
      e.target.files = dt.files;
    } catch {
      /* usa original */
    }
  }

  async function action(formData: FormData) {
    setSaving(true);
    try {
      await createSuggestion(formData);
      toast.success("Sugestão registrada");
      (document.getElementById("sugg-form") as HTMLFormElement | null)?.reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(s: Suggestion) {
    try {
      await setSuggestionStatus(s.id, s.status === "feito" ? "aberto" : "feito");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta sugestão?")) return;
    try {
      await deleteSuggestion(id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <form id="sugg-form" action={action} className="glass card-glow space-y-4 rounded-2xl border border-border p-6">
        <div className="space-y-1.5">
          <label htmlFor="title" className="text-sm font-medium">Título</label>
          <Input id="title" name="title" placeholder="Resumo da melhoria/problema" required />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium">Descrição</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Explique o que gostaria de melhorar…"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">
            <Paperclip className="h-4 w-4" /> Anexar print
            <input type="file" name="image_file" accept="image/*" className="hidden" onChange={onImage} />
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {saving ? "Enviando..." : "Registrar sugestão"}
        </button>
      </form>

      <div className="space-y-3">
        {suggestions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Nenhuma sugestão ainda.</p>
        ) : (
          suggestions.map((s) => (
            <div key={s.id} className="glass card-glow rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.status === "feito" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                      {s.status === "feito" ? "Feito" : "Aberto"}
                    </span>
                    <h3 className={`truncate font-medium ${s.status === "feito" ? "line-through text-muted-foreground" : ""}`}>{s.title}</h3>
                  </div>
                  {s.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{s.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateBR(s.created_at.slice(0, 10))}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => toggle(s)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent" title={s.status === "feito" ? "Reabrir" : "Marcar feito"}>
                    {s.status === "feito" ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button onClick={() => remove(s.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-accent" title="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {s.image_url && (
                <a href={s.image_url} target="_blank" rel="noopener noreferrer" className="mt-3 block">
                  <Image src={s.image_url} alt="print" width={480} height={270} className="max-h-60 w-auto rounded-lg border border-border object-contain" unoptimized />
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Criar `src/app/(app)/sugestoes/page.tsx`**

```tsx
import { getSuggestions } from "@/lib/data/suggestion";
import { SuggestionsView } from "@/components/suggestions/suggestions-view";
import { Reveal } from "@/components/effects/reveal";

export default async function SugestoesPage() {
  const suggestions = await getSuggestions();
  return (
    <div className="max-w-3xl space-y-6">
      <Reveal>
        <h1 className="text-gradient text-4xl font-bold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
          Sugestões
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Registre melhorias e problemas com texto e print.</p>
      </Reveal>
      <SuggestionsView suggestions={suggestions} />
    </div>
  );
}
```

- [ ] **Step 4: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro; a rota `/sugestoes` aparece na lista.

- [ ] **Step 5: Verificação manual (com a migração 0008 aplicada)**

Sidebar → "Sugestões" → registrar uma sugestão com título, descrição e um print → aparece na lista com status "Aberto"; marcar "Feito" e excluir funcionam; o print abre em nova aba.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/sidebar.tsx src/app/\(app\)/sugestoes src/components/suggestions/suggestions-view.tsx
git commit -m "feat(sugestoes): pagina e item na sidebar (#8 ui)"
```

---

### Task 11: Google — verificação do seletor de conta (#9)

**Files:** nenhum código previsto (verificação). Se a investigação revelar um ajuste concreto, aplicá-lo aqui.

**Interfaces:** —

- [ ] **Step 1: Confirmar o código publicado**

Ler `src/app/api/google/connect/route.ts` e confirmar que `params` inclui `prompt: "select_account consent"` (deve incluir). Se por algum motivo não incluir, adicionar. Registrar no relatório o trecho exato.

- [ ] **Step 2: Documentar a verificação de produção (passos do usuário)**

Escrever no relatório (para o usuário conferir na Vercel/Google Cloud):
1. Vercel → Settings → Environment Variables: `GOOGLE_REDIRECT_URI` deve ser `https://<dominio-de-producao>/api/google/callback` (NÃO localhost); `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` presentes.
2. Google Cloud Console → OAuth Client → Authorized redirect URIs: incluir exatamente essa URL de produção.
3. Após confirmar, clicar "Conectar Google" no site publicado deve abrir a tela de escolha de conta (`select_account`). Se ainda pular com o código correto e o env correto, a causa é sessão única do Google no navegador — testar em aba anônima / com 2 contas Google logadas.

- [ ] **Step 3: Commit (se houve ajuste de código; senão, pular)**

```bash
git add src/app/api/google/connect/route.ts
git commit -m "chore(google): garantir prompt select_account no connect (#9)"
```

> Este item é majoritariamente verificação/config. Se o Step 1 confirmar que o código já força `select_account`, não há commit — apenas o relatório com os passos de produção para o usuário.

---

### Task 12: Verificação final

**Files:** nenhum.

- [ ] **Step 1: Build de produção limpo**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: sem erros de tipo.

- [ ] **Step 2: Checklist manual (migrações 0007 e 0008 aplicadas)**

`npm run dev`:
- #3 tarefa marca/exclui instantâneo.
- #4 foto grande do PC sobe sem erro.
- #5 editar cartão persiste.
- #6 compra 6x → Fatura a pagar (1ª), Em aberto (restante), Utilizado (total), Disponível (limite − utilizado).
- #7 modal de transação por cima dos cards.
- #8 criar/mark feito/excluir sugestão com print.
- #9 seletor de conta do Google (conforme Task 11).
- #10 criar/renomear/excluir categorias.

- [ ] **Step 3: Resumo dos passos manuais do usuário**

Confirmar com o usuário: rodou `0007_tx_installments.sql` e `0008_suggestions.sql`; conferiu env do Google na Vercel + redirect no Google Cloud (#9).

- [ ] **Step 4: Integrar o branch**

Usar `superpowers:finishing-a-development-branch` para decidir merge/PR de `feat/melhorias-v3`.

## Self-Review (autor do plano)

**Cobertura do spec:**
- #3 → Task 3. #4 → Task 4. #5 → Task 5. #6 → Tasks 7+8. #7 → Task 2. #8 → Tasks 9+10. #9 → Task 11. #10 → Task 6. Peças compartilhadas → Task 1. Verificação → Task 12. ✅
- Migrações 0007/0008 + passos manuais → Tasks 7, 9, 12. ✅

**Consistência de tipos/nomes:** `Modal({onClose,title,children})`, `resizeImage`, `uploadImageFile(supabase,bucket,userId,file)`, `uploadAvatarFile` (mantém assinatura), `CardWithInvoice.{fatura_mes,em_aberto,utilizado_total,disponivel,invoice}`, `createInstallmentPurchase`, `deleteTransactionGroup`, `installmentInput`, `Transaction.{purchase_group,installments,installment_no}`, `updateCategory`, `getSuggestions`/`createSuggestion`/`setSuggestionStatus`/`deleteSuggestion` — usados de forma consistente entre tasks. ✅

**Placeholders:** nenhum "TBD/TODO"; passos "ler node docs" são pesquisa real exigida pelo AGENTS.md. ✅
