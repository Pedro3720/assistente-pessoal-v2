# ROTEIRO DE CONTINUIDADE — Zênite Assistente Pessoal (v2)

> **Para o próximo chat:** leia este arquivo inteiro antes de agir. Ele diz onde o projeto está, o que já
> foi feito, o que falta, e como continuar. **Atualizado: 2026-07-07.**

---

## 0. Como trabalhar aqui
- Fluxo padrão: **brainstorming → spec → plano → execução (subagentes SDD) → merge → push**.
  Specs em `docs/superpowers/specs/`, planos em `docs/superpowers/plans/`.
- Antes de codar no Next.js, o `AGENTS.md` avisa: **esta versão foge do treino** — leia os guias em
  `node_modules/next/dist/docs/` antes de rotas/Server Actions/config.
- Cada mudança é validada por **`npm run build`** (não há framework de testes) + verificação manual no app.

## 1. Identidade e caminhos (ATENÇÃO — pegadinha)
- **Projeto REAL e ativo:** `C:\Projetos\assistente-pessoal-v2` (`npm run dev` aqui).
- **NÃO confundir** com `C:\Pedro\Arquivos Pedro\Assistente-pessoal-main` — versão antiga/referência (o
  Claude Code às vezes abre o shell nela). Sempre usar caminhos absolutos para o projeto real.
- **GitHub:** `https://github.com/Pedro3720/assistente-pessoal-v2.git`, branch `main`.
- **Deploy (Vercel):** `git push origin main` → a Vercel builda e publica sozinha.
- **Supabase:** projeto `qlqewlrzjlbwrybwrimt` (mesmo banco dev e prod). Chaves no `.env.local` (NÃO commitado;
  a `SUPABASE_SECRET_KEY` foi **rotacionada em 2026-07-07** — o valor atual está no `.env.local`).
- **CLI do Supabase é BLOQUEADA nesta máquina** (Application Control do Windows). **Toda migração é rodada
  MANUALMENTE**: copiar o SQL de `supabase/migrations/*.sql` e colar no **Supabase → SQL Editor**.
- Stack: Next 16.2.9 (App Router) · React 19 · TS strict · Tailwind v4 · @supabase/ssr + supabase-js · Zod ·
  GSAP + Three.js · lucide-react · sonner · @dnd-kit · sharp (gerar assets) · IBM Plex Mono (números).

## 2. Estado atual (2026-07-07)
- **`main` = `origin/main` = commit `d277cae`** (publicado na Vercel).
- App renomeado para **"Zênite Assistente Pessoal"** com logo (`public/logo.png`) e favicon (`src/app/icon.png`).
- **Config de produção OK (feito pelo usuário):** #9 Google (env `GOOGLE_REDIRECT_URI` na Vercel + redirect no
  Google Cloud) e as env do Admin (`ADMIN_EMAIL`, `SUPABASE_SECRET_KEY`) — **tudo configurado**. Secret rotacionada.
- **Migrações aplicadas no Supabase:** `0000`–`0008`. ⚠️ **FALTA rodar a `0009_tx_transfer.sql`** (transferência
  entre contas) — ver seção 4.

## 3. Histórico do que já foi entregue
### 3.1 Base + Melhorias v2/v3 (specs/planos `2026-07-02-melhorias-v2*` e `2026-07-03-melhorias-v3*`)
6 fases + Google Calendar + redesign; depois: saudação com nome, sidebar, reordenar tarefas, cartões
(fatura/utilizado/limite), máscara de R$, **cadastro** (tabela `profiles` + bucket `avatars`, migr. 0005/0006),
tarefas otimistas, foto redimensionada, editar cartão, **parcelamento** (colunas `purchase_group/installments/
installment_no`, migr. 0007), modal via **portal**, aba **/sugestoes** (tabela `suggestions` + bucket, migr. 0008),
CRUD de categorias. Correção do 500 (tabela `profiles` faltava).

### 3.2 Painel Admin de Sugestões — FEITO e no ar
Só o dono (`ADMIN_EMAIL`) vê todas as sugestões de todos com e-mail, marca feito/exclui. Rota `/admin/sugestoes`
(guardada), link "Admin" na sidebar só p/ o dono. Cliente **service role** em `lib/supabase/admin.ts`
(`import "server-only"`), sempre atrás de `assertAdmin()` (`lib/auth/admin.ts`). `getAllSuggestions()`,
`adminSetSuggestionStatus`, `adminDeleteSuggestion`. Sem migração. Specs/planos `2026-07-03-admin-sugestoes*`.

### 3.3 Implementação das SUGESTÕES dos usuários (em ondas — 2026-07-07)
A aba /sugestoes tinha 10 sugestões; estão sendo implementadas em ondas (specs/planos `2026-07-07-*`):
- **Onda 1 (FEITA, no ar):** rebrand **Zênite** + **logo** + favicon (sug. #9/#15) e **números em IBM Plex Mono**
  (#3). Fechada a #13 (pergunta "onde ficam as sugestões" → tabela `suggestions` + bucket). Script de logo:
  `scripts/gen-logo.mjs` (sharp: fundo transparente + favicon em ladrilho escuro).
- **Onda 2.1 (FEITA, no ar):** transações — a nova transação nasce com a **data do mês visualizado** (corrige
  o falso "não registra mais que 4" #6a: as transações sempre salvaram; só não apareciam se o mês aberto era
  outro) + botão **"Ver todas"** abre a lista completa editável em **tela cheia** (`Modal size="full"`) (#6b).
- **Onda 2.2 (FEITA, no ar — falta migração 0009):** **transferência entre contas** (#8). Colunas
  `is_transfer`/`transfer_group` em `transactions`; `createTransfer` cria 2 lançamentos (saída da origem +
  entrada no destino, `is_transfer=true`); `deleteTransferGroup`. Transferência **não** conta em Receitas/
  Despesas nem na quebra por categoria (só move os saldos). UI: checkbox "É transferência" + "Conta destino".

### 3.4 SUGESTÕES QUE FALTAM (próximas ondas)
- **#7** Ver **assinaturas recorrentes** ativas.
- **#11** Aba de **planejamento mensal** (gastos/ganhos previstos ainda não realizados).
- **#14** **Recuperação de senha** (Supabase Auth tem reset por e-mail nativo).
- **#10** **Notificações de lembretes** (a maior/mais complexa — decidir o meio: push/e-mail; deixar por último).
Sugestão de ordem: #7 → #14 → #11 → #10. Cada uma: brainstorming → spec → plano → SDD → merge → push.

## 4. PENDÊNCIAS que dependem de você (fora do código)
1. **Rodar `supabase/migrations/20260701000009_tx_transfer.sql`** no Supabase → SQL Editor — senão **criar
   transferência dá erro** (o resto do app funciona). (As migrações 0000–0008 já foram rodadas.)
   *Confirmar rápido: no app, criar uma transferência entre 2 contas; se salvar, a 0009 rodou.*
- (Já feitos: #9 Google em produção; env do Admin na Vercel; rotação da SUPABASE_SECRET_KEY.)

## 5. Regras de ouro / convenções
- **Arquitetura:** Server Components **leem** (`src/lib/data/*`); Server Actions **mutam** (`src/lib/actions/*`,
  `"use server"`, Zod em `src/lib/validation/*`, `user_id` via `auth.getUser()`, `revalidatePath`). Tipos em
  `src/types/*`. **RLS `own_rows`** em toda tabela. Sem `any`. Componentes pequenos, regra de negócio fora do JSX.
- **Service role** (bypassa RLS): só em `lib/supabase/admin.ts` (`server-only`), **sempre** após `assertAdmin()`.
- **Datas:** fuso SP fixo via `src/lib/dates.ts` (nunca `toISOString().split`). **Dinheiro:** `src/lib/money.ts`
  (`formatBRL`/`parseBRL`). **Cripto:** `src/lib/crypto.ts` (AES-256-GCM, `APP_ENCRYPTION_KEY` — se perder,
  senhas/tokens irrecuperáveis).
- **Modais:** usar `components/ui/modal.tsx` (portal; props `onClose`, `title?`, `size?: "md"|"full"`) — senão o
  `fixed` fica preso atrás dos cards (transform do `<Reveal>`/`glass`).
- **Uploads de imagem:** redimensionar no cliente com `resizeImage` (`lib/images.ts`) e subir via `uploadImageFile`
  (`lib/storage/upload.ts`); limite de Server Action = 4MB (`next.config.ts`).
- **Finanças (modelo):** compra no cartão não mexe no saldo (bank_id null) e vira fatura; `is_card_payment` abate
  fatura e sai da conta; **parcelamento** = N linhas por mês de fatura (`installments`/`installment_no`/
  `purchase_group`); **transferência** = 2 linhas (`is_transfer`/`transfer_group`), fora de receita/despesa.
  Compras parceladas e transferências **excluem-se** dos totais/categoria; ambas ajustam saldos.

## 6. Backlog — "Minor" deferidos (opcionais)
- `Modal` sem focus-trap/`role="dialog"`/aria (a11y). · `resizeImage` rejeita em erro de leitura (callers têm
  try/catch). · Cartão `openEdit`: checagem truthy trata `0` como vazio. · Exclusões usam `confirm()` nativo. ·
  Editar 1 parcela desalinha o grupo. · Bucket `suggestions`/`avatars` sem policy de `update` (inerte, path com
  `Date.now()`). · `defaultDate` (finanças) poderia reusar `monthBounds().start`.

## 7. Documentos no repo
- `AGENTS.md` / `CLAUDE.md` (instruções), `CONTEXT.md` (contexto histórico detalhado).
- `docs/superpowers/specs/` e `docs/superpowers/plans/` — todos os specs e planos por onda/feature.
- `.superpowers/sdd/progress.md` — ledger da última execução por subagentes (não versionado).
