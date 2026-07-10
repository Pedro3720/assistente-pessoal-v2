# Recuperação + troca de senha (#14) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recuperação de senha por e-mail (deslogado) + troca de senha para quem está logado (em /perfil), sobre o Supabase Auth nativo.

**Architecture:** Server Actions (`requestPasswordReset`, `updatePassword`) chamam a API nativa do Supabase Auth. Um route handler `/api/auth/callback` troca o `code` do link por sessão. Um ajuste cirúrgico no middleware torna o callback público e mantém `/redefinir-senha` protegido. Um componente `NewPasswordForm` (`mode: "reset" | "change"`) e a action `updatePassword` são compartilhados pelos dois fluxos. Sem migração.

**Tech Stack:** Next.js 16.2.9 (App Router) · React 19 · TypeScript strict · @supabase/ssr + supabase-js · Zod · Tailwind v4 · sonner · lucide-react.

## Global Constraints

- **Sem framework de testes.** O gate de cada task é **`npm run build`** sem erros (tipos, lint, Zod) + verificação manual (última task). Não escrever testes automatizados. Não tentar TDD.
- **TS strict, proibido `any`.** Imports/vars não usados quebram o build.
- **Sem migração** — usar só a API do Supabase Auth (`resetPasswordForEmail`, `exchangeCodeForSession`, `updateUser`). Nenhuma tabela/RLS nova.
- **Server Actions mutam** (`"use server"`, Zod em `src/lib/validation/*`, `createClient` de `@/lib/supabase/server`, `revalidatePath`).
- **Anti-enumeração:** o pedido de reset sempre mostra a **mesma mensagem neutra**, exista o e-mail ou não.
- **Senha mínima = 6** (igual ao cadastro). Conferência "senhas iguais" é client-side.
- **O middleware é a única proteção de rotas.** `/redefinir-senha` fica **protegido** (a sessão de recuperação dá acesso); `/recuperar-senha` e `/api/auth/callback` ficam **públicos**.
- **Operacional (fora do código):** adicionar `…/api/auth/callback` (produção + `http://localhost:3000/api/auth/callback`) nos Redirect URLs do Supabase — passo manual do humano (última task).

---

### Task 1: Validação + Server Actions de senha

**Files:**
- Create: `src/lib/validation/auth.ts`
- Modify: `src/lib/actions/auth.ts` (imports + 2 actions no fim)

**Interfaces:**
- Consumes: `createClient`, `redirect`, `revalidatePath` (já em `auth.ts`).
- Produces: `resetRequestInput`, `passwordInput` (Zod); `requestPasswordReset(formData: FormData): Promise<void>`; `updatePassword(newPassword: string): Promise<void>`.

- [ ] **Step 1: Criar a validação**

Create `src/lib/validation/auth.ts`:

```ts
import { z } from "zod";

export const resetRequestInput = z.object({
  email: z.string().trim().email("E-mail inválido"),
});
export type ResetRequestInput = z.infer<typeof resetRequestInput>;

export const passwordInput = z.object({
  password: z.string().min(6, "A senha precisa de ao menos 6 caracteres"),
});
export type PasswordInput = z.infer<typeof passwordInput>;
```

- [ ] **Step 2: Adicionar imports em `src/lib/actions/auth.ts`**

O arquivo começa com `"use server";` e já importa `revalidatePath`, `redirect`, `createClient`, `signupInput`, `uploadAvatarFile`. Adicionar duas linhas de import logo após as existentes:

```ts
import { headers } from "next/headers";
import { resetRequestInput, passwordInput } from "@/lib/validation/auth";
```

- [ ] **Step 3: Adicionar as duas actions ao fim de `src/lib/actions/auth.ts`**

```ts
export async function requestPasswordReset(formData: FormData): Promise<void> {
  const parsed = resetRequestInput.safeParse({ email: String(formData.get("email") ?? "") });
  if (!parsed.success) {
    redirect(`/recuperar-senha?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  const supabase = await createClient();
  // Ignora o resultado de propósito: sempre mostra a mesma mensagem neutra (anti-enumeração).
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/api/auth/callback`,
  });
  redirect(
    `/recuperar-senha?message=${encodeURIComponent(
      "Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha."
    )}`
  );
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { password } = passwordInput.parse({ password: newPassword });
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/auth.ts src/lib/actions/auth.ts
git commit -m "feat(auth): validacao + actions requestPasswordReset/updatePassword (#14)"
```

---

### Task 2: Route handler de callback

**Files:**
- Create: `src/app/api/auth/callback/route.ts`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/server`.
- Produces: rota `GET /api/auth/callback` que troca `code` por sessão e redireciona.

- [ ] **Step 1: Criar o route handler**

Create `src/app/api/auth/callback/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/redefinir-senha";
  const fail = new URL(`/login?error=${encodeURIComponent("Link inválido ou expirado")}`, req.url);

  if (!code) return NextResponse.redirect(fail);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(fail);

  return NextResponse.redirect(new URL(next, req.url));
}
```

> `createClient()` está ligado ao `cookies()` do `next/headers`, gravável em route handlers — então `exchangeCodeForSession` persiste a sessão. Padrão oficial do Supabase SSR.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sem erros; a rota `/api/auth/callback` aparece no output.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/auth/callback/route.ts"
git commit -m "feat(auth): callback que troca code por sessao (#14)"
```

---

### Task 3: Ajuste do middleware

**Files:**
- Modify: `src/lib/supabase/middleware.ts`

**Interfaces:**
- Consumes: nada novo.
- Produces: `/recuperar-senha` e `/api/auth/*` públicos; `/redefinir-senha` protegido; logado em página de auth → `/`.

- [ ] **Step 1: Trocar a constante de rotas públicas**

Em `src/lib/supabase/middleware.ts`, trocar a linha:
```ts
const PUBLIC_ROUTES = ["/login", "/cadastro"];
```
por:
```ts
const AUTH_PAGES = ["/login", "/cadastro", "/recuperar-senha"];
const PUBLIC_PREFIXES = [...AUTH_PAGES, "/api/auth"];
```

- [ ] **Step 2: Trocar a lógica de decisão**

No corpo de `updateSession`, trocar o bloco:
```ts
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.some((r) => path.startsWith(r));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
```
por:
```ts
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((r) => path.startsWith(r));
  const isAuthPage = AUTH_PAGES.some((r) => path.startsWith(r));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
```

> `"/redefinir-senha".startsWith("/recuperar-senha")` é `false` → prefixos distintos, sem colisão. O callback fica público (não vai pro `/login` sem sessão) e fora da regra "logado → /".

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/middleware.ts
git commit -m "feat(auth): middleware libera callback e protege /redefinir-senha (#14)"
```

---

### Task 4: Componente `NewPasswordForm`

**Files:**
- Create: `src/components/auth/new-password-form.tsx`

**Interfaces:**
- Consumes: `updatePassword` de `@/lib/actions/auth` (Task 1); `Input` de `@/components/ui/input`; `toast` (sonner); `useRouter`.
- Produces: componente client `NewPasswordForm` com prop `mode: "reset" | "change"`.

- [ ] **Step 1: Criar o componente**

Create `src/components/auth/new-password-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePassword } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";

export function NewPasswordForm({ mode }: { mode: "reset" | "change" }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa de ao menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setSaving(true);
    try {
      await updatePassword(password);
      if (mode === "reset") {
        toast.success("Senha redefinida! Você já está conectado.");
        router.push("/");
        router.refresh();
      } else {
        toast.success("Senha alterada com sucesso.");
        setPassword("");
        setConfirm("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar a senha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="new-password" className="text-sm font-medium">Nova senha</label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm-password" className="text-sm font-medium">Confirmar senha</label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? "Salvando..." : mode === "reset" ? "Redefinir senha" : "Alterar senha"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sem erros (componente ainda não montado — ok).

- [ ] **Step 3: Commit**

```bash
git add "src/components/auth/new-password-form.tsx"
git commit -m "feat(auth): componente NewPasswordForm (reset|change) (#14)"
```

---

### Task 5: Páginas `/recuperar-senha` e `/redefinir-senha`

**Files:**
- Create: `src/app/(auth)/recuperar-senha/page.tsx`
- Create: `src/app/(auth)/redefinir-senha/page.tsx`

**Interfaces:**
- Consumes: `requestPasswordReset` (Task 1); `NewPasswordForm` (Task 4); `Input`, `Reveal`, `ThemeToggle`.
- Produces: rotas `/recuperar-senha` (form de e-mail) e `/redefinir-senha` (nova senha).

- [ ] **Step 1: Criar `src/app/(auth)/recuperar-senha/page.tsx`**

```tsx
import Link from "next/link";
import Image from "next/image";
import { requestPasswordReset } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Reveal } from "@/components/effects/reveal";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function RecuperarSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass fixed right-5 top-5 z-50 rounded-full border border-border p-1 shadow-lg">
        <ThemeToggle />
      </div>
      <Reveal className="w-full max-w-sm">
        <div className="glass rounded-3xl border border-border p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Zênite" width={48} height={48} className="h-12 w-12 shrink-0 invert dark:invert-0" />
            <h1 className="text-gradient text-3xl font-extrabold tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
              Zênite
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Recuperar senha — enviaremos um link para o seu e-mail.</p>

          {error && (
            <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}
          {message && (
            <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {message}
            </p>
          )}

          <form className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</label>
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required />
            </div>
            <button
              formAction={requestPasswordReset}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-[0_8px_30px_-8px_var(--primary)] transition-all hover:bg-primary/90"
            >
              Enviar link
            </button>
          </form>

          <Link href="/login" className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground hover:underline">
            Voltar para o login
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
```

- [ ] **Step 2: Criar `src/app/(auth)/redefinir-senha/page.tsx`**

```tsx
import Image from "next/image";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { Reveal } from "@/components/effects/reveal";
import { ThemeToggle } from "@/components/theme-toggle";

export default function RedefinirSenhaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass fixed right-5 top-5 z-50 rounded-full border border-border p-1 shadow-lg">
        <ThemeToggle />
      </div>
      <Reveal className="w-full max-w-sm">
        <div className="glass rounded-3xl border border-border p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Zênite" width={48} height={48} className="h-12 w-12 shrink-0 invert dark:invert-0" />
            <h1 className="text-gradient text-3xl font-extrabold tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
              Zênite
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Defina sua nova senha de acesso.</p>
          <div className="mt-6">
            <NewPasswordForm mode="reset" />
          </div>
        </div>
      </Reveal>
    </div>
  );
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: compila sem erros; as rotas `/recuperar-senha` e `/redefinir-senha` aparecem no output.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/recuperar-senha/page.tsx" "src/app/(auth)/redefinir-senha/page.tsx"
git commit -m "feat(auth): paginas de recuperar e redefinir senha (#14)"
```

---

### Task 6: Link no login + seção em /perfil

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(app)/perfil/page.tsx`

**Interfaces:**
- Consumes: rota `/recuperar-senha` (Task 5); `NewPasswordForm` (Task 4).
- Produces: link "Esqueceu a senha?" no login; seção "Trocar senha" em /perfil.

- [ ] **Step 1: Adicionar o link no login**

Em `src/app/(auth)/login/page.tsx`, o form tem o campo de senha e, logo abaixo, o bloco de botões `<div className="flex gap-2 pt-1">`. Inserir, **entre** o `</div>` que fecha o campo de senha e o `<div className="flex gap-2 pt-1">`:

```tsx
            <div className="text-right">
              <Link href="/recuperar-senha" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                Esqueceu a senha?
              </Link>
            </div>
```

(`Link` já está importado no arquivo — nenhum import novo.)

- [ ] **Step 2: Adicionar a seção "Trocar senha" em /perfil**

Em `src/app/(app)/perfil/page.tsx`, adicionar o import no topo (junto dos outros):
```ts
import { NewPasswordForm } from "@/components/auth/new-password-form";
```

E inserir, **depois** do `<Reveal><ProfileForm profile={profile} /></Reveal>` e **antes** do `</div>` que fecha o container, um novo bloco:
```tsx
      <Reveal>
        <div className="glass rounded-2xl border border-border p-6">
          <h2 className="font-semibold">Trocar senha</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Defina uma nova senha de acesso.</p>
          <NewPasswordForm mode="change" />
        </div>
      </Reveal>
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: compila sem erros.

- [ ] **Step 4: Configurar Redirect URLs no Supabase (operacional — humano)**

No Supabase → **Authentication → URL Configuration**: conferir a **Site URL** (domínio Vercel) e adicionar aos **Redirect URLs**: `https://<dominio-vercel>/api/auth/callback` e `http://localhost:3000/api/auth/callback`. (Sem isso, o link do e-mail cai no Site URL.) Passo do humano — não bloqueia o build/commit.

- [ ] **Step 5: Verificação manual no app**

Rodar `npm run dev`:
- **Fluxo A:** `/login` → "Esqueceu a senha?" → informar e-mail → mensagem neutra; receber e-mail → o link abre `/redefinir-senha` (logado via recuperação) → definir nova senha → cai em `/` autenticado. Testar link inválido → volta a `/login` com erro; abrir `/redefinir-senha` sem sessão → vai pro `/login`.
- **Fluxo B:** logado, em `/perfil` → "Trocar senha" → definir nova senha → toast de sucesso; sair e entrar com a nova senha.
- **Middleware:** logado, abrir `/recuperar-senha` → redireciona pra `/`.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(auth)/login/page.tsx" "src/app/(app)/perfil/page.tsx"
git commit -m "feat(auth): link esqueci a senha no login + trocar senha em /perfil (#14)"
```

---

## Self-Review (preenchido pelo autor do plano)

**Spec coverage:**
- Validação §6.1 → Task 1. Actions §6.2 → Task 1. Callback §6.3 → Task 2. Middleware §5 → Task 3. `NewPasswordForm` §6.4 → Task 4. Páginas §6.5/6.6 → Task 5. Link no login §6.7 → Task 6. Seção /perfil §6.8 → Task 6. Config Supabase §8 → Task 6 Step 4. Verificação §9 → Task 6 Step 5. ✔ Sem lacunas.

**Placeholder scan:** Sem TBD/TODO; todo passo de código traz o código real; comandos com resultado esperado. ✔

**Type consistency:** `requestPasswordReset(formData: FormData)`/`updatePassword(newPassword: string)` (Task 1) batem com os consumidores: `formAction={requestPasswordReset}` (Task 5) e `updatePassword(password)` no `NewPasswordForm` (Task 4). `resetRequestInput`/`passwordInput` (Task 1) usados só na Task 1. `NewPasswordForm({ mode })` (Task 4) usado com `mode="reset"` (Task 5) e `mode="change"` (Task 6). Constantes do middleware `AUTH_PAGES`/`PUBLIC_PREFIXES` (Task 3) coerentes. `next` default `/redefinir-senha` no callback (Task 2) = rota criada na Task 5. ✔
