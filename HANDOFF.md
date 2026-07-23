# ROTEIRO DE CONTINUIDADE — Zênite Assistente Pessoal (v2)

> **Para o próximo chat:** leia este arquivo inteiro antes de agir. Ele diz onde o projeto está, o que já
> foi feito, o que falta, e como continuar. **Atualizado: 2026-07-23.**

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

## 2. Estado atual (2026-07-23)
- **`main` = `origin/main`** (publicado na Vercel; Ondas 8 e 9 no ar, incluindo o fix #31 do modal de
  importar). Base anterior: `ccbef74`.
- App renomeado para **"Zênite Assistente Pessoal"** com logo (`public/logo.png`) e favicon (`src/app/icon.png`).
- **Config de produção OK (feito pelo usuário):** #9 Google (env `GOOGLE_REDIRECT_URI` na Vercel + redirect no
  Google Cloud) e as env do Admin (`ADMIN_EMAIL`, `SUPABASE_SECRET_KEY`) — **tudo configurado**. Secret rotacionada.
- **Migrações aplicadas no Supabase:** `0000`–`0011` rodadas. ⚠️ **FALTAM: `0012_suggestion_images.sql`**
  (imagens da sugestão) e **`0013_push.sql`** (push), + config do #14 (Redirect URLs) e o operacional do #10
  (VAPID/env + pg_cron) — ver seção 4.

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
- **Onda 2.2 (FEITA, no ar):** **transferência entre contas** (#8). Colunas
  `is_transfer`/`transfer_group` em `transactions`; `createTransfer` cria 2 lançamentos (saída da origem +
  entrada no destino, `is_transfer=true`); `deleteTransferGroup`. Transferência **não** conta em Receitas/
  Despesas nem na quebra por categoria (só move os saldos). UI: checkbox "É transferência" + "Conta destino".
- **Onda 3 (FEITA, no ar):** **assinaturas recorrentes** (#7). Tabela `subscriptions`
  (migr. 0010); rastreador **híbrido** (cadastro manual + detector de candidatos no histórico) e **só de
  referência** (não lança transações). Seção nova em /financas: total mensal, lista de ativas/pausadas,
  "próxima cobrança", chips de candidatos com "+Adicionar" pré-preenchido. Detecção: despesas dos últimos
  6 meses, ≥3 meses/±15%, exclui parcelados (`installments=1`), oculta já cadastradas; a query cai em
  fallback vazio se a tabela não existir (não quebra a página). `getSubscriptions` (data),
  `create/update/deleteSubscription` (actions). Só mensal. Specs/planos `2026-07-10-assinaturas*`.
- **Onda 4 (FEITA, no ar — falta config Redirect URLs):** **recuperação + troca de senha** (#14), sobre o
  Supabase Auth nativo (sem migração). Fluxo A (deslogado): link "Esqueceu a senha?" no login →
  `/recuperar-senha` (mensagem neutra anti-enumeração) → e-mail → `/api/auth/callback`
  (`exchangeCodeForSession`, `next` validado contra open redirect) → `/redefinir-senha` → cai logado em `/`.
  Fluxo B (logado): seção "Trocar senha" em /perfil. Compartilham a action `updatePassword` (retorna
  `{error?}`) e o componente `NewPasswordForm` (`mode: reset|change`). Middleware refinado: `/recuperar-senha`
  e `/api/auth/*` públicos, `/redefinir-senha` protegido. **Escolha: mesmo-dispositivo** (fluxo PKCE; há aviso
  na tela). Specs/planos `2026-07-10-recuperacao-senha*`.

- **Onda 5 (FEITA, no ar — falta migração 0011):** **planejamento mensal** (#11). Tabela `planned_items`
  (migr. 0011); **seção dentro de /financas** (não é aba própria), abaixo de Assinaturas. Lista **contas
  previstas** (a pagar/receber) do mês (mês deriva de `due_date`); **Realizar** lança a transação real e
  vincula via `transaction_id` (FK `on delete set null` = status: null=pendente, preenchido=realizado);
  **Desfazer** apaga a transação. Assinaturas ativas (#7) viram **sugestões** ("+adicionar"). MonthNav do
  /financas passou a permitir **meses futuros**. `getMonthlyPlan` (data, com fallback vazio se a tabela não
  existir), `create/update/delete/realize/unrealizePlannedItem` (actions). **Obs:** implementada por uma
  sessão paralela (empurrada ao GitHub) e **adotada**; review da branch corrigiu duplo-clique no Realizar
  (update atômico) e dedup de sugestões. Specs/planos `2026-07-10-planejamento-mensal*`.
- **Onda 6 (FEITA, no ar — falta migração 0012):** lote de melhorias de UX (branch `feat/melhorias-ux`).
  **#3** fonte dos números → Overpass Mono (zero liso, sem ponto/corte) em `layout.tsx`. **#16** remoção dos
  travessões (—) dos textos visíveis. **#23** cartões de resumo do Dashboard alinhados em qualquer largura
  (rótulo com altura reservada). **#20** sidebar minimizável no desktop (botão "Recolher", `md:w-16`, só
  ícones + tooltip, preferência em localStorage). **#18** agenda lateral do calendário mostra só eventos de
  hoje em diante (grid mantém todos). **#17** sugestões com **várias imagens** + prévia antes de enviar
  (migr. 0012 add `image_urls text[]`). *Obs: mudanças visuais não puderam ser conferidas por screenshot
  (ferramenta travando) — o usuário valida no ar; a fonte do #3 é troca de 1 linha se não agradar.*
- **Onda 7 (FEITA, no ar — falta operacional):** **notificações push de lembretes** (#10), Web Push (**sem
  e-mail**), funciona com o app fechado. Fontes: eventos (`starts_at − reminder_minutes`, recorrentes) e
  tarefas pendentes com `due_on` (08:00 SP). Peças: `public/sw.js`; `NotificationsSetup` + banner automático
  + seção em /perfil; tabelas `push_subscriptions`/`notified_reminders` (migr. **0013**); `getDueReminders`
  (`src/lib/push/reminders.ts`); endpoint `/api/cron/reminders` (service role, `CRON_SECRET`, envia via
  `web-push`, dedup em `notified_reminders`, limpa inscrições 404/410); `supabase/pgcron_reminders.sql`
  (agendador pg_cron/pg_net). Specs/planos `2026-07-10-notificacoes-push*`.
- **Onda 8 (FEITA, no ar em 2026-07-23):** segunda leva de sugestões da aba (#25 a #30). Branch
  `feat/sugestoes-fonte-travessoes`, mergeada na `main` (commits `98ce31f`..`7d062c5`). Spec do #29 em
  `docs/superpowers/specs/2026-07-23-categorias-tarefas-design.md`.
  - **#28** removidos os travessões dos textos visíveis (banner de push, legenda de imagens em /sugestoes) e
    criada a regra no `CLAUDE.md` (nunca usar travessão em texto de UI).
  - **#30** fonte dos números: Overpass Mono trocada por **Plus Jakarta Sans** (sans proporcional, referência
    do app Pierre). `.num` mantém `tabular-nums`; a variável `--font-mono` virou `--font-num`.
  - **#26** cards do Dashboard desalinhados no mobile. Não era CSS (medição confirmou grid alinhado): era a
    animação de entrada `Reveal stagger` transladando cada card na vertical em cascata. Correção: `y={0}` no
    stagger (fade em cascata sem deslocar).
  - **#27** limite do cartão redesenhado no estilo da referência: Utilizado/Limite total + barra + "Mais
    detalhes" expansível (Próxima fatura, Lançamentos futuros, Disponível). Só UI: a fórmula
    `utilizado_total = fatura atual + parcelas futuras` já existia em `data/finance.ts`.
  - **#29** categorias de tarefas: tabela `task_categories` (migr. **0014**, JÁ RODADA) + coluna
    `tasks.category_id` (FK on delete set null). CRUD via modal (nome + cor), select no modal de tarefa, 2ª
    fileira de chips para filtrar (combina com status), chip colorido na tarefa e no Dashboard. `create/
    updateTask` são resilientes se a coluna não existir (não quebram antes da migração).
  - **#25** login Google: **não era código** (o `prompt=select_account` já existe em `api/google/connect`).
    O erro `deleted_client` é porque o `GOOGLE_CLIENT_ID` do app (`...8kil59il...`, apagado) difere do cliente
    válido no Google Cloud (`...n254m80n...`). Pendência do dono (ver seção 4).

- **Onda 9 (FEITA, no ar em 2026-07-23):** **bug #31** do modal de importar extrato em Finanças. O
  `ImportModal` renderizava um `fixed inset-0` inline dentro do `<Reveal>` do cabeçalho; como o Reveal deixa
  um `transform` no ancestral (mesmo após a animação, um `matrix(1,0,0,1,0,0)`), o `position: fixed` se
  ancorava nele e o modal ficava preso atrás dos cards, sem backdrop. Correção: renderizar via `createPortal`
  no `document.body` (mesmo padrão do `components/ui/modal.tsx`) + `z-[100]`. Verificado por medição no
  navegador (overlay passou a cobrir a viewport, como filho do body). Branch `fix/import-modal-portal`.
  Obs: qualquer modal novo deve usar portal (ver seção 5).

### 3.5 SUGESTÕES — fila zerada
As sugestões abertas da aba foram entregues (ondas 1 a 9). Novas ideias entram pela aba **/sugestoes** e
seguem o mesmo fluxo: brainstorming → spec → plano → SDD → merge → push.

## 4. PENDÊNCIAS que dependem de você (fora do código)

> **Atualização 2026-07-23 (Onda 8):**
> - **#25 login Google (pendente):** o `deleted_client` é mismatch de Client ID. Trocar, na **Vercel** e no
>   **`.env.local`**, o `GOOGLE_CLIENT_ID` para `619072094504-n254m80n7tm4rmgm5ir3mb5lmpue12to.apps.googleusercontent.com`
>   e o `GOOGLE_CLIENT_SECRET` para o segredo desse cliente (se não tiver o valor, gerar novo em "+ Add secret"
>   no Google Cloud). Depois redeploy + reiniciar o dev. Testar em aba anônima.
> - **Migração `0014_task_categories` (#29): JÁ RODADA** pelo dono.
> - As migrações `0012_suggestion_images` e `0013_push` e o operacional do push podem já ter sido resolvidos
>   pelo dono (as chaves VAPID/CRON estão no `.env.local`); confirmar se necessário.

1. **Notificações push (#10) — operacional (senão não funciona):**
   a) `npx web-push generate-vapid-keys` → setar no Vercel **e** `.env.local`: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
      `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:...`), e um `CRON_SECRET` qualquer.
   b) Rodar `supabase/migrations/20260701000013_push.sql`.
   c) Habilitar `pg_cron` e `pg_net` (Supabase → Database → Extensions) e rodar `supabase/pgcron_reminders.sql`
      (com `<APP_URL>` e `<CRON_SECRET>` preenchidos). *Validar: /perfil → "Ativar notificações"; criar evento
      em ~2 min com "avisar 1 min antes"; o push deve chegar.*
2. **Sugestões (#17) — rodar `supabase/migrations/20260701000012_suggestion_images.sql`** no Supabase → SQL
   Editor. Sem ela, anexar imagem na sugestão dá erro (coluna `image_urls` não existe).
3. **Verificar no ar a Onda 6** (fonte #3, sidebar #20, alinhamento #23, agenda #18) — não deu pra conferir
   por screenshot aqui. Se o zero da fonte não agradar, é troca de 1 linha em `layout.tsx`.
4. **Sugestões — no `/admin/sugestoes`:** excluir a **#19** e a **#22**; marcar como "feito" as entregues
   (todas as sugestões abertas foram implementadas — ondas 1–7).
5. **Recuperação de senha (#14) — configurar no Supabase → Authentication → URL Configuration:** conferir a
   **Site URL** (domínio Vercel) e adicionar aos **Redirect URLs** o `…/api/auth/callback` (produção) **e**
   `http://localhost:3000/api/auth/callback` (local). Sem isso o link do e-mail cai no Site URL e o fluxo
   quebra. Os e-mails saem pelo SMTP padrão do Supabase (limite baixo no free — ok p/ uso pessoal).
   *Confirmar: em /login → "Esqueceu a senha?" → pedir reset → abrir o link no mesmo dispositivo → definir
   nova senha → cai logado. E em /perfil → "Trocar senha".*
- (Já feitos: #9 Google em produção; env do Admin na Vercel; rotação da SUPABASE_SECRET_KEY; migrações
  0000–0011 rodadas.)

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
