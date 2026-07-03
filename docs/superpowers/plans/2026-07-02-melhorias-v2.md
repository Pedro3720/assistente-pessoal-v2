# Melhorias v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar 6 melhorias no app v2 — nome da saudação editável, sidebar inteira à esquerda, reordenar tarefas por arrastar, cartões com 3 números claros, inputs de valor auto-formatados em R$, e página de cadastro com perfil/foto.

**Architecture:** Backbone compartilhado = tabela `profiles` (nome/telefone/avatar) + gatilho `handle_new_user` no signup + bucket Storage `avatars`. Segue os padrões do projeto: Server Components leem (`lib/data/*`), Server Actions mutam (`lib/actions/*`, "use server", validam Zod, `user_id` via `auth.getUser()`, `revalidatePath`), tipos em `types/*`, Zod em `lib/validation/*`, RLS `own_rows`.

**Tech Stack:** Next.js 16.2.9 (App Router), React 19.2.4, TypeScript strict, Tailwind v4, `@supabase/ssr` + `supabase-js`, Zod, `@dnd-kit/*` (novo), lucide-react, sonner.

## Global Constraints

- **Projeto alvo:** `C:\Projetos\assistente-pessoal-v2` (NÃO a pasta de trabalho `Assistente-pessoal-main`, que é a v1 de referência).
- **NÃO tocar em `.env.local`** do v2 (já funciona com o projeto Supabase `qlqe…`).
- **TS strict, sem `any`.** Componentes pequenos (<~250 linhas). Regra de negócio fora do JSX.
- **Padrão de mutação client:** Server Action + `router.refresh()` + `toast` em erro.
- **AGENTS.md:** este Next.js foge do treino — **antes de codar rotas, Server Actions e upload, ler os guias em `node_modules/next/dist/docs/`** e ajustar a API à versão instalada. (Passo explícito nas tasks 1, 6 e 7.)
- **Sem framework de testes no repositório.** Gate automatizado por task = **`npm run build` passa sem erro de tipo** (TS strict) + a **verificação manual** descrita na task. Commits frequentes.
- **Migrações são aplicadas MANUALMENTE** no SQL Editor do Supabase (CLI bloqueado nesta máquina). Entregar o SQL pronto; a task de migração não "roda" localmente — o usuário cola no painel.
- **Reutilizar** `formatBRL`/`parseBRL` de `src/lib/money.ts` e `public.set_updated_at()` (já existe desde a migração de tarefas). Não duplicar.
- **UI pt-BR.** Camada visual: `glass card-glow rounded-2xl border border-border`, `.num` em valores, `<Reveal>`, `<CountUp>`, fontes `var(--font-display/sans/mono)`, variantes `dark:`.
- **Todos os comandos rodam em** `C:\Projetos\assistente-pessoal-v2`.

## Setup (uma vez, antes da Task 1)

- [ ] Criar branch de trabalho a partir de `main`:

```bash
cd /c/Projetos/assistente-pessoal-v2
git checkout main && git pull --ff-only
git checkout -b feat/melhorias-v2
```

## File Structure

**Criar:**
- `supabase/migrations/20260701000005_profiles.sql` — tabela `profiles`, RLS, gatilhos, bucket `avatars` + políticas.
- `supabase/migrations/20260701000006_task_position.sql` — coluna `position` em `tasks` + backfill.
- `src/types/profile.ts` — tipo `Profile`.
- `src/lib/validation/profile.ts` — Zod `profileInput`, `signupInput`.
- `src/lib/data/profile.ts` — `getProfile()`.
- `src/lib/storage/avatar.ts` — `uploadAvatarFile()`.
- `src/lib/actions/profile.ts` — `updateProfile()`.
- `src/components/profile/avatar-picker.tsx` — seletor de avatar (presets + upload), client.
- `src/components/profile/profile-form.tsx` — form de edição de perfil, client.
- `src/app/(app)/perfil/page.tsx` — página de perfil (server).
- `src/app/(auth)/cadastro/page.tsx` — página de cadastro (server, lê erro).
- `src/components/auth/cadastro-form.tsx` — form de cadastro, client.
- `public/avatars/preset-1.svg` … `preset-6.svg` — avatares placeholder.

**Modificar:**
- `src/components/finance/money-input.tsx` — formatação automática em R$ (#7).
- `src/components/finance/card-manager.tsx` — 3 números (#6).
- `src/components/layout/sidebar.tsx` — sticky altura total + avatar/nome/link perfil (#4, #3).
- `src/app/(app)/layout.tsx` — buscar perfil e passar à Sidebar.
- `src/app/(app)/page.tsx` — saudação usa `display_name` (#3).
- `src/app/(auth)/login/page.tsx` — botão "Criar conta" vira link p/ `/cadastro` (#8).
- `src/lib/supabase/middleware.ts` — `/cadastro` público (#8).
- `src/lib/actions/auth.ts` — `signupWithProfile()` (#8).
- `src/lib/data/task.ts` — ordenar por `position` (#5).
- `src/lib/actions/task.ts` — `reorderTasks()` + `position` no create (#5).
- `src/lib/validation/task.ts` — schema do reorder (#5).
- `src/components/tasks/tasks-view.tsx` — arrastar-e-soltar (#5).
- `package.json` — deps `@dnd-kit/*` (#5).

---

### Task 1: Backbone de perfil (migração + tipos + validação + data + storage + action)

**Files:**
- Create: `supabase/migrations/20260701000005_profiles.sql`
- Create: `src/types/profile.ts`
- Create: `src/lib/validation/profile.ts`
- Create: `src/lib/data/profile.ts`
- Create: `src/lib/storage/avatar.ts`
- Create: `src/lib/actions/profile.ts`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server`; `public.set_updated_at()` (migração de tarefas).
- Produces:
  - `interface Profile { id: string; display_name: string | null; phone: string | null; avatar_url: string | null; }`
  - `profileInput` (Zod: display_name obrigatório, phone/avatar_url nullable), `signupInput` (extends + email/password).
  - `getProfile(): Promise<Profile | null>`
  - `uploadAvatarFile(supabase: SupabaseClient, userId: string, file: File): Promise<string>`
  - `updateProfile(formData: FormData): Promise<void>` (Server Action)

- [ ] **Step 1: Ler o guia de Server Actions da versão instalada**

Ler (se existir) em `node_modules/next/dist/docs/` o material sobre Server Actions / mutações e uploads de `FormData`. Confirmar que `"use server"` + `formData.get(...)` + `redirect`/`revalidatePath` batem com a versão 16.2.9. Ajustar o código abaixo se a API divergir.

- [ ] **Step 2: Escrever a migração `20260701000005_profiles.sql`**

```sql
-- ============================================================
-- Assistente Pessoal v2 — Migração 0005: Perfis + Storage de avatar
-- ============================================================

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone        text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "own_rows" on public.profiles;
create policy "own_rows" on public.profiles for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- cria o profile automaticamente no signup, lendo o metadata do signUp
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, phone, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage: bucket público de avatares; escrita/atualização só na pasta {user_id}/
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists "avatar_public_read" on storage.objects;
create policy "avatar_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatar_own_write" on storage.objects;
create policy "avatar_own_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_own_update" on storage.objects;
create policy "avatar_own_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
```

- [ ] **Step 3: Criar `src/types/profile.ts`**

```ts
export interface Profile {
  id: string;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}
```

- [ ] **Step 4: Criar `src/lib/validation/profile.ts`**

```ts
import { z } from "zod";

export const profileInput = z.object({
  display_name: z.string().trim().min(1, "Informe um nome"),
  phone: z.string().trim().max(30).nullable().default(null),
  avatar_url: z.string().trim().nullable().default(null),
});
export type ProfileInput = z.infer<typeof profileInput>;

export const signupInput = profileInput.extend({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(6, "A senha precisa de ao menos 6 caracteres"),
});
export type SignupInput = z.infer<typeof signupInput>;
```

- [ ] **Step 5: Criar `src/lib/data/profile.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, phone, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile | null) ?? null;
}
```

- [ ] **Step 6: Criar `src/lib/storage/avatar.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

/** Sobe a foto para avatars/{userId}/... e devolve a URL pública. */
export async function uploadAvatarFile(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${userId}/avatar-${Date.now()}.${ext || "png"}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type || "image/png" });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 7: Criar `src/lib/actions/profile.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileInput } from "@/lib/validation/profile";
import { uploadAvatarFile } from "@/lib/storage/avatar";

export async function updateProfile(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  let avatar_url = (formData.get("avatar_url") as string) || null;
  const file = formData.get("avatar_file");
  if (file instanceof File && file.size > 0) {
    avatar_url = await uploadAvatarFile(supabase, user.id, file);
  }

  const input = profileInput.parse({
    display_name: formData.get("display_name"),
    phone: (formData.get("phone") as string) || null,
    avatar_url,
  });

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...input });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  revalidatePath("/perfil");
}
```

- [ ] **Step 8: Build**

Run: `npm run build`
Expected: compila sem erro de tipo. (Os arquivos novos são importados nas próximas tasks; aqui basta que tipem.)

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260701000005_profiles.sql src/types/profile.ts src/lib/validation/profile.ts src/lib/data/profile.ts src/lib/storage/avatar.ts src/lib/actions/profile.ts
git commit -m "feat(perfil): tabela profiles, storage de avatar, data e action de perfil"
```

> **Passo manual do usuário:** rodar `20260701000005_profiles.sql` no SQL Editor do Supabase e, em Auth → Providers/Settings, **desligar a confirmação de e-mail** (para o upload da foto funcionar já no cadastro).

---

### Task 2: MoneyInput com formatação automática em R$ (#7)

**Files:**
- Modify: `src/components/finance/money-input.tsx` (reescrita completa)

**Interfaces:**
- Consumes: `Input` de `@/components/ui/input`.
- Produces: `MoneyInput` mantém a MESMA assinatura (`value: string`, `onChange: (v: string) => void`, `placeholder?`, `autoFocus?`). `value` passa a ser a string já formatada (ex.: `"1.234,56"`), que `parseBRL` (em `lib/money.ts`) já interpreta.

- [ ] **Step 1: Reescrever `src/components/finance/money-input.tsx`**

```tsx
"use client";

import { Input } from "@/components/ui/input";

/** Centavos (inteiro) → "1.234,56". */
function formatCentavos(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Campo de dinheiro (BRL) com máscara automática: o usuário digita só números
 * e o valor aparece formatado da direita p/ a esquerda (12345 → "123,45",
 * 123456 → "1.234,56"). Emite a string formatada, que parseBRL entende.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder = "0,00",
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  function handle(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      onChange("");
      return;
    }
    onChange(formatCentavos(parseInt(digits, 10)));
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        inputMode="numeric"
        className="num pl-9"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => handle(e.target.value)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sem erro (assinatura inalterada; `bank-manager`, `card-manager`, `transactions-section` continuam válidos).

- [ ] **Step 3: Verificação manual**

Run: `npm run dev` → abrir `/financas` → "Nova conta" (ou cartão): no campo de valor, digitar `123456`.
Expected: aparece `R$` fixo à esquerda e o campo mostra `1.234,56`. Digitar `7` → `12.345,67`. Backspace remove o último dígito. Salvar e conferir que o valor gravado é 1234,56 (aparece correto na lista).

- [ ] **Step 4: Commit**

```bash
git add src/components/finance/money-input.tsx
git commit -m "feat(financas): mascara automatica de R$ no MoneyInput (#7)"
```

---

### Task 3: Sidebar inteira à esquerda, altura total (#4)

**Files:**
- Modify: `src/components/layout/sidebar.tsx:49-55` (classes do `<aside>`)

**Interfaces:**
- Nenhuma mudança de assinatura nesta task (a Sidebar ganha nome/avatar na Task 5).

- [ ] **Step 1: Ajustar as classes do `<aside>`**

Substituir o bloco de `className` do `<aside>` (hoje):

```tsx
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-56 transform flex-col border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl transition-transform duration-300 ease-in-out",
          "md:static md:z-auto md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
```

por (sticky de altura total no desktop; no mobile continua deslizante):

```tsx
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-56 transform flex-col border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl transition-transform duration-300 ease-in-out",
          "md:sticky md:top-0 md:h-screen md:z-auto md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
```

- [ ] **Step 2: Garantir que o `main` não crie scroll próprio que quebre o sticky**

Em `src/app/(app)/layout.tsx`, trocar `<main className="flex-1 overflow-auto">` por `<main className="flex-1">` (o scroll fica na janela; o sticky ancora na viewport).

```tsx
      <main className="flex-1">
        <div className="px-6 py-8 pt-20 md:px-10 md:py-10 md:pt-10">
          {children}
        </div>
      </main>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: compila sem erro.

- [ ] **Step 4: Verificação manual (desktop + mobile)**

Run: `npm run dev` → abrir uma página longa (ex.: `/financas`).
Expected (desktop ≥ md): a coluna lateral ocupa a **altura inteira** à esquerda, com marca no topo e "Sair" no rodapé visíveis; ao rolar o conteúdo, a sidebar permanece fixa e **não corta**. (mobile < md): botão de menu abre/fecha a sidebar deslizante como antes.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/sidebar.tsx src/app/(app)/layout.tsx
git commit -m "fix(layout): sidebar sticky de altura total, sem cortar (#4)"
```

---

### Task 4: Cartões com 3 números claros (#6)

**Files:**
- Modify: `src/components/finance/card-manager.tsx:194-206` (bloco de exibição por cartão)

**Interfaces:**
- Consumes: `CardWithInvoice` (`invoice`, `credit_limit`), `formatBRL`, `usePct` já calculado no `map`.

- [ ] **Step 1: Substituir o bloco de exibição (linhas ~194-206)**

Trocar o trecho atual:

```tsx
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fatura aberta</span>
                  <span className={`num font-semibold ${card.invoice > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                    {formatBRL(card.invoice)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                  <div className="bar-grow h-1.5 rounded-full bg-primary" style={{ width: `${usePct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="num">{usePct.toFixed(0)}% utilizado</span>
                  <span>Limite: <span className="num">{formatBRL(card.credit_limit)}</span></span>
                </div>
```

por (fatura a pagar em destaque; abaixo, utilizado em R$ com % e limite total):

```tsx
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fatura a pagar</span>
                  <span className={`num text-lg font-bold ${card.invoice > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                    {formatBRL(card.invoice)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                  <div className="bar-grow h-1.5 rounded-full bg-primary" style={{ width: `${usePct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Utilizado <span className="num text-foreground">{formatBRL(card.invoice)}</span>{" "}
                    <span className="num">({usePct.toFixed(0)}%)</span>
                  </span>
                  <span>
                    Limite total <span className="num text-foreground">{formatBRL(card.credit_limit)}</span>
                  </span>
                </div>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sem erro.

- [ ] **Step 3: Verificação manual**

Run: `npm run dev` → `/financas`, com ao menos um cartão cadastrado (limite e fatura preenchidos).
Expected: cada cartão mostra **"Fatura a pagar" R$X** em destaque, a barra de uso, e a linha **"Utilizado R$X (Y%)"** + **"Limite total R$Z"**.

- [ ] **Step 4: Commit**

```bash
git add src/components/finance/card-manager.tsx
git commit -m "feat(financas): cartao com fatura a pagar, utilizado e limite total (#6)"
```

---

### Task 5: Avatar picker, página de perfil e nome na saudação/sidebar (#3)

**Files:**
- Create: `public/avatars/preset-1.svg` … `preset-6.svg`
- Create: `src/components/profile/avatar-picker.tsx`
- Create: `src/components/profile/profile-form.tsx`
- Create: `src/app/(app)/perfil/page.tsx`
- Modify: `src/components/layout/sidebar.tsx` (rodapé: avatar + nome, link p/ `/perfil`)
- Modify: `src/app/(app)/layout.tsx` (buscar perfil, passar à Sidebar)
- Modify: `src/app/(app)/page.tsx:36-71` (saudação usa `display_name`)

**Interfaces:**
- Consumes: `getProfile()`, `updateProfile(formData)` (Task 1); `Profile` (Task 1).
- Produces:
  - `AvatarPicker({ name, initialUrl }: { name: string; initialUrl: string | null })` — client. Renderiza a grade de presets + botão de upload, um `<input type="file" name="avatar_file">` (escondido) e um `<input type="hidden" name="avatar_url">`. Usado no perfil e no cadastro.
  - `PRESET_AVATARS: string[]` (exportado do avatar-picker) = `["/avatars/preset-1.svg", …]`.

- [ ] **Step 1: Criar 6 SVGs placeholder em `public/avatars/`**

Cada arquivo `public/avatars/preset-N.svg` (troque a cor `fill` por preset — ex.: #3b82f6, #22c55e, #f59e0b, #ef4444, #a855f7, #14b8a6):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <rect width="96" height="96" rx="48" fill="#3b82f6"/>
  <circle cx="48" cy="38" r="16" fill="#ffffff" fill-opacity="0.9"/>
  <path d="M20 82c0-15 12.5-24 28-24s28 9 28 24" fill="#ffffff" fill-opacity="0.9"/>
</svg>
```

- [ ] **Step 2: Criar `src/components/profile/avatar-picker.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";

export const PRESET_AVATARS = [
  "/avatars/preset-1.svg",
  "/avatars/preset-2.svg",
  "/avatars/preset-3.svg",
  "/avatars/preset-4.svg",
  "/avatars/preset-5.svg",
  "/avatars/preset-6.svg",
];

/**
 * Escolha de avatar: presets OU upload de foto própria.
 * Submete via form nativo: <input type="file" name="avatar_file"> (foto própria)
 * e <input type="hidden" name="avatar_url"> (preset ou URL atual).
 */
export function AvatarPicker({
  name,
  initialUrl,
}: {
  name: string;
  initialUrl: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [presetUrl, setPresetUrl] = useState<string | null>(
    initialUrl && PRESET_AVATARS.includes(initialUrl) ? initialUrl : null
  );

  function pickPreset(url: string) {
    setPresetUrl(url);
    setPreview(url);
    if (fileRef.current) fileRef.current.value = ""; // limpa upload ao escolher preset
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPresetUrl(null); // foto própria vence o preset
    setPreview(URL.createObjectURL(f));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
          {preview ? (
            <Image src={preview} alt="Avatar" width={64} height={64} className="h-16 w-16 object-cover" unoptimized />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center text-xs text-muted-foreground">sem foto</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
        >
          <Upload className="h-4 w-4" /> Enviar foto
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESET_AVATARS.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => pickPreset(url)}
            className={`h-10 w-10 overflow-hidden rounded-full border-2 transition-all ${
              presetUrl === url ? "scale-110 border-foreground" : "border-transparent"
            }`}
          >
            <Image src={url} alt="Avatar" width={40} height={40} className="h-10 w-10" unoptimized />
          </button>
        ))}
      </div>

      {/* campos submetidos com o form */}
      <input ref={fileRef} type="file" name="avatar_file" accept="image/*" className="hidden" onChange={onFile} />
      <input type="hidden" name="avatar_url" value={presetUrl ?? initialUrl ?? ""} />
      <input type="hidden" data-picker={name} />
    </div>
  );
}
```

- [ ] **Step 3: Criar `src/components/profile/profile-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AvatarPicker } from "./avatar-picker";
import { updateProfile } from "@/lib/actions/profile";
import type { Profile } from "@/types/profile";

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function action(formData: FormData) {
    setSaving(true);
    try {
      await updateProfile(formData);
      toast.success("Perfil atualizado");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={action} className="glass card-glow max-w-md space-y-5 rounded-2xl border border-border p-6">
      <div className="space-y-1.5">
        <label htmlFor="display_name" className="text-sm font-medium">Como quer ser chamado(a)</label>
        <Input id="display_name" name="display_name" defaultValue={profile?.display_name ?? ""} placeholder="Seu nome" required />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium">Telefone (opcional)</label>
        <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} placeholder="(00) 00000-0000" />
      </div>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Foto / avatar</span>
        <AvatarPicker name="perfil" initialUrl={profile?.avatar_url ?? null} />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Criar `src/app/(app)/perfil/page.tsx`**

```tsx
import { getProfile } from "@/lib/data/profile";
import { ProfileForm } from "@/components/profile/profile-form";
import { Reveal } from "@/components/effects/reveal";

export default async function PerfilPage() {
  const profile = await getProfile();

  return (
    <div className="max-w-3xl space-y-6">
      <Reveal>
        <h1 className="text-gradient text-4xl font-bold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
          Perfil
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Como o assistente se refere a você.</p>
      </Reveal>
      <Reveal>
        <ProfileForm profile={profile} />
      </Reveal>
    </div>
  );
}
```

- [ ] **Step 5: Saudação com `display_name` em `src/app/(app)/page.tsx`**

Adicionar o import no topo:

```tsx
import { getProfile } from "@/lib/data/profile";
```

Dentro de `Dashboard()`, após obter `user`, buscar o perfil e usar na saudação. Trocar:

```tsx
  const {
    data: { user },
  } = await supabase.auth.getUser();
```

por:

```tsx
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getProfile();
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "";
```

E trocar a linha da saudação:

```tsx
        <p className="mb-1 text-sm text-muted-foreground">
          {greeting}, {user?.email?.split("@")[0]} —
        </p>
```

por:

```tsx
        <p className="mb-1 text-sm text-muted-foreground">
          {greeting}, {displayName} —
        </p>
```

- [ ] **Step 6: Sidebar mostra avatar + nome e linka para `/perfil`**

Em `src/components/layout/sidebar.tsx`: mudar a assinatura e o rodapé.

Trocar a assinatura:

```tsx
export function Sidebar({ userEmail }: { userEmail: string }) {
```

por:

```tsx
import Image from "next/image";
// ...
export function Sidebar({
  userEmail,
  displayName,
  avatarUrl,
}: {
  userEmail: string;
  displayName: string;
  avatarUrl: string | null;
}) {
```

Trocar o bloco do rodapé (o `<div>` com `border-t ...` que hoje mostra só o e-mail) por:

```tsx
        {/* Footer — perfil + sair */}
        <div className="border-t border-sidebar-border px-4 py-4">
          <Link
            href="/perfil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sidebar-accent"
            title="Editar perfil"
          >
            <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-sidebar-border bg-muted">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" width={32} height={32} className="h-8 w-8 object-cover" unoptimized />
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-sidebar-foreground">{displayName || "Perfil"}</span>
              <span className="block truncate text-xs text-sidebar-foreground/40">{userEmail}</span>
            </span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              Sair
            </button>
          </form>
        </div>
```

- [ ] **Step 7: `src/app/(app)/layout.tsx` busca o perfil e passa à Sidebar**

Trocar o corpo por:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/data/profile";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userEmail={user.email ?? ""}
        displayName={profile?.display_name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <main className="flex-1">
        <div className="px-6 py-8 pt-20 md:px-10 md:py-10 md:pt-10">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 8: Permitir domínio do Supabase em `next.config.ts` para `next/image`**

Como o avatar pode vir do Storage do Supabase, autorizar o host. Ler `next.config.ts` e adicionar `images.remotePatterns` para `qlqewlrzjlbwrybwrimt.supabase.co` (host de `NEXT_PUBLIC_SUPABASE_URL`). Ex.:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "qlqewlrzjlbwrybwrimt.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
```

(Como o `AvatarPicker`/sidebar usam `unoptimized`, isto é defensivo; manter para evitar erro caso alguém remova `unoptimized`.)

- [ ] **Step 9: Build**

Run: `npm run build`
Expected: compila sem erro.

- [ ] **Step 10: Verificação manual**

Run: `npm run dev` (com a migração 0005 já aplicada e um usuário logado).
Expected: abrir `/perfil` → definir nome, telefone e um preset (ou upload) → "Salvar" mostra toast e recarrega. Voltar ao Dashboard: saudação vira "Bom dia, {nome}". Sidebar (rodapé) mostra avatar + nome e clicar abre `/perfil`.

- [ ] **Step 11: Commit**

```bash
git add public/avatars src/components/profile src/app/\(app\)/perfil src/components/layout/sidebar.tsx src/app/\(app\)/layout.tsx src/app/\(app\)/page.tsx next.config.ts
git commit -m "feat(perfil): pagina /perfil, avatar picker, nome na saudacao e sidebar (#3)"
```

---

### Task 6: Página de cadastro com perfil e foto (#8)

**Files:**
- Create: `src/app/(auth)/cadastro/page.tsx`
- Create: `src/components/auth/cadastro-form.tsx`
- Modify: `src/lib/actions/auth.ts` (adicionar `signupWithProfile`)
- Modify: `src/app/(auth)/login/page.tsx` (botão "Criar conta" → link)
- Modify: `src/lib/supabase/middleware.ts` (`/cadastro` público)

**Interfaces:**
- Consumes: `signupInput` (Task 1), `uploadAvatarFile` (Task 1), `AvatarPicker` (Task 5).
- Produces: `signupWithProfile(formData: FormData): Promise<void>` (Server Action).

- [ ] **Step 1: Ler o guia de rotas/segmentos e Server Actions**

Reler, se disponível, `node_modules/next/dist/docs/` sobre grupos de rotas `(auth)`, `searchParams` em páginas e Server Actions com `redirect`. Ajustar se a API divergir.

- [ ] **Step 2: Tornar `/cadastro` pública no middleware**

Em `src/lib/supabase/middleware.ts`, trocar:

```ts
const PUBLIC_ROUTES = ["/login"];
```

por:

```ts
const PUBLIC_ROUTES = ["/login", "/cadastro"];
```

- [ ] **Step 3: Adicionar `signupWithProfile` em `src/lib/actions/auth.ts`**

Adicionar os imports que faltam no topo do arquivo (`redirect` já existe):

```ts
import { signupInput } from "@/lib/validation/profile";
import { uploadAvatarFile } from "@/lib/storage/avatar";
```

E acrescentar a action:

```ts
export async function signupWithProfile(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const parsed = signupInput.safeParse({
    display_name: formData.get("display_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: (formData.get("phone") as string) || null,
    avatar_url: (formData.get("avatar_url") as string) || null,
  });
  if (!parsed.success) {
    redirect(`/cadastro?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }
  const { display_name, email, password, phone } = parsed.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name, phone } },
  });
  if (error) {
    redirect(`/cadastro?error=${encodeURIComponent(error.message)}`);
  }

  // Confirmação de e-mail DESLIGADA → há sessão: sobe foto e completa o perfil.
  if (data.session && data.user) {
    let avatar_url = parsed.data.avatar_url;
    const file = formData.get("avatar_file");
    if (file instanceof File && file.size > 0) {
      avatar_url = await uploadAvatarFile(supabase, data.user.id, file);
    }
    await supabase
      .from("profiles")
      .upsert({ id: data.user.id, display_name, phone, avatar_url });
    revalidatePath("/", "layout");
    redirect("/");
  }

  // Confirmação de e-mail LIGADA → sem sessão: perfil básico já veio do gatilho.
  redirect(
    `/login?message=${encodeURIComponent(
      "Conta criada. Confirme o e-mail e depois envie sua foto em Perfil."
    )}`
  );
}
```

- [ ] **Step 4: Criar `src/components/auth/cadastro-form.tsx`**

```tsx
"use client";

import Link from "next/link";
import { Input } from "@/components/ui/input";
import { AvatarPicker } from "@/components/profile/avatar-picker";
import { signupWithProfile } from "@/lib/actions/auth";

export function CadastroForm({ error }: { error?: string }) {
  return (
    <form action={signupWithProfile} className="mt-6 space-y-4">
      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="display_name" className="text-sm font-medium">Como o assistente vai te chamar</label>
        <Input id="display_name" name="display_name" placeholder="Seu nome" required />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">E-mail</label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">Senha</label>
        <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="••••••••" required />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-sm font-medium">Telefone (opcional)</label>
        <Input id="phone" name="phone" placeholder="(00) 00000-0000" />
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">Foto / avatar</span>
        <AvatarPicker name="cadastro" initialUrl={null} />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-[0_8px_30px_-8px_var(--primary)] transition-all hover:bg-primary/90"
      >
        Criar conta
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary hover:underline">Entrar</Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 5: Criar `src/app/(auth)/cadastro/page.tsx`**

```tsx
import { CadastroForm } from "@/components/auth/cadastro-form";
import { Reveal } from "@/components/effects/reveal";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass fixed right-5 top-5 z-50 rounded-full border border-border p-1 shadow-lg">
        <ThemeToggle />
      </div>
      <Reveal className="w-full max-w-sm">
        <div className="glass rounded-3xl border border-border p-8 shadow-2xl">
          <h1 className="text-gradient text-3xl font-extrabold tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
            Criar conta
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Configure como o assistente vai te tratar.</p>
          <CadastroForm error={error} />
        </div>
      </Reveal>
    </div>
  );
}
```

- [ ] **Step 6: Login: botão "Criar conta" vira link para `/cadastro`**

Em `src/app/(auth)/login/page.tsx`: adicionar `import Link from "next/link";` no topo e substituir o `<button formAction={signup}>...</button>` por:

```tsx
              <Link
                href="/cadastro"
                className="flex flex-1 items-center justify-center rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Criar conta
              </Link>
```

(O import `signup` pode ser removido do login se não for mais usado — conferir e remover para não deixar import morto.)

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: compila sem erro (sem imports mortos; `signupWithProfile` tipado).

- [ ] **Step 8: Verificação manual**

Run: `npm run dev` (migração 0005 aplicada + confirmação de e-mail desligada no Supabase).
Expected: em `/login`, clicar "Criar conta" **abre `/cadastro`**. Preencher nome, e-mail, senha, telefone e escolher um preset (ou enviar foto) → "Criar conta" cria a conta, entra logado, e o Dashboard saúda pelo nome com o avatar na sidebar. Erros (e-mail inválido, senha curta) voltam para `/cadastro?error=...` exibindo a mensagem.

- [ ] **Step 9: Commit**

```bash
git add src/app/\(auth\)/cadastro src/components/auth/cadastro-form.tsx src/lib/actions/auth.ts src/app/\(auth\)/login/page.tsx src/lib/supabase/middleware.ts
git commit -m "feat(auth): pagina de cadastro com nome, telefone e foto (#8)"
```

---

### Task 7: Reordenar tarefas por arrastar-e-soltar (#5)

**Files:**
- Create: `supabase/migrations/20260701000006_task_position.sql`
- Modify: `package.json` (deps `@dnd-kit/*`)
- Modify: `src/types/task.ts` (campo `position`)
- Modify: `src/lib/data/task.ts` (ordenar por `position`)
- Modify: `src/lib/validation/task.ts` (schema do reorder)
- Modify: `src/lib/actions/task.ts` (`reorderTasks` + `position` no create)
- Modify: `src/components/tasks/tasks-view.tsx` (dnd-kit)

**Interfaces:**
- Consumes: `Task` (ganha `position: number`), `setTaskStatus`, `deleteTask` (já existem).
- Produces: `reorderTasks(ids: number[]): Promise<void>` (Server Action).

- [ ] **Step 1: Ler o guia sobre client components/efeitos, depois instalar dnd-kit**

Conferir compatibilidade e instalar:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: instala sem erro de peer dependency com React 19. (Se houver conflito insolúvel, seguir o **Plano B** — drag nativo HTML5 — mantendo a mesma action `reorderTasks`.)

- [ ] **Step 2: Escrever a migração `20260701000006_task_position.sql`**

```sql
-- ============================================================
-- Assistente Pessoal v2 — Migração 0006: ordem manual das tarefas
-- ============================================================

alter table public.tasks add column if not exists position int not null default 0;

-- backfill: ordem atual (mais nova primeiro) vira position 0,1,2,...
with ranked as (
  select id, row_number() over (partition by user_id order by created_at desc) - 1 as rn
  from public.tasks
)
update public.tasks t set position = r.rn
from ranked r where r.id = t.id;

create index if not exists tasks_user_position_idx on public.tasks (user_id, position);

notify pgrst, 'reload schema';
```

- [ ] **Step 3: Adicionar `position` ao tipo em `src/types/task.ts`**

```ts
export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_on: string | null; // YYYY-MM-DD
  position: number;
}
```

- [ ] **Step 4: Ordenar por `position` em `src/lib/data/task.ts`**

Trocar a query por:

```ts
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
```

- [ ] **Step 5: Schema do reorder em `src/lib/validation/task.ts`**

Adicionar ao final:

```ts
export const reorderInput = z.array(z.number().int()).min(1);
```

- [ ] **Step 6: `reorderTasks` + `position` no create em `src/lib/actions/task.ts`**

Trocar o import da validação para incluir `reorderInput`:

```ts
import { taskInput, statusSchema, reorderInput } from "@/lib/validation/task";
```

No `createTask`, colocar a nova tarefa no topo (menor `position` − 1). Substituir o corpo por:

```ts
export async function createTask(raw: unknown) {
  const input = taskInput.parse(raw);
  const { supabase, userId } = await ctx();
  const { data: top } = await supabase
    .from("tasks")
    .select("position")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  const position = (top?.position ?? 0) - 1;
  const { error } = await supabase.from("tasks").insert({ ...input, position, user_id: userId });
  if (error) throw new Error(error.message);
  revalidate();
}
```

Adicionar a action de reordenação (grava `position` = índice no array; RLS garante que só as linhas do usuário são afetadas):

```ts
export async function reorderTasks(ids: unknown) {
  const order = reorderInput.parse(ids);
  const { supabase } = await ctx();
  await Promise.all(
    order.map((id, index) =>
      supabase.from("tasks").update({ position: index }).eq("id", id)
    )
  );
  revalidate();
}
```

- [ ] **Step 7: Arrastar-e-soltar em `src/components/tasks/tasks-view.tsx`**

Adicionar imports do dnd-kit e um subcomponente `SortableTask`, e envolver a lista com `DndContext`/`SortableContext`. O arraste só é habilitado no filtro "Todas" (nos outros filtros a lista é um subconjunto e reordenar seria ambíguo).

Imports novos no topo:

```tsx
import { GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderTasks } from "@/lib/actions/task";
```

Garantir que o import do React inclua `useEffect` (o arquivo hoje importa `{ useMemo, useState }`):

```tsx
import { useEffect, useMemo, useState } from "react";
```

Dentro de `TasksView`, adicionar estado de ordem local e sensores (logo após os `useState` existentes):

```tsx
  const [order, setOrder] = useState<Task[]>(tasks);
  // ressincroniza a ordem local quando o servidor devolve outra lista (após refresh)
  const orderKey = tasks.map((t) => t.id).join(",");
  useEffect(() => setOrder(tasks), [orderKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const canReorder = filter === "all";

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((t) => t.id === active.id);
    const newIndex = order.findIndex((t) => t.id === over.id);
    const next = arrayMove(order, oldIndex, newIndex);
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

Trocar a fonte da lista `shown` para usar `order` (em vez de `tasks`):

```tsx
  const shown = useMemo(
    () => (filter === "all" ? order : order.filter((t) => t.status === filter)),
    [order, filter]
  );
```

Extrair o cartão de tarefa para um subcomponente sortable. Adicionar, fora de `TasksView`, o componente:

```tsx
function SortableTask({
  t,
  done,
  overdue,
  canReorder,
  onToggle,
  onEdit,
  onRemove,
}: {
  t: Task;
  done: boolean;
  overdue: boolean;
  canReorder: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: t.id,
    disabled: !canReorder,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass card-glow flex items-start gap-3 rounded-2xl border border-border p-4"
    >
      {canReorder && (
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          title="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <button
        onClick={onToggle}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40 hover:border-primary"
        }`}
        title={done ? "Reabrir" : "Concluir"}
      >
        {done && <Check className="h-3 w-3" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PRIORITY_META[t.priority].dot }} title={`Prioridade ${PRIORITY_META[t.priority].label}`} />
          <h3 className={`truncate text-sm font-medium ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {t.title}
          </h3>
        </div>
        {t.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_META[t.status].color}`}>
            {STATUS_META[t.status].label}
          </span>
          <span className={`text-[11px] font-medium ${PRIORITY_META[t.priority].text}`}>
            {PRIORITY_META[t.priority].label}
          </span>
          {t.due_on && (
            <span className={`flex items-center gap-1 text-[11px] ${overdue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
              <CalendarClock className="h-3 w-3" />
              <span className="num">{formatDateBR(t.due_on)}</span>
              {overdue ? " · atrasada" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
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

Trocar o `<Reveal stagger className="space-y-2">…</Reveal>` que renderiza a lista por uma versão com `DndContext` (quando há itens):

```tsx
      {shown.length === 0 ? (
        <Reveal stagger className="space-y-2">
          <div className="glass flex flex-col items-center justify-center rounded-2xl border border-border py-16 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma tarefa aqui.</p>
          </div>
        </Reveal>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={shown.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {shown.map((t) => {
                const done = t.status === "completed";
                const overdue = Boolean(t.due_on && !done && t.due_on < today);
                return (
                  <SortableTask
                    key={t.id}
                    t={t}
                    done={done}
                    overdue={overdue}
                    canReorder={canReorder}
                    onToggle={() => toggle(t)}
                    onEdit={() => { setEditing(t); setModalOpen(true); }}
                    onRemove={() => remove(t.id)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
```

> Observação: o `Reveal stagger` original animava os filhos ao entrar. Como o `DndContext` precisa dos filhos diretos, mantemos a lista sem o `Reveal` no ramo com itens (a animação de entrada some da lista, mas o restante da página segue com `Reveal`). Se quiser preservar a animação, envolver o `<DndContext>` inteiro em `<Reveal>` (sem `stagger`).

- [ ] **Step 8: Build**

Run: `npm run build`
Expected: compila sem erro de tipo (checar `DragEndEvent`, `Task.position`).

- [ ] **Step 9: Verificação manual**

Run: `npm run dev` (migração 0006 aplicada).
Expected: em `/tarefas` no filtro "Todas", cada tarefa tem um "punho" (⋮⋮) à esquerda; arrastar reordena e, ao **recarregar a página**, a ordem se mantém. Nos filtros Pendentes/Em andamento/Concluídas o punho some (sem reordenar). Criar nova tarefa: aparece no **topo**.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json supabase/migrations/20260701000006_task_position.sql src/types/task.ts src/lib/data/task.ts src/lib/validation/task.ts src/lib/actions/task.ts src/components/tasks/tasks-view.tsx
git commit -m "feat(tarefas): reordenar por arrastar-e-soltar com posicao persistida (#5)"
```

> **Passo manual do usuário:** rodar `20260701000006_task_position.sql` no SQL Editor do Supabase.

---

### Task 8: Verificação final e fechamento

**Files:** nenhum (só verificação).

- [ ] **Step 1: Build de produção limpo**

Run: `npm run build`
Expected: sem erros de tipo/lint.

- [ ] **Step 2: Checklist manual completo (com as migrações 0005 e 0006 aplicadas)**

Run: `npm run dev`
- #7 valor: digitar em qualquer campo de dinheiro formata em R$.
- #4 sidebar: coluna inteira à esquerda, não corta ao rolar (desktop e mobile).
- #6 cartão: "Fatura a pagar", "Utilizado (R$/%)", "Limite total".
- #3 saudação: mostra o nome do perfil; editável em `/perfil`.
- #8 cadastro: `/login` → "Criar conta" → `/cadastro` cria conta + perfil + foto e entra logado.
- #5 tarefas: arrastar reordena e persiste ao recarregar.

- [ ] **Step 3: Resumo dos passos manuais do usuário no Supabase**

Confirmar com o usuário que ele:
1. Rodou `20260701000005_profiles.sql` e `20260701000006_task_position.sql` no SQL Editor.
2. Desligou a confirmação de e-mail (Auth) — ou aceitou que a foto própria é enviada depois, em `/perfil`.
3. Viu o bucket `avatars` criado em Storage.

- [ ] **Step 4: Integrar o branch**

Usar a skill `superpowers:finishing-a-development-branch` para decidir merge/PR do `feat/melhorias-v2`.

## Self-Review (feita pelo autor do plano)

**Cobertura do spec:**
- #3 → Task 5 (saudação + `/perfil` + sidebar). ✅
- #4 → Task 3 (sidebar sticky). ✅
- #5 → Task 7 (position + reorder + dnd). ✅
- #6 → Task 4 (3 números). ✅
- #7 → Task 2 (MoneyInput). ✅
- #8 → Task 6 (cadastro) apoiado por Task 1 (backbone). ✅
- Backbone `profiles` + Storage → Task 1. ✅
- Passos manuais Supabase → notas nas Tasks 1, 7 e 8. ✅

**Consistência de tipos/nomes:** `Profile`, `getProfile`, `updateProfile`, `uploadAvatarFile`, `AvatarPicker` (props `name`, `initialUrl`), `signupWithProfile`, `reorderTasks`, `Task.position` — usados com a mesma assinatura em todas as tasks. `MoneyInput` mantém contrato `value/onChange`. ✅

**Placeholders:** nenhum "TBD/TODO"; os passos "ler node docs" são pesquisa real exigida pelo AGENTS.md, não código faltando. ✅
