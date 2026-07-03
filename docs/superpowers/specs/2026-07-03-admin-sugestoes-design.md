# Painel de administração de Sugestões

**Data:** 2026-07-03
**Projeto:** `C:\Projetos\assistente-pessoal-v2` (Next.js 16.2.9 / React 19 / Supabase / TS strict)
**Status:** Aprovado — pronto para o plano de implementação

## 1. Objetivo

Uma aba de administração onde **apenas o dono** vê **todas** as sugestões de **todos** os usuários (título, descrição, print, data, **e-mail de quem enviou** e status), podendo **marcar feito/aberto** e **excluir** qualquer uma — para acompanhar e aplicar as melhorias depois.

## 2. Fora de escopo (YAGNI)

- Múltiplos admins / papéis (um único dono via `ADMIN_EMAIL`).
- Comentar/responder sugestões; notificações/e-mail.
- Paginação avançada (a base é pequena; `listUsers` traz até 1000).

## 3. Arquitetura

Como o painel precisa mostrar o **e-mail** de quem enviou (dado de outros usuários; o `auth.users` não é exposto ao cliente normal e o RLS isola cada usuário), a leitura passa por um **cliente com service role**, usado **somente no servidor** e **sempre atrás de uma checagem de admin**. (Alternativa de políticas de admin no banco foi descartada por não entregar e-mail.)

**Fluxo:** rota/data/action → `assertAdmin()` (confere o usuário logado real) → `createAdminClient()` (service role, ignora RLS) → lê/edita tudo. O service role nunca vai ao browser.

## 4. Componentes / arquivos

**Criar:**
- `src/lib/supabase/admin.ts` — `createAdminClient()`: `@supabase/supabase-js` `createClient(URL, SUPABASE_SECRET_KEY, { auth: { persistSession:false, autoRefreshToken:false }})`. Primeira linha do arquivo: `import "server-only";` (impede import em client component). **Ignora RLS — usar só atrás de `assertAdmin()`**.
- `src/lib/auth/admin.ts`:
  - `isAdminEmail(email: string | null | undefined): boolean` — compara (case-insensitive, trim) com `process.env.ADMIN_EMAIL`.
  - `assertAdmin(): Promise<void>` — pega o usuário via `createClient()` (RLS) + `auth.getUser()`; se `!isAdminEmail(user?.email)` → `throw new Error("Acesso restrito")`.
- `src/components/suggestions/admin-suggestions-view.tsx` (client) — lista todas as sugestões com autor (e-mail/nome), status, print, e botões marcar feito/aberto + excluir (chamam as admin actions + `router.refresh()` + `toast` em erro).
- `src/app/(app)/admin/sugestoes/page.tsx` (Server Component) — guarda: `isAdminEmail(user?.email)` senão `redirect("/")`; lê `getAllSuggestions()`; renderiza a view.

**Modificar:**
- `src/types/suggestion.ts` — `interface SuggestionWithAuthor extends Suggestion { author_email: string; author_name: string | null; }`.
- `src/lib/data/suggestion.ts` — `getAllSuggestions(): Promise<SuggestionWithAuthor[]>`: `assertAdmin()`; cliente admin lê todas as `suggestions` (`select` inclui `user_id`, `order created_at desc`); busca e-mails via `admin.auth.admin.listUsers({ page:1, perPage:1000 })` (map `id→email`) e nomes via `admin.from("profiles").select("id, display_name")` (map `id→display_name`); devolve cada linha enriquecida (`author_email` = e-mail ou `"—"`, `author_name` = display_name ou `null`).
- `src/lib/actions/suggestion.ts` — `adminSetSuggestionStatus(id, status)` e `adminDeleteSuggestion(id)`: cada uma `assertAdmin()` → cliente admin `update`/`delete` por `id` → `revalidatePath("/admin/sugestoes")`. (Valida status com o `suggestionStatus` já existente.)
- `src/app/(app)/layout.tsx` — calcular `const isAdmin = isAdminEmail(user.email);` e passar `isAdmin` para `<Sidebar>`.
- `src/components/layout/sidebar.tsx` — receber `isAdmin?: boolean`; quando `true`, mostrar um item **"Admin"** (ícone `Shield`, href `/admin/sugestoes`) no fim da navegação. Não muda o rodapé/perfil.

## 5. Segurança
- Service role só no servidor (`import "server-only"` em `admin.ts`) e **sempre** após `assertAdmin()`. Nenhuma chave nova exposta ao browser.
- Guarda em profundidade: a **página** redireciona não-admins **e** cada data/action refaz `assertAdmin()`.
- `getSuggestions`/`createSuggestion`/`setSuggestionStatus`/`deleteSuggestion` (usuário comum) permanecem via RLS, inalterados.

## 6. Passos manuais do usuário (env — sem migração de banco)
- Adicionar **`ADMIN_EMAIL=pedrovvp12@gmail.com`** ao `.env.local` (local) **e** às Environment Variables da **Vercel**.
- Garantir **`SUPABASE_SECRET_KEY`** também nas env vars da **Vercel** (hoje só está no `.env.local`).
- Como a `SUPABASE_SECRET_KEY` já foi exposta antes, **recomendado rotacioná-la** no painel do Supabase e atualizar nos dois lugares.
- Sem `ADMIN_EMAIL` definido, ninguém é admin (o link "Admin" não aparece e `/admin/sugestoes` redireciona) — comportamento seguro por padrão.

## 7. Verificação
- `npm run build` sem erro de tipo.
- Logado como o `ADMIN_EMAIL`: aparece o link **Admin** na sidebar; `/admin/sugestoes` lista todas as sugestões com **e-mail** do autor; marcar feito/aberto e excluir funcionam (inclusive em sugestões de outros usuários).
- Logado como outro usuário: **sem** link Admin; acessar `/admin/sugestoes` redireciona para `/`.

## 8. Ordem sugerida
1. `admin.ts` (service role) + `auth/admin.ts` (`isAdminEmail`/`assertAdmin`).
2. Tipo `SuggestionWithAuthor` + `getAllSuggestions` + admin actions.
3. Página `/admin/sugestoes` + view.
4. Sidebar/layout com `isAdmin`.
5. `npm run build` + verificação.
