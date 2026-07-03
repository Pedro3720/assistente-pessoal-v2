# Melhorias v2 — Perfil, Sidebar, Tarefas, Cartões, Inputs de Valor e Cadastro

**Data:** 2026-07-02
**Projeto:** `C:\Projetos\assistente-pessoal-v2` (Next.js 16.2.9 / React 19 / Supabase / TS strict)
**Status:** Aprovado — pronto para plano de implementação

> Segue os padrões do projeto (ver `CONTEXT.md` / `Assitentevirtual-Prompt.txt`): Server Components leem
> dados (`lib/data/*`), Server Actions mutam (`lib/actions/*`, "use server", validam com Zod, injetam
> `user_id`, `revalidatePath`), tipos em `types/*`, Zod em `lib/validation/*`, RLS `own_rows` por usuário,
> componentes pequenos, camada visual da seção 11 (glass/card-glow, `.num`, `Reveal`, `CountUp`).
> **AGENTS.md:** este Next.js foge do treino — ler os guias em `node_modules/next/dist/docs/` antes de
> codar rotas, Server Actions e upload.

## 1. Objetivo

Seis melhorias no app v2 (numeração do pedido original do usuário):

- **#3** Poder alterar o nome que o app usa na saudação ("Bom dia, {nome}").
- **#4** Sidebar inteira à esquerda, altura total, sem cortar.
- **#5** Reordenar tarefas por arrastar-e-soltar, com a ordem persistida.
- **#6** Cartões mostrando 3 números claros: fatura a pagar, utilizado (R$) e limite total.
- **#7** Todos os campos de valor formatando automaticamente em R$ (milhar "." e decimal ",").
- **#8** Página de cadastro nova: nome, e-mail, senha, telefone (opcional) e foto (avatar placeholder
  ou upload da foto própria).

## 2. Fora de escopo (YAGNI)

- Ciclo real de fatura por data de fechamento (decidido: fatura = utilizado — visão simples).
- Avatares definitivos (o usuário criará depois; entregamos placeholders + upload próprio).
- Notificações, sync Google, testes e2e — não fazem parte destas melhorias.
- Recuperação de senha / edição de e-mail/senha na página de perfil.

## 3. Backbone compartilhado: tabela `profiles`

`#3` e `#8` dependem de um perfil por usuário. Decisão: **tabela `profiles`** (não só `user_metadata`),
porque a saudação (dashboard) e a sidebar são Server Components que precisam ler `display_name`/`avatar_url`
direto do banco, com RLS.

### Migração `supabase/migrations/20260701000005_profiles.sql`

```
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone        text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own_rows" on public.profiles for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- updated_at (reusa public.set_updated_at() já criada na migração de tarefas)
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- cria o profile automaticamente no signup, lendo o metadata enviado no signUp
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
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
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage: bucket público de avatares; escrita só na própria pasta {user_id}/...
insert into storage.buckets (id, name, public) values ('avatars','avatars', true)
  on conflict (id) do nothing;
create policy "avatar_public_read" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatar_own_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar_own_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
```

> O gatilho garante que o perfil exista mesmo com confirmação de e-mail ligada. O upload da foto, porém,
> precisa de sessão (ver #8 / passos manuais).

### Novos arquivos de apoio

- `src/types/profile.ts` — `interface Profile { id; display_name; phone; avatar_url; }`.
- `src/lib/validation/profile.ts` — Zod: `display_name` (min 1), `phone` (opcional/nullable),
  `avatar_url` (opcional), e schema de cadastro (email, password min 6, + acima).
- `src/lib/data/profile.ts` — `getProfile(): Profile | null` (lê a própria linha).
- `src/lib/actions/profile.ts` — `updateProfile(formData)` e `uploadAvatar(file) → url`
  (Server Actions; validam Zod, `user_id`, `revalidatePath("/", "layout")`).

## 4. Design por melhoria

### #3 — Nome da saudação
- `src/app/(app)/page.tsx`: buscar `getProfile()`; `greeting, {profile?.display_name ?? user.email.split("@")[0]}`.
- Sidebar passa a exibir avatar + `display_name` no rodapé (ver #4).
- Edição em `/perfil` (ver #8, componente reaproveitado).

### #4 — Sidebar inteira à esquerda
- `src/components/layout/sidebar.tsx`: trocar `md:static md:translate-x-0` por
  `md:sticky md:top-0 md:h-screen` (coluna de altura total que não corta nem rola junto). Mobile mantém
  o comportamento deslizante (`fixed` + overlay) atual.
- `src/app/(app)/layout.tsx`: manter `flex min-h-screen`; conferir que `main` não força scroll interno
  que quebre o sticky (usar `flex-1` simples). Verificar visualmente (desktop + mobile).
- Sidebar recebe `profile` (nome + avatar) além do e-mail; rodapé vira link para `/perfil`.

### #5 — Reordenar tarefas (drag-and-drop)
- Migração `supabase/migrations/20260701000006_task_position.sql`:
  `alter table public.tasks add column position int;` + backfill
  (`row_number()` por `user_id` ordenando por `created_at desc`) + `default 0`.
- `src/lib/data/task.ts`: `getTasks` ordena por `position asc, created_at desc`.
- `src/lib/actions/task.ts`: nova `reorderTasks(ids: number[])` — grava `position` = índice no array
  (só linhas do usuário via RLS); `createTask` novo entra no **topo** (`position = min(existente) - 1`),
  preservando o comportamento atual de "mais nova primeiro".
- `src/lib/validation/task.ts`: schema `z.array(z.number().int())` para o reorder.
- `src/components/tasks/tasks-view.tsx`: `@dnd-kit/core` + `@dnd-kit/sortable` na lista; cada item ganha
  um "punho" (grip). Ao soltar, atualiza estado local (otimista) e chama `reorderTasks`; em erro,
  `toast` + `router.refresh()`. Reordenar só faz sentido no filtro "Todas" — desabilitar arraste nos
  outros filtros (ou reordenar dentro do subconjunto preservando os demais).
- **Plano B:** se `@dnd-kit` atritar com React 19, usar drag nativo HTML5 (mesma action `reorderTasks`).

### #6 — Cartões: 3 números claros
- `src/components/finance/card-manager.tsx` (só apresentação; dados já existem em `CardWithInvoice`):
  - **Fatura a pagar** = `card.invoice` (em destaque, `formatBRL`).
  - **Utilizado** = `card.invoice` (mesmo valor; rótulo em R$, junto do `%`).
  - **Limite total** = `card.credit_limit`.
  - Manter barra `bar-grow` com `usePct`. Layout em linha: "Fatura a pagar" grande; abaixo, linha
    "Utilizado R$ X (Y%) · Limite R$ Z".

### #7 — Inputs de valor em R$ (formatação automática)
- Reescrever `src/components/finance/money-input.tsx` (padrão acumulador de centavos):
  - `value` continua string; internamente extrai só dígitos → `cents` → formata `pt-BR` (`1.234,56`).
  - Prefixo visual `R$` (adorno à esquerda no `Input`).
  - Digitar `1` → `0,01`; `123456` → `1.234,56`. Backspace remove o último dígito.
  - Mantém o contrato: emite string que `parseBRL` já entende (ver `lib/money.ts`).
- Cobre automaticamente `bank-manager.tsx`, `card-manager.tsx`, `transactions-section.tsx`
  (todos já usam `MoneyInput`). Conferir se não há `<input>` de dinheiro solto fora do componente.

### #8 — Página de cadastro
- Rota `src/app/(auth)/cadastro/page.tsx` (client, para preview/seleção de avatar). Visual igual ao login
  (glass, `Reveal`, `ThemeToggle`). Campos: **nome** (obrigatório), **e-mail**, **senha**,
  **telefone** (opcional), **foto**: grade de avatares placeholder **ou** botão "enviar foto" (preview).
- `src/app/(auth)/login/page.tsx`: botão "Criar conta" vira `<Link href="/cadastro">` (redireciona).
- `src/lib/supabase/middleware.ts`: `PUBLIC_ROUTES = ["/login", "/cadastro"]`.
- `src/lib/actions/auth.ts`: `signupWithProfile(formData)`:
  1. Valida Zod (nome, email, senha, telefone?, avatar?).
  2. `supabase.auth.signUp({ email, password, options: { data: { display_name, phone } } })` — gatilho cria `profiles`.
  3. Se veio foto (File no FormData) e há sessão: upload para `avatars/{user_id}/avatar.<ext>` →
     `updateProfile({ avatar_url })`. Se avatar placeholder: grava a URL do placeholder direto.
  4. Sucesso → redireciona para `/` (com sessão) ou `/login?message=...` (se confirmação de e-mail ligada).
- Placeholders: 4–6 SVGs simples em `public/avatars/` (o usuário troca depois). `avatar_url` guarda
  `/avatars/preset-N.svg` ou a URL pública do Storage.
- Reaproveitar o seletor/upload de avatar como componente (`src/components/profile/avatar-picker.tsx`)
  usado tanto no `/cadastro` quanto no `/perfil`.

### Página `/perfil` (edição — casa do #3)
- `src/app/(app)/perfil/page.tsx`: form com nome, telefone e `AvatarPicker`; salva via `updateProfile`.
- Rodapé da sidebar linka para cá.

## 5. Segurança
- RLS `own_rows` em `profiles`; políticas de Storage restringem escrita à pasta `{user_id}/`.
- `handle_new_user` é `security definer` com `search_path = public` (evita hijack de schema).
- Server Actions validam Zod e nunca confiam em `user_id` do cliente (usam `auth.getUser()`).
- Nenhuma chave nova exposta ao browser; `.env.local` do v2 permanece intocado.

## 6. Verificação
- Rodar `npm run dev` no v2 e verificar visualmente (skill de verificação):
  - #4 sidebar inteira/topo em desktop e mobile; #7 digitação formatando; #5 arrastar salva ordem
    (recarregar mantém); #6 três números; #3 saudação com nome; #8 cadastro cria conta + perfil + foto.
- `npm run build` sem erros de tipo (TS strict, sem `any`).

## 7. Passos manuais do usuário (Supabase)
1. Rodar `20260701000005_profiles.sql` e `20260701000006_task_position.sql` no SQL Editor.
2. **Auth → desligar confirmação de e-mail** (recomendado p/ app pessoal: cria sessão no signup e o upload
   da foto funciona no cadastro). Se mantiver ligada, a foto própria é enviada depois, no `/perfil`.
3. Conferir bucket `avatars` criado (ou criar pela UI de Storage se a política SQL não rodar).

## 8. Dependências novas
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (drag das tarefas). Plano B: drag nativo.

## 9. Ordem sugerida de implementação
1. Migração `profiles` + tipos/validação/data/actions de profile (backbone).
2. #7 MoneyInput (isolado, rápido, alto valor).
3. #4 sidebar (isolado, rápido) + verificação visual.
4. #6 cartões (pequeno).
5. #3 saudação + `/perfil` + AvatarPicker.
6. #8 cadastro (usa AvatarPicker + middleware + auth action).
7. #5 tarefas (migração position + reorder action + dnd-kit).
8. `npm run build` + verificação visual completa.
