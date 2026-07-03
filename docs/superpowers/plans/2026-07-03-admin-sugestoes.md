# Painel Admin de Sugestões — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma aba de administração onde só o dono (`ADMIN_EMAIL`) vê todas as sugestões de todos os usuários com o e-mail do autor, e pode marcar feito/aberto e excluir qualquer uma.

**Architecture:** Um cliente Supabase com service role (server-only), usado sempre atrás de `assertAdmin()`, lê/edita todas as sugestões bypassando o RLS. Página `/admin/sugestoes` protegida + link "Admin" na sidebar visível só para o admin. Sem migração de banco.

**Tech Stack:** Next.js 16.2.9 (App Router), React 19, TS strict, `@supabase/supabase-js` (service role), `@supabase/ssr`, `server-only`, lucide-react, sonner.

## Global Constraints

- **Projeto alvo:** `C:\Projetos\assistente-pessoal-v2` (Git Bash: `/c/Projetos/assistente-pessoal-v2`). O shell dos subagentes abre em OUTRA pasta — usar caminhos absolutos e `cd /c/Projetos/assistente-pessoal-v2 && <cmd>` sempre.
- **Branch de trabalho:** `feat/admin-sugestoes`. Commitar nela.
- **NÃO tocar** em `.env.local` nem `CONTEXT.md`. (A env `ADMIN_EMAIL` é adicionada pelo USUÁRIO, não pelo implementer.)
- **TS strict, sem `any`.** Componentes pequenos. Regra de negócio fora do JSX.
- **Service role só no servidor:** `src/lib/supabase/admin.ts` começa com `import "server-only";` e NUNCA é importado por client component. Todo acesso admin passa por `assertAdmin()` primeiro.
- **Mutação client:** Server Action + `router.refresh()` + `toast` em erro.
- **Sem framework de testes.** Gate por task = **`npm run build` passa** (TS strict) + verificação manual descrita. Commits frequentes.
- **Sem migração de banco** nesta feature (usa `suggestions` + bucket já existentes).
- **UI pt-BR.** Visual: `glass card-glow rounded-2xl border border-border`, `.num`, `<Reveal>`, variantes `dark:`.

## Setup (uma vez, antes da Task 1)

- [ ] Criar branch a partir de `main` atualizada:

```bash
cd /c/Projetos/assistente-pessoal-v2
git checkout main && git pull --ff-only
git checkout -b feat/admin-sugestoes
```

## File Structure

**Criar:**
- `src/lib/supabase/admin.ts` — `createAdminClient()` (service role, server-only).
- `src/lib/auth/admin.ts` — `isAdminEmail()`, `assertAdmin()`.
- `src/components/suggestions/admin-suggestions-view.tsx` — view client do painel.
- `src/app/(app)/admin/sugestoes/page.tsx` — página protegida.

**Modificar:**
- `src/types/suggestion.ts` — `SuggestionWithAuthor`.
- `src/lib/data/suggestion.ts` — `getAllSuggestions()`.
- `src/lib/actions/suggestion.ts` — `adminSetSuggestionStatus`, `adminDeleteSuggestion`.
- `src/app/(app)/layout.tsx` — calcular `isAdmin`, passar à Sidebar.
- `src/components/layout/sidebar.tsx` — prop `isAdmin`, item "Admin" condicional.

---

### Task 1: Infra de admin (service-role client + guarda)

**Files:**
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/auth/admin.ts`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server`.
- Produces:
  - `createAdminClient(): SupabaseClient` (service role, ignora RLS).
  - `isAdminEmail(email: string | null | undefined): boolean`
  - `assertAdmin(): Promise<void>` (throw "Acesso restrito" se não for admin).

- [ ] **Step 1: Garantir o pacote `server-only`**

Run: `cd /c/Projetos/assistente-pessoal-v2 && node -e "require.resolve('server-only')" && echo OK || npm install server-only`
Expected: imprime `OK` (o pacote acompanha o Next) ou instala. Se instalar, o commit inclui `package.json`/`package-lock.json`.

- [ ] **Step 2: Criar `src/lib/supabase/admin.ts`**

```ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a SERVICE ROLE — IGNORA o RLS. Use SOMENTE no servidor
 * e SEMPRE atrás de assertAdmin(). Nunca importar em client component.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
```

- [ ] **Step 3: Criar `src/lib/auth/admin.ts`**

```ts
import { createClient } from "@/lib/supabase/server";

/** true se o e-mail for o do dono (ADMIN_EMAIL), comparando sem caixa/espaços. */
export function isAdminEmail(email: string | null | undefined): boolean {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return !!admin && !!email && email.trim().toLowerCase() === admin;
}

/** Bloqueia se o usuário logado não for o admin. Use no início de toda leitura/ação admin. */
export async function assertAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) throw new Error("Acesso restrito");
}
```

- [ ] **Step 4: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro (arquivos novos ainda não importados; tipam mesmo assim).

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/admin.ts src/lib/auth/admin.ts package.json package-lock.json
git commit -m "feat(admin): cliente service-role e guarda assertAdmin"
```

> Se o Step 1 imprimiu `OK` (nada instalado), `package.json`/`package-lock.json` não existirão no stage — tudo bem, o `git add` os ignora.

---

### Task 2: Tipo, leitura de todas e ações de admin

**Files:**
- Modify: `src/types/suggestion.ts`
- Modify: `src/lib/data/suggestion.ts`
- Modify: `src/lib/actions/suggestion.ts`

**Interfaces:**
- Consumes: `createAdminClient` (Task 1), `assertAdmin` (Task 1), `suggestionStatus` (já existe em `validation/suggestion.ts`).
- Produces:
  - `SuggestionWithAuthor` (type).
  - `getAllSuggestions(): Promise<SuggestionWithAuthor[]>`
  - `adminSetSuggestionStatus(id: number, status: unknown): Promise<void>`
  - `adminDeleteSuggestion(id: number): Promise<void>`

- [ ] **Step 1: `SuggestionWithAuthor` em `src/types/suggestion.ts`**

Adicionar ao final do arquivo (mantém `Suggestion`/`SuggestionStatus` como estão):

```ts
export interface SuggestionWithAuthor extends Suggestion {
  author_email: string;
  author_name: string | null;
}
```

- [ ] **Step 2: `getAllSuggestions` em `src/lib/data/suggestion.ts`**

Adicionar os imports no topo (mantendo os existentes):

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/auth/admin";
import type { Suggestion, SuggestionWithAuthor } from "@/types/suggestion";
```

(Se o arquivo já importa `Suggestion`, apenas acrescente `SuggestionWithAuthor` ao import de tipos.)

E adicionar a função:

```ts
export async function getAllSuggestions(): Promise<SuggestionWithAuthor[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("suggestions")
    .select("id, user_id, title, description, image_url, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as (Suggestion & { user_id: string })[];

  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map<string, string>(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );

  const { data: profs } = await admin.from("profiles").select("id, display_name");
  const nameById = new Map<string, string | null>(
    ((profs ?? []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name])
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    image_url: r.image_url,
    status: r.status,
    created_at: r.created_at,
    author_email: emailById.get(r.user_id) || "—",
    author_name: nameById.get(r.user_id) ?? null,
  }));
}
```

- [ ] **Step 3: Ações admin em `src/lib/actions/suggestion.ts`**

Adicionar os imports (mantendo os existentes; `revalidatePath` e `suggestionStatus` já estão importados no arquivo):

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/auth/admin";
```

E adicionar as ações:

```ts
export async function adminSetSuggestionStatus(id: number, status: unknown): Promise<void> {
  await assertAdmin();
  const value = suggestionStatus.parse(status);
  const admin = createAdminClient();
  const { error } = await admin.from("suggestions").update({ status: value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/sugestoes");
}

export async function adminDeleteSuggestion(id: number): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("suggestions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/sugestoes");
}
```

- [ ] **Step 4: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro (sem `any`; `listUsers`/`.from` tipados via casts explícitos acima).

- [ ] **Step 5: Commit**

```bash
git add src/types/suggestion.ts src/lib/data/suggestion.ts src/lib/actions/suggestion.ts
git commit -m "feat(admin): getAllSuggestions com autor + acoes admin de status/excluir"
```

---

### Task 3: Página `/admin/sugestoes` + view

**Files:**
- Create: `src/components/suggestions/admin-suggestions-view.tsx`
- Create: `src/app/(app)/admin/sugestoes/page.tsx`

**Interfaces:**
- Consumes: `getAllSuggestions`, `adminSetSuggestionStatus`, `adminDeleteSuggestion` (Task 2), `isAdminEmail` (Task 1), `SuggestionWithAuthor`, `formatDateBR`, `Reveal`.

- [ ] **Step 1: Criar `src/components/suggestions/admin-suggestions-view.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2, Check, RotateCcw, Mail } from "lucide-react";
import { toast } from "sonner";
import { adminSetSuggestionStatus, adminDeleteSuggestion } from "@/lib/actions/suggestion";
import { formatDateBR } from "@/lib/dates";
import type { SuggestionWithAuthor } from "@/types/suggestion";

export function AdminSuggestionsView({ suggestions }: { suggestions: SuggestionWithAuthor[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"todas" | "aberto" | "feito">("todas");

  const shown = suggestions.filter((s) => filter === "todas" || s.status === filter);

  async function toggle(s: SuggestionWithAuthor) {
    try {
      await adminSetSuggestionStatus(s.id, s.status === "feito" ? "aberto" : "feito");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta sugestão do usuário?")) return;
    try {
      await adminDeleteSuggestion(id);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["todas", "aberto", "feito"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground hover:bg-accent/80"
            }`}
          >
            {f === "todas" ? "Todas" : f === "aberto" ? "Abertas" : "Feitas"}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Nenhuma sugestão.</p>
      ) : (
        shown.map((s) => (
          <div key={s.id} className="glass card-glow rounded-2xl border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.status === "feito" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                    {s.status === "feito" ? "Feito" : "Aberto"}
                  </span>
                  <h3 className={`truncate font-medium ${s.status === "feito" ? "text-muted-foreground line-through" : ""}`}>{s.title}</h3>
                </div>
                {s.description && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{s.description}</p>}
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{s.author_email}</span>
                  {s.author_name && <span>· {s.author_name}</span>}
                  <span>· {formatDateBR(s.created_at.slice(0, 10))}</span>
                </p>
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
  );
}
```

- [ ] **Step 2: Criar `src/app/(app)/admin/sugestoes/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { getAllSuggestions } from "@/lib/data/suggestion";
import { AdminSuggestionsView } from "@/components/suggestions/admin-suggestions-view";
import { Reveal } from "@/components/effects/reveal";

export default async function AdminSugestoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) redirect("/");

  const suggestions = await getAllSuggestions();

  return (
    <div className="max-w-3xl space-y-6">
      <Reveal>
        <h1 className="text-gradient text-4xl font-bold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
          Admin · Sugestões
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Todas as sugestões enviadas pelos usuários.</p>
      </Reveal>
      <AdminSuggestionsView suggestions={suggestions} />
    </div>
  );
}
```

- [ ] **Step 3: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro; a rota `/admin/sugestoes` aparece na lista.

- [ ] **Step 4: Commit**

```bash
git add src/components/suggestions/admin-suggestions-view.tsx src/app/\(app\)/admin
git commit -m "feat(admin): pagina /admin/sugestoes protegida + view"
```

---

### Task 4: Link "Admin" na sidebar (só para o admin) + verificação

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `isAdminEmail` (Task 1).

- [ ] **Step 1: `layout.tsx` calcula `isAdmin` e passa à Sidebar**

Adicionar o import:

```tsx
import { isAdminEmail } from "@/lib/auth/admin";
```

Trocar o bloco de retorno para passar `isAdmin` (calculado a partir de `user.email`):

```tsx
  const profile = await getProfile();
  const isAdmin = isAdminEmail(user.email);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userEmail={user.email ?? ""}
        displayName={profile?.display_name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
        isAdmin={isAdmin}
      />
      <main className="flex-1">
        <div className="px-6 py-8 pt-20 md:px-10 md:py-10 md:pt-10">{children}</div>
      </main>
    </div>
  );
```

- [ ] **Step 2: `sidebar.tsx` aceita `isAdmin` e mostra o item "Admin"**

1. Adicionar `Cog` ao import de `lucide-react` (junto aos ícones já importados).
2. Trocar a assinatura do componente para incluir `isAdmin`:

```tsx
export function Sidebar({
  userEmail,
  displayName,
  avatarUrl,
  isAdmin = false,
}: {
  userEmail: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin?: boolean;
}) {
```

3. Dentro do componente (antes do `return`), montar a lista final com o item admin condicional:

```tsx
  const items = isAdmin
    ? [...navItems, { href: "/admin/sugestoes", label: "Admin", icon: Cog }]
    : navItems;
```

4. No `<nav>`, trocar `{navItems.map((item) => {` por `{items.map((item) => {` (o resto do map fica igual).

- [ ] **Step 3: Build**

Run: `cd /c/Projetos/assistente-pessoal-v2 && npm run build`
Expected: compila sem erro.

- [ ] **Step 4: Verificação manual**

Com `ADMIN_EMAIL=pedrovvp12@gmail.com` no `.env.local` e `npm run dev`:
- Logado como esse e-mail: aparece **Admin** na sidebar; `/admin/sugestoes` lista todas as sugestões com o **e-mail** do autor; marcar feito/aberto e excluir funcionam.
- Logado como outro usuário (ou sem `ADMIN_EMAIL`): **não** aparece o link; abrir `/admin/sugestoes` redireciona para `/`.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/layout.tsx src/components/layout/sidebar.tsx
git commit -m "feat(admin): link Admin na sidebar so para o dono"
```

> **Passos manuais do usuário (env):** adicionar `ADMIN_EMAIL` no `.env.local` e na Vercel; garantir `SUPABASE_SECRET_KEY` na Vercel; recomendado rotacionar a secret (exposta antes).

## Self-Review (autor do plano)

**Cobertura do spec:**
- Cliente service-role + `assertAdmin` → Task 1. ✅
- `SuggestionWithAuthor` + `getAllSuggestions` (com e-mail/nome) + ações admin → Task 2. ✅
- Página protegida `/admin/sugestoes` + view (ver/feito/excluir/filtro) → Task 3. ✅
- Sidebar/layout `isAdmin` (link só p/ admin) → Task 4. ✅
- Segurança (server-only, dupla guarda) → Tasks 1–3. Passos de env → Task 4 nota. ✅

**Consistência de tipos/nomes:** `createAdminClient`, `isAdminEmail`, `assertAdmin`, `SuggestionWithAuthor` (`author_email`/`author_name`), `getAllSuggestions`, `adminSetSuggestionStatus`, `adminDeleteSuggestion`, prop `isAdmin` — usados igualzinho entre tasks. ✅

**Placeholders:** nenhum "TBD/TODO"; sem passos vagos. ✅
