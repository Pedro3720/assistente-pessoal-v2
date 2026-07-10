# Recuperação + troca de senha (#14) — Design

**Data:** 2026-07-10
**Projeto:** `C:\Projetos\assistente-pessoal-v2` (Next.js 16.2.9 / React 19 / Supabase @supabase/ssr / TS strict)
**Status:** Aprovado — pronto para o plano de implementação

> Implementa a sugestão **#14**. Dois fluxos sobre o **Supabase Auth nativo**: (A) **recuperação** por e-mail
> para quem esqueceu a senha e está deslogado; (B) **troca de senha** para quem já está logado (em /perfil).
> **Sem migração** — o Auth cuida de tudo. Segue os padrões do projeto (Server Actions mutam, Zod, sem `any`).

## 1. Decisões (brainstorming)
- Escopo: recuperação (deslogado) **+** trocar senha logado (em /perfil).
- Após redefinir a senha (fluxo A), o usuário vai **direto para o app** (`/`) — a sessão de recuperação já o
  deixa autenticado; não força novo login.
- A etapa final de A (`updateUser({ password })`) é **a mesma** de B → uma Server Action `updatePassword`
  compartilhada e **um** componente de formulário `NewPasswordForm` com prop `mode: "reset" | "change"`.

## 2. Fora de escopo (YAGNI)
- Pedir a senha atual para trocar (o Supabase não exige em `updateUser` com sessão válida).
- Política de senha forte além do **mínimo de 6** já usado no cadastro.
- 2FA, troca de e-mail, "lembrar deste dispositivo".

## 3. Fluxo A — Recuperação (deslogado)
1. **Link no login:** botão/link **"Esqueceu a senha?"** em `/login` → `/recuperar-senha`.
2. **`/recuperar-senha`** (grupo `(auth)`, **público**): form de e-mail → Server Action `requestPasswordReset`
   → `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/api/auth/callback })`. Sempre exibe
   mensagem **neutra** ("Se existir uma conta com esse e-mail, enviamos um link…") — não revela se o e-mail
   existe (anti-enumeração). `origin` derivado de `headers()` (`x-forwarded-proto`/`x-forwarded-host`/`host`).
3. **`/api/auth/callback`** (route handler, **público**): lê `code` (e `next`, default `/redefinir-senha`) →
   `exchangeCodeForSession(code)` (grava os cookies de sessão via `next/headers` — só um route handler pode) →
   sucesso: `redirect(next)`; sem `code`/erro: `redirect(/login?error=Link inválido ou expirado)`.
4. **`/redefinir-senha`** (grupo `(auth)`, **protegido** — chega com a sessão de recuperação): renderiza
   `<NewPasswordForm mode="reset" />`. Sucesso → toast + `router.push("/")`.

## 4. Fluxo B — Trocar senha logado
5. **`/perfil`:** abaixo do `ProfileForm`, uma nova seção (card) com `<NewPasswordForm mode="change" />`.
   Sucesso → toast + limpa os campos (permanece em /perfil).

## 5. Middleware — ajuste cirúrgico (`src/lib/supabase/middleware.ts`)
Hoje: `PUBLIC_ROUTES = ["/login","/cadastro"]`, com duas regras (sem sessão em rota privada → `/login`;
com sessão em rota pública → `/`). O callback de recuperação roda **sem sessão**, então precisa ser público;
e `/redefinir-senha` roda **com** sessão de recuperação, então precisa continuar protegido (senão a regra
"logado → /" o expulsaria). Refinar para:

```ts
const AUTH_PAGES = ["/login", "/cadastro", "/recuperar-senha"]; // logado aqui → redireciona p/ "/"
const PUBLIC_PREFIXES = [...AUTH_PAGES, "/api/auth"];           // sem sessão é permitido
// ...
const path = request.nextUrl.pathname;
const isPublic = PUBLIC_PREFIXES.some((r) => path.startsWith(r));
const isAuthPage = AUTH_PAGES.some((r) => path.startsWith(r));

if (!user && !isPublic) { /* → /login */ }
if (user && isAuthPage) { /* → / */ }
```

Resultado:
- `/recuperar-senha`: público; logado → vai pra `/` (ok).
- `/api/auth/callback`: público **e** fora da regra "logado → /" (funciona mesmo se o usuário já tiver sessão).
- `/redefinir-senha`: **não** é público → sem sessão vai pro `/login`; com sessão (recuperação ou normal) passa.
  (`"/redefinir-senha".startsWith("/recuperar-senha")` é `false` — prefixos distintos, sem colisão.)

## 6. Arquitetura / arquivos

### 6.1 Validação — `src/lib/validation/auth.ts` (novo)
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

### 6.2 Actions — em `src/lib/actions/auth.ts` (junto de login/signup)
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
Imports a adicionar em `auth.ts`: `headers` de `next/headers`; `resetRequestInput`, `passwordInput` de
`@/lib/validation/auth`. (`createClient`, `redirect`, `revalidatePath` já são importados no arquivo.)
`redirect()` lança internamente (control-flow), então o `safeParse` falho encerra ali.

### 6.3 Callback — `src/app/api/auth/callback/route.ts` (novo)
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
`createClient()` está ligado ao `cookies()` do `next/headers`, que é **gravável** em route handlers — então
`exchangeCodeForSession` persiste a sessão (padrão oficial do Supabase SSR).

### 6.4 Componente compartilhado — `src/components/auth/new-password-form.tsx` (novo, client)
Um form com dois campos (nova senha + confirmar). Valida no cliente: min 6 e "senhas iguais"; chama
`updatePassword`; trata erro com `toast`. Pós-sucesso depende do `mode`:
- `mode="reset"`: `toast.success("Senha redefinida! Você já está conectado.")` + `router.push("/")` + `router.refresh()`.
- `mode="change"`: `toast.success("Senha alterada com sucesso.")` + limpa os campos.

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
    if (password.length < 6) { toast.error("A senha precisa de ao menos 6 caracteres."); return; }
    if (password !== confirm) { toast.error("As senhas não conferem."); return; }
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
        <Input id="new-password" type="password" autoComplete="new-password" value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm-password" className="text-sm font-medium">Confirmar senha</label>
        <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
      </div>
      <button type="submit" disabled={saving}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {saving ? "Salvando..." : mode === "reset" ? "Redefinir senha" : "Alterar senha"}
      </button>
    </form>
  );
}
```
> `Input` de `@/components/ui/input` faz `{...props}` no `<input>`, então repassa `value`/`onChange`
> (uso controlado) sem problema — o login já o usa.

### 6.5 Página `/recuperar-senha` — `src/app/(auth)/recuperar-senha/page.tsx` (novo, server)
Espelha o visual do `login/page.tsx` (card `glass`, logo, `ThemeToggle`). Lê `searchParams` `{error?, message?}`
e exibe os banners (igual ao login). Form com um campo de e-mail e `formAction={requestPasswordReset}`, botão
"Enviar link", e um `Link` "Voltar para o login" (`/login`).

### 6.6 Página `/redefinir-senha` — `src/app/(auth)/redefinir-senha/page.tsx` (novo, server)
Card no mesmo estilo, título "Definir nova senha", renderiza `<NewPasswordForm mode="reset" />`.

### 6.7 Login — `src/app/(auth)/login/page.tsx` (modificar)
Adicionar um `Link` discreto **"Esqueceu a senha?"** → `/recuperar-senha` (ex.: abaixo do campo de senha ou
ao lado do label), sem alterar o resto do layout.

### 6.8 Perfil — `src/app/(app)/perfil/page.tsx` (modificar)
Adicionar, abaixo do `<Reveal><ProfileForm/></Reveal>` existente, uma nova `<Reveal>` com um card contendo
título "Segurança" / "Trocar senha" e `<NewPasswordForm mode="change" />`.

## 7. Regras de ouro respeitadas
- Server Actions mutam com Zod; sem `any`. `updateUser`/`resetPasswordForEmail`/`exchangeCodeForSession` são a
  API nativa do Supabase Auth (sem tabela nova, sem RLS).
- Middleware continua a única fonte de proteção de rotas; a mudança é aditiva e cirúrgica.
- Reuso: `Input`, `ThemeToggle`, `Reveal`, `toast`, o visual do login.

## 8. Pendência sua (operacional, fora do código)
No **Supabase → Authentication → URL Configuration**:
- **Site URL** correto (domínio de produção da Vercel).
- **Redirect URLs**: adicionar `…/api/auth/callback` para produção **e** `http://localhost:3000/api/auth/callback`
  para testar local. Sem isso, o link do e-mail cai no Site URL e o fluxo quebra.
- Os e-mails de recuperação saem pelo **SMTP padrão do Supabase** (limite baixo no plano free — suficiente para
  uso pessoal; se precisar de volume, configurar SMTP próprio).

## 9. Verificação
- `npm run build` limpo (tipos, imports, Zod).
- Manual (fluxo A): `/login` → "Esqueceu a senha?" → informar e-mail → receber e-mail → o link abre
  `/redefinir-senha` (logado via recuperação) → definir nova senha → cai em `/` autenticado. Testar link
  inválido/expirado → volta a `/login` com erro. Testar `/redefinir-senha` sem sessão → vai pro `/login`.
- Manual (fluxo B): logado, em `/perfil` → "Trocar senha" → definir nova senha → toast de sucesso; sair e
  entrar com a nova senha.
- Middleware: confirmar que o callback funciona deslogado e que `/recuperar-senha` some para quem está logado.

## 10. Ordem sugerida de implementação
1. Validação `auth.ts` + actions `requestPasswordReset`/`updatePassword`.
2. Callback `api/auth/callback/route.ts`.
3. Ajuste do middleware (AUTH_PAGES/PUBLIC_PREFIXES).
4. `NewPasswordForm` + páginas `/recuperar-senha` e `/redefinir-senha`.
5. Link no `/login` + seção em `/perfil`.
6. `npm run build` + verificação manual; configurar Redirect URLs no Supabase.
