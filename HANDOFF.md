# ROTEIRO DE CONTINUIDADE — Assistente Pessoal v2

> **Para o próximo chat:** leia este arquivo inteiro antes de agir. Ele diz onde o projeto está,
> o que já foi feito, o que falta, e a próxima feature (já especificada e planejada, pronta para
> executar). Data desta atualização: **2026-07-03**.

---

## 0. Como usar este roteiro
- O jeito de trabalhar aqui é: **brainstorming → spec → plano → execução (subagentes) → merge → push**.
  Os specs ficam em `docs/superpowers/specs/` e os planos em `docs/superpowers/plans/`.
- Antes de mexer no Next.js, note o aviso do `AGENTS.md`: **esta versão foge do treino** — leia os guias
  em `node_modules/next/dist/docs/` antes de codar rotas/Server Actions/config.

## 1. Identidade e caminhos (ATENÇÃO — pegadinha)
- **Projeto REAL e ativo:** `C:\Projetos\assistente-pessoal-v2` (é aqui que se trabalha; `npm run dev`).
- **NÃO confundir** com `C:\Pedro\Arquivos Pedro\Assistente-pessoal-main` — essa é uma versão antiga/de
  referência (o Claude Code às vezes abre o shell nela). Sempre use caminhos absolutos para o projeto real.
- **GitHub:** `https://github.com/Pedro3720/assistente-pessoal-v2.git` — branch `main`.
- **Deploy (Vercel):** `push` na `main` → a Vercel builda e publica sozinha. Não se edita nada "dentro da Vercel".
- **Supabase:** projeto `qlqewlrzjlbwrybwrimt` (mesmo banco em dev e prod). URL/chaves no `.env.local` (NÃO commitado).
- **CLI do Supabase é BLOQUEADA nesta máquina** (política de Application Control do Windows). Toda migração
  é aplicada **manualmente**: copiar o SQL de `supabase/migrations/*.sql` e rodar no **Supabase → SQL Editor**.
- Stack: Next 16.2.9 (App Router) · React 19 · TS strict · Tailwind v4 · @supabase/ssr + supabase-js · Zod ·
  GSAP + Three.js (visual) · lucide-react · sonner · @dnd-kit (reordenar tarefas).

## 2. Estado atual (2026-07-03)
- Branch `main` = `origin/main` = **commit `25de56b`** (publicado na Vercel).
- Última grande entrega: **Melhorias v3** (itens #3–#10) + correção de bug da revisão final. Já em produção.
- **Pendências que dependem SÓ de você** — ver seção 4.
- **Próxima feature já planejada, NÃO implementada:** painel de administração de sugestões — ver seção 5.

## 3. O que já foi entregue (histórico)
### 3.1 Base (antes deste ciclo)
6 fases + Google Calendar + redesign visual premium. Migrações `0000_finance` … `0004_google` aplicadas.

### 3.2 Melhorias v2 (itens #3–#8) — spec/plano `2026-07-02-melhorias-v2*`
Nome na saudação, sidebar inteira à esquerda, reordenar tarefas (arrastar), cartões com fatura/utilizado/limite,
máscara automática de R$ nos inputs, e **página de cadastro** com nome/telefone/foto. Backbone: tabela
`profiles` + bucket `avatars` (migrações **0005_profiles**, **0006_task_position**).

### 3.3 Correção do erro 500 na Vercel
Causa: a tabela `profiles` (migração 0005) não tinha sido aplicada, e `getProfile()` era chamado no layout de
toda página logada sem try/catch → 500. **Corrigido:** você rodou a 0005; e o `getProfile` foi endurecido para
degradar em `null` (commit `c5e299d`). 

### 3.4 Melhorias v3 (itens #3–#10) — spec/plano `2026-07-03-melhorias-v3*`
Commits `fbc1bf9`..`25de56b`:
- **#3** Tarefas: concluir/excluir **instantâneo** (UI otimista).
- **#4** Perfil: foto **redimensionada no navegador** antes do upload (resolveu o erro de "unexpected response").
- **#5** **Editar** cartão de crédito.
- **#6** Cartão com **parcelamento**: colunas novas em `transactions` (`purchase_group/installments/installment_no`);
  ação `createInstallmentPurchase` (expande em N parcelas por mês de fatura) + `deleteTransactionGroup`; e os 5
  valores por cartão: **Fatura a pagar (mês) / Em aberto / Utilizado / Disponível / Limite total**.
- **#7** Modal de nova transação via **portal** (não fica mais atrás dos cards). Componente novo `components/ui/modal.tsx`.
- **#8** Aba de **Sugestões** (`/sugestoes`): tabela `suggestions` + bucket `suggestions`; usuário registra texto+print.
- **#9** Google: o código já força `prompt: "select_account consent"` (seletor de conta). É questão de **config de
  produção**, não de código (ver seção 4).
- **#10** **CRUD de categorias** de receita/despesa (gerenciador na página de Finanças).
- Bug corrigido na revisão final (`25de56b`): valores do cartão respeitam o mês navegado (usavam "hoje").
- Utilitários novos reaproveitáveis: `components/ui/modal.tsx` (portal), `lib/images.ts` (`resizeImage`),
  `lib/storage/upload.ts` (`uploadImageFile(supabase, bucket, userId, file)`).

## 4. PENDÊNCIAS que dependem de você (fora do código)
1. **Rodar no Supabase → SQL Editor** (se ainda não rodou), nesta ordem:
   - `supabase/migrations/20260701000007_tx_installments.sql` — senão criar compra parcelada falha.
   - `supabase/migrations/20260701000008_suggestions.sql` — senão a página `/sugestoes` dá 500 (resto funciona).
   *(Como confirmar rápido: no app, criar uma sugestão e uma compra parcelada; se funcionarem, as migrações rodaram.)*
2. **#9 Google (config de produção):** na Vercel, `GOOGLE_REDIRECT_URI` = `https://<seu-domínio>/api/google/callback`
   (não localhost) e adicionar esse mesmo redirect no Google Cloud Console (OAuth client). O código já força o seletor.
3. **Segurança:** a `SUPABASE_SECRET_KEY` foi exposta em chat antes — **recomendado rotacionar** no painel do
   Supabase e atualizar no `.env.local` e na Vercel.

## 5. PRÓXIMA FEATURE — Painel admin de Sugestões (planejado, NÃO implementado)
Objetivo: uma aba onde **só o dono** vê **todas** as sugestões de **todos** os usuários (com o **e-mail** de quem
enviou), podendo marcar feito/aberto e excluir.
- **Spec:** `docs/superpowers/specs/2026-07-03-admin-sugestoes-design.md`
- **Plano (4 tasks, código completo):** `docs/superpowers/plans/2026-07-03-admin-sugestoes.md`
- **Resumo técnico:** cliente Supabase com **service role** (`lib/supabase/admin.ts`, `import "server-only"`),
  usado sempre atrás de `assertAdmin()` (`lib/auth/admin.ts`, compara com env **`ADMIN_EMAIL`**); `getAllSuggestions()`
  lê tudo + e-mails via `auth.admin.listUsers()`; ações `adminSetSuggestionStatus`/`adminDeleteSuggestion`; página
  protegida `/admin/sugestoes`; link "Admin" na sidebar só para o dono. **Sem migração de banco.**
- **Passos manuais desta feature (env):** adicionar **`ADMIN_EMAIL=pedrovvp12@gmail.com`** no `.env.local` e na
  Vercel; garantir **`SUPABASE_SECRET_KEY`** também na Vercel (hoje só no `.env.local`).
- **Como executar no próximo chat:** siga o plano com a skill `superpowers:subagent-driven-development` (um subagente
  por task, revisão entre elas), OU `superpowers:executing-plans`. Setup: `git checkout main && git pull --ff-only`
  então `git checkout -b feat/admin-sugestoes`; ao terminar, `superpowers:finishing-a-development-branch` → merge na
  `main` → `git push origin main`.

## 6. Regras de ouro / convenções (não repetir erros antigos)
- **Arquitetura:** Server Components **leem** (`src/lib/data/*`); Server Actions **mutam** (`src/lib/actions/*`,
  `"use server"`, validam **Zod** em `src/lib/validation/*`, injetam `user_id` via `auth.getUser()`, `revalidatePath`).
  Tipos em `src/types/*`. **RLS `own_rows`** (auth.uid()=user_id) em toda tabela. Sem `any`. Componentes pequenos.
- **Service role:** NUNCA no browser. Só em módulo `server-only`, sempre depois de `assertAdmin()`.
- **Datas:** fuso SP fixo via `src/lib/dates.ts` (nunca `toISOString().split`). **Dinheiro:** `src/lib/money.ts`
  (`formatBRL`/`parseBRL`). **Cripto:** `src/lib/crypto.ts` (AES-256-GCM, chave `APP_ENCRYPTION_KEY` — se perder, senhas/tokens irrecuperáveis).
- **Sem framework de testes** no repo: o "gate" de cada mudança é **`npm run build`** passando (TS strict) +
  verificação manual rodando o app. Migrações são entregues como SQL para rodar manualmente.
- **Modais** devem usar `components/ui/modal.tsx` (portal) — senão o `fixed` fica preso atrás dos cards (por causa do
  `transform` do `<Reveal>`/`glass`).
- **Uploads de imagem:** redimensionar no cliente com `resizeImage` (lib/images.ts) e subir via `uploadImageFile`
  (lib/storage/upload.ts); o limite de Server Action está em 4MB (`next.config.ts`).

## 7. Backlog — achados "Minor" deferidos (opcionais, não urgentes)
- `Modal` sem focus-trap / `role="dialog"` / aria-modal (acessibilidade).
- `resizeImage` rejeita em erro de leitura em vez de cair no arquivo original (callers têm try/catch).
- Cartão `openEdit`: checagem truthy trata limite/`bank_id` = 0 como vazio.
- Exclusões usam `confirm()` nativo (padrão do app).
- Editar uma parcela individual desalinha o grupo (sem edição estrutural no MVP).
- Bucket `suggestions` só tem policy de `insert` (não `update`); inerte porque o caminho usa `Date.now()`.

## 8. Documentos de referência no repo
- `AGENTS.md` / `CLAUDE.md` — instruções do projeto (ler docs do Next antes de codar).
- `CONTEXT.md` — contexto detalhado do projeto (histórico anterior).
- `docs/superpowers/specs/` e `docs/superpowers/plans/` — specs e planos (v2, v3, admin-sugestoes).
- `.superpowers/sdd/progress.md` — ledger da última execução por subagentes (não versionado).
