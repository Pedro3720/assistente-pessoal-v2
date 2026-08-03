# ROTEIRO DE CONTINUIDADE — Zênite Assistente Pessoal (v2)

> **Para o próximo chat:** leia este arquivo inteiro antes de agir. Ele diz onde o projeto está, o que já
> foi feito, o que falta, e como continuar. **Atualizado: 2026-08-03.**

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
- **Onda 13 (2026-07-27): COMPLETA e no ar** — modernização visual e interatividade em 5 fases
  (ver 3.13), commit `fb652bd`.
- **Onda 14 (2026-07-28): COMPLETA** — calendário, card de contas e revisão do extrato (ver
  3.15). Correção da sugestão #32 (overflow no celular) no commit `7592c66`, ver 3.14.
- **Onda 17 (2026-07-29): COMPLETA** — login com Google, reordenar tarefas com filtro ativo e
  centralização das abas (ver 3.18). O `npm run build` que ficou pendente na sessão original
  (o harness perdeu o Bash) foi rodado em 2026-08-03 e passou; o código foi commitado direto na
  `main`, não na branch citada na 3.18. **Pendente do dono:** medição no navegador e a
  configuração do provider Google no Supabase para o login funcionar de verdade.
- **Onda 18 (2026-08-03): EM ANDAMENTO na branch `feat/onda18-redesign`** — redesign visual em
  várias tasks (ver 3.19). Task 12 (legenda do donut com `Meter`, preparada para o limite por
  categoria que ainda não existe no banco) feita e commitada (`407ed38`). Task 14 (tabela de
  transações no `DataTable`, última task do piloto) feita e commitada (`09f322a`); `AccountsSummary`
  saiu da Visão geral e foi para a aba Cartões. Task 15 (limite mensal por categoria, única task
  com funcionalidade nova) feita e commitada (`53718ba`): migração já rodada pelo dono (`aa6a4b1`),
  campo "Limite mensal" no formulário de categorias, e a legenda (Task 12) agora mostra o limite
  real em vez de "Sem limite definido" fixo. Não mesclada na `main`, sem push.

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

### 3.6 PWA (virar app de iPhone) — Fase 1 FEITA (branch `feat/pwa-iphone`, ainda NÃO na main)
Decisão: transformar o site em app de iPhone via **PWA** (o dono não tem Mac nem conta Apple Developer,
então App Store/nativo fica pro futuro; PWA reusa tudo e pode virar Capacitor depois). Spec e plano em
`docs/superpowers/specs/2026-07-23-pwa-iphone-design.md` e `docs/superpowers/plans/2026-07-23-pwa-fase1.md`.
**Fase 1 (instalável na tela inicial):** `src/app/manifest.ts` (display standalone); meta/ícones Apple no
`layout.tsx` (`apple-mobile-web-app-capable` legado via `other` para o iOS abrir em tela cheia,
`apple-touch-icon`, `theme-color`, `viewport-fit=cover`); `scripts/gen-pwa-icons.mjs` gera
`public/icons/*` (192, 512, 512-maskable, apple-touch 180) a partir do `public/logo.png`; e
`components/pwa/ios-install-hint.tsx` (dica "Adicionar à Tela de Início", só em iOS Safari fora do
standalone, dispensável em localStorage). Verificado no navegador (manifest + head corretos);
**validação real é no iPhone do dono** (instalar e abrir em tela cheia).
**Fase 2 FEITA (branch `feat/pwa-fase2`):** offline + service worker unificado, feito **na mão** (não
Serwist, para não arriscar o push que já funciona). `public/sw.js` reescrito: mantém os handlers de push
e ganha cache de estáticos (stale-while-revalidate em `/_next/static`, `/icons`, `logo`, manifest) e
fallback de navegação para `public/offline.html` sem conexão. `components/pwa/register-sw.tsx` registra o
SW em toda carga (antes só quem ativava push), renderizado no `layout.tsx` raiz. Não cacheia cross-origin
(Supabase/Google) nem `/api/*`. Verificado no navegador (SW ativo, cache `zenite-v1`, offline precached).
**Fase 3 FEITA (branch `feat/pwa-fase3`):**
- **3a safe areas:** `env(safe-area-inset-*)` no hambúrguer, no drawer da sidebar e no padding do
  conteúdo (`(app)/layout.tsx`), para o topo não ficar sob a status bar/notch no standalone. Mais
  `overscroll-behavior-y: none` e tap-highlight transparente no `body`. Auto-neutro no desktop (inset 0).
- **3b splash:** `scripts/gen-pwa-splash.mjs` gera 9 telas de abertura (por resolução de iPhone) em
  `public/splash/`; `components/pwa/apple-splash.tsx` rende os `<link rel="apple-touch-startup-image">`
  (o React 19 iça pro `<head>`). iPhones não casados caem no `background_color` escuro do manifest.
- **3c Face ID no cofre:** `lib/passwords/biometric.ts` (WebAuthn com autenticador de plataforma) +
  `components/passwords/vault-lock.tsx`. Ao abrir /senhas com a proteção ativa, o cofre fica bloqueado
  até o Face ID; sair e voltar tranca de novo. O botão "Proteger" só aparece se o dispositivo tiver
  biometria; a credencial fica só no dispositivo (localStorage). Há um escape discreto para desativar
  (evita lockout). **É trava de INTERFACE**, escolha consciente do dono: não blinda o `revealPassword`
  no servidor (a alternativa robusta seria WebAuthn verificado server-side, com tabela e desafios).

Validação real de todo o PWA (instalar, tela cheia, splash, notch, offline, Face ID) é **no iPhone do dono**.

### 3.7 Layout de celular reproporcionado (2026-07-23, branch `fix/mobile-layout`)
Dono relatou telas "cortadas" no iPhone. **Diagnóstico medido (320px e 390px): o layout NÃO estoura na
horizontal** (`scrollWidth` = viewport, zero offenders), então o corte relatado é compatível com a página
estar **com zoom (pinch)** no PWA, não com bug de CSS. Confirmar com o dono (pinch para fora).
Ainda assim as proporções estavam grandes demais para celular (referência: app Pierre). Ajustes, todos
atrás de `md:` (desktop inalterado):
- padding lateral do app `px-6` → `px-4` no mobile (largura útil 342 → 358px);
- títulos de página `text-4xl` → `text-3xl md:text-4xl` (36 → 30px) em **11 telas**;
- ritmo vertical do dashboard `space-y-8` → `space-y-5 md:space-y-8`;
- cards de resumo (dashboard e finanças) compactados (`p-4`, gap menor, valor `text-xl md:text-2xl`);
  altura do card caiu de ~146 para 126px, mantendo o alinhamento da correção #26.
Ideias maiores não feitas (precisariam de brainstorm próprio): cantos mais arredondados, redesenho visual
dos cards. (A barra de navegação inferior foi feita, ver 3.8.)

### 3.8 Navegação iPhone estilo Pierre (branch `feat/nav-iphone`) — executada por SDD
Spec/plano em `docs/superpowers/plans/2026-07-23-navegacao-iphone.md`. Executada pelo fluxo
subagent-driven (implementador + revisor por tarefa + revisão final opus). Ledger em
`.superpowers/sdd/progress.md`.
- **Barra inferior** (`src/components/layout/bottom-nav.tsx`, `md:hidden`): abas Início, Finanças, [+],
  Tarefas, Agenda. Fixa no rodapé, vidro, respeita `env(safe-area-inset-bottom)`, `aria-current` na aba
  ativa. Desktop mantém a sidebar (nada muda em `md+`).
- **Folha de ações rápidas** (`src/components/layout/quick-actions.tsx`, via `createPortal`): o "+" abre
  uma folha inferior com Nova transação / Nova tarefa / Novo evento, que navegam com `?new=1`.
- **`?new=1`**: `tasks-view`, `calendar-view` e `transactions-section` detectam o parâmetro no mount,
  abrem o modal de criação e limpam a URL (`router.replace`).
- Integração no `(app)/layout.tsx`: `<BottomNav />` fora do `<main>`, e o `pb` do conteúdo subiu para
  `+6rem` (reserva espaço da barra). Verificado no navegador (390px: barra fixa + folha; 1100px: `display:none`).
- Revisão final (opus): READY TO MERGE, 0 Critical/Important. Minors adiados: folha não trava scroll do body.

**Atualização 2026-07-24 (branch `feat/iphone-nav-v2`, no ar):**
- **Viewport travado** (`layout.tsx` raiz): `maximum-scale=1, user-scalable=no`. O PWA instalado memorizava o
  pinch-zoom e reabria cortado/zoomado; travar a escala faz sempre abrir na proporção correta (cara de app nativo).
  Reforço (commit `bb320f6`): `LockZoom` (`components/pwa/lock-zoom.tsx`) bloqueia os eventos `gesture*` do
  Safari (pinch) e `touch-action: manipulation` no body mata o double-tap. **IMPORTANTE:** o iOS guarda o
  estado de zoom do PWA instalado separado do conteúdo; para resetar um zoom já preso, o dono precisa
  **remover e readicionar** o app na tela inicial (uma vez). Depois disso o bloqueio impede recorrência.
  Confirmado no código; não há overflow de CSS (medido a 320/390px: `scrollWidth == viewport`).
- **CAUSA RAIZ do "app cortado" no iPhone (commit `5b9addd`):** NÃO era zoom. Era o **fundo animado**
  (`components/effects/animated-background.tsx`): o canvas Three.js era dimensionado por `window.innerWidth`
  (que no PWA standalone do iOS reporta mais que a viewport de layout) e ficava num `fixed inset-0` **sem
  clip**, tornando a página **arrastável na horizontal** e empurrando o conteúdo pra fora da tela (o Chrome
  não reproduz, reporta innerWidth consistente). Correção: dimensionar pela `documentElement.clientWidth`
  (viewport de layout, confiável no iOS) + `overflow-hidden` no container do canvas + `overflow-x: clip` na
  raiz (globals.css, não quebra sticky). Verificado a 390px: canvas 390, `overflowPx 0`. **Não precisou
  redesenhar o dashboard.** Lição: no iOS, dimensionar canvas/elementos fixos por `clientWidth`, nunca
  `innerWidth`, e clipar overlays fixos.
- **Fundo animado REMOVIDO (commit `210dd10`):** o dono pediu para tirar o canvas e deixar cor sólida escura.
  `AnimatedBackground` saiu do `layout.tsx` e o arquivo `components/effects/animated-background.tsx` foi
  apagado. O fundo agora é a cor sólida do tema (`bg-background`, `#080b12` no dark). Isso elimina de vez a
  única fonte de overflow horizontal no iPhone. `overflow-x: clip` na raiz permanece como rede de segurança.
  Repro fiel do dashboard completo medido a 375 e 390px: `overflowPx 0`. Se quiser o efeito de volta um dia,
  está no histórico do git.

### 3.9 App Android nativo via Capacitor (branch `feat/android-capacitor`, no ar)
O dono desistiu do PWA no iOS (o corte persistia só lá) e pediu **app nativo de Android, sem Play Store**.
Solução: **Capacitor** com WebView que **carrega o site da Vercel** (`assistente-pessoal-v2.vercel.app`),
reusando 100% do app (o app é SSR, então não dá pra empacotar offline; precisa de internet, igual PWA).
Como é WebView do Android (não PWA do iOS), **não tem o bug de proporção**.
- `capacitor.config.ts`: `appId com.zenite.assistente`, `appName Zênite`, `server.url` = produção,
  `webDir capacitor/www` (fallback offline). Deps `@capacitor/core|android|cli` (v8).
- **APK gerado na nuvem** (`.github/workflows/android-apk.yml`, disparo manual `workflow_dispatch`):
  não precisa de Android Studio local. Actions -> "Build Android APK" -> Run -> baixa o artifact
  `zenite-android-apk` -> instala no celular (sideload, "fontes desconhecidas").
- Pasta `android/` é **gerada no CI** a cada build (gitignored); `npx cap add android` local só foi usado
  para validar a config.
- Pendências/limitações: APK é **debug** (não assinado pra release; ok pra uso pessoal via sideload).
  Ícone/splash nativos ainda são os default do Capacitor (customizar depois com `@capacitor/assets`).
  Login Google via OAuth pode ser bloqueado em WebView ("disallowed_useragent"); login por e-mail/senha
  funciona. Se o domínio da Vercel mudar, atualizar `server.url` no `capacitor.config.ts`.
- **Navegação toda no menu inferior (mobile)** + **sidebar virou desktop-only.** Barra:
  Início · Finanças · [+] · Agenda · **Mais**. A aba "Mais" (`components/layout/more-sheet.tsx`, folha via portal)
  leva Tarefas, Senhas, Sugestões, Admin (se admin), Perfil, Tema e Sair. O `Sidebar` agora é `hidden md:flex`
  (sem hambúrguer/drawer no celular); no desktop continua igual. `BottomNav` recebe `isAdmin`. Verificado no
  navegador (390px: barra + folha, sem sidebar; 1100px: sidebar, sem barra).

### 3.10 Segurança — Onda 10 (Nível 1: config e higiene) — 2026-07-27
Primeiro nível de um endurecimento de segurança em 5 níveis (crescente). **Só o Nível 1 foi feito;**
os próximos param para revisão. Build validado (`npm run build` OK) e app conferido no ar (prod local:
CSP não quebra nada, headers presentes, `next/image` OK).
- **Security headers + CSP** (`next.config.ts` via `headers()`): CSP travando `default/object/base/
  frame-ancestors/form-action`; `connect-src`/`img-src` só self + Supabase (as chamadas ao Google são
  server-side). Mais HSTS (2 anos), `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy` (desliga câmera/mic/geo/etc., mantém WebAuthn do cofre) e `X-DNS-Prefetch-Control`.
  A CSP afrouxa só no dev (HMR usa eval/websocket). Nota: `script-src` usa `'unsafe-inline'` porque a CSP
  aqui é estática (sem nonce por request); ainda barra scripts externos. Robustez extra futura: CSP com
  nonce no middleware.
- **WebView do Android (Capacitor):** revisado, sem mudança de código. O app carrega o site remoto da
  Vercel (`server.url` + `cleartext: false`), então a CSP do servidor (acima) vale dentro do WebView.
- **HTTPS:** a Vercel já redireciona http->https; o HSTS memoriza isso no navegador. `upgrade-insecure-
  requests` na CSP em produção.
- **Dependabot** (`.github/dependabot.yml`): PRs semanais de atualização (npm + github-actions), patch/
  minor agrupados. **Ação do dono:** ativar Dependabot alerts em GitHub -> Settings -> Security.
- **npm audit no CI** (`.github/workflows/security-audit.yml`): roda em push/PR/semanal; gate falha só em
  **crítico** (highs são reportados no log, não travam o pipeline, porque há highs transitivos sem correção
  segura hoje).
- **Correção de dependências (higiene):** `next` 16.2.9 -> **16.2.12** (fecha CVEs de alto risco do próprio
  Next: bypass de middleware/proxy, SSRF em Server Actions, exposição de endpoints de Server Functions, DoS,
  cache confusion, DoS de SVG no image optimizer). `sharp` 0.34.5 -> **0.35.3** via `overrides` (CVEs do
  libvips). **Residual conhecido e aceito:** `postcss` embutido no Next (build-time, não vai pro runtime;
  o único "fix" do npm é derrubar o Next pra v9) e `brace-expansion` (só no eslint/dev). Ficam pro
  Dependabot quando houver correção limpa. **Ação do dono:** revisar antes do `git push` (o deploy da
  Vercel rebuilda com o Next novo).
- **Arquivos:** `next.config.ts`, `.github/dependabot.yml`, `.github/workflows/security-audit.yml`,
  `package.json`/`package-lock.json` (bump + override), `.claude/launch.json` (config `prod` para conferir
  a CSP de produção). Sem migração SQL neste nível.

**Ação do dono (Nível 1) — painel do Supabase Auth e GitHub:**
1. **GitHub -> Settings -> Code security:** ativar **Dependabot alerts** e **Dependabot security updates**.
2. **Supabase -> Authentication -> proteção de senha:** ativar **"Leaked password protection"** (checa
   HaveIBeenPwned) e definir **política de senha forte** (mínimo 8+, ideal 10-12, exigir letras+números).
3. **Supabase -> Authentication -> Providers -> Email:** exigir **confirmação de e-mail** antes do primeiro
   login (obs: muda o fluxo de /cadastro, o usuário confirma o e-mail antes de entrar).
4. **Supabase -> Authentication -> URL Configuration:** revisar **Site URL** e a lista de **Redirect URLs**,
   deixando só as URLs exatas de callback (produção `…/api/auth/callback` e `…/api/google/callback`, mais o
   `http://localhost:3000/...` para dev). Sem curingas amplos. (Casa com a pendência de recuperação de senha.)
5. **Supabase -> Billing / spend cap:** no **plano Free o spend cap já vem LIGADO e travado** (só dá pra
   desligar no Pro), então NÃO há susto de custo: ao estourar a cota grátis o projeto fica só-leitura em vez
   de cobrar. **Nada a fazer no Free** (é só dar Cancel na tela do spend cap). Acompanhar uso em
   **(organização) -> Usage/Reports**. Rever só se migrar pro Pro. Opcional: **Auth -> Rate Limits**.
6. Opcional (bônus): habilitar **MFA (TOTP)** em Authentication para a conta do dono.
7. Depois de revisar o Nível 1, **`git push`** (a Vercel builda e publica com o Next 16.2.12).

### 3.11 Segurança — Onda 11 (Nível 2: consistência de acesso e validação) — 2026-07-27
Segundo nível do endurecimento. Auditoria + padronização, sem mudança de comportamento. Build OK.
- **Guard de sessão único** (`src/lib/auth/session.ts`, `requireUser()`): substitui os 6 `ctx()` copiados
  em cada action + os guards inline de profile/google. Uma fonte só de verdade para "exige login". Todas
  as actions de mutação passam por ele (50 usos). `auth.ts` fica de fora de propósito (login/cadastro/
  reset são fluxos pré-login; já usam Zod safeParse e o `updateUser` é preso à sessão).
- **Validação Zod completa:** todo payload de dados já era validado; preenchi os buracos de entrada
  ESCALAR (novos schemas em `src/lib/validation/common.ts`): `idParam` (id de linha) nas funções de
  update/delete/status/reveal/realize, `uuidParam` nos grupos (transfer/parcelamento), `pushEndpointParam`
  no unsubscribe, `yearParam`/`monthParam` no import do Google. Coerção tolerante (não quebra chamada
  legítima) que rejeita tipo errado antes de tocar o banco.
- **RLS auditada:** as 15 tabelas já têm RLS + policy `own_rows` (conferido migração por migração;
  `profiles` usa `id`, o resto `user_id`). Entregue `supabase/audit_rls.sql`: Parte 1 = relatório
  (lista toda tabela do `public`, RLS e nº de policies; buraco = rls_ativa false ou 0 policies);
  Parte 2 = reafirmação idempotente com a MESMA definição das migrações (não enfraquece nada).
- **service_role isolado (conferido):** `src/lib/supabase/admin.ts` tem `import "server-only"` e usa
  `SUPABASE_SECRET_KEY`; só é importado por código de servidor (Route Handler do cron atrás de
  `CRON_SECRET`, actions/reader admin atrás de `assertAdmin()`), nunca por client component; nenhuma
  secret em `NEXT_PUBLIC_`. Sem mudança, só verificação.
- **Arquivos:** novos `src/lib/auth/session.ts`, `src/lib/validation/common.ts`, `supabase/audit_rls.sql`;
  refatorados `src/lib/actions/{finance,task,calendar,notifications,password,suggestion,profile,google}.ts`.

**Ação do dono (Nível 2):**
1. **Recomendado (verificação):** rodar a **Parte 1** de `supabase/audit_rls.sql` no SQL Editor e conferir
   que as 15 tabelas têm `rls_ativa = true` e `qtd_policies >= 1`. Se algo faltar, rodar a **Parte 2**
   (idempotente e segura). Como o RLS já vem das migrações, isso é só confirmação/rede de segurança.
2. Depois do push, um teste manual rápido no app logado: criar/editar/excluir uma transação, tarefa e
   evento (confirma que o guard novo não atrapalha o uso legítimo).

### 3.12 Segurança — Onda 12 (Nível 3: custo e abuso) — 2026-07-27
Terceiro nível. Rate limiting + endurecimento do Storage. Build OK.
- **Rate limiting** (`src/lib/ratelimit.ts`, `@upstash/ratelimit` + `@upstash/redis`): wrapper genérico
  sliding-window, **fail-open** (se o Upstash não estiver configurado ou o Redis cair, libera; nunca
  bloqueia o uso legítimo por infra). `rateLimitOk`/`enforceRate` + `clientIp()`. Aplicado:
  login/cadastro e reset por **IP** (`auth.ts`), troca de senha por IP (`auth.ts` `updatePassword`),
  envio de imagem por **usuário** (`storage/upload.ts`) e escritas de finanças por usuário
  (`finance.ts`: createTransaction/InstallmentPurchase/Transfer/bulk). Limites atuais: auth 10/min,
  reset 5/h, troca 10/h, finanças 60/min, upload 20/5min (fáceis de ajustar no `CONFIG`).
- **Upload endurecido** (`src/lib/storage/upload.ts`): agora `server-only`, valida **tipo** (JPG/PNG/
  WEBP/GIF) e **tamanho** (5 MB; o teto real do request é o `bodySizeLimit` 4 MB do next.config) no
  servidor, antes de subir.
- **Storage por bucket** (`supabase/harden_storage.sql`, bloco pra colar): limita tipo+tamanho no
  próprio Storage (`file_size_limit`/`allowed_mime_types`) e reafirma policies `own_*` (escrita/update/
  delete só na pasta `{user_id}/`). Buckets seguem **públicos p/ leitura** (a app serve por URL pública).
- **Signed URLs (decisão do dono):** avatars/suggestions são públicos hoje. Trocar por privado+signed URL
  é **invasivo** (migrar URLs salvas no banco, refatorar ~15 telas que exibem imagem, mexer no next.config
  e na CSP, lidar com expiração) e de **baixo valor** p/ app pessoal (foto de perfil + prints). Recomendação:
  **manter público + hardened**. O caminho pra privado está comentado no fim do `harden_storage.sql`.
- **Arquivos:** novo `src/lib/ratelimit.ts`, `supabase/harden_storage.sql`; alterados `auth.ts`,
  `finance.ts`, `storage/upload.ts`, `package.json` (deps Upstash). Sem mudança na CSP (Upstash é
  server-side, não do browser).

**Ação do dono (Nível 3):**
1. **Upstash (pra ligar o rate limiting):** criar conta em upstash.com, criar um banco **Redis**, e setar
   na **Vercel** e no **`.env.local`**: `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`. Enquanto
   não setar, o rate limiting fica **desligado (fail-open)** e o app funciona normal. O free tier do Upstash
   cobre uso pessoal de sobra.
2. **Rodar `supabase/harden_storage.sql`** no SQL Editor (limita tipo/tamanho no Storage + policies own_*).
3. **Signed URLs:** decisão sua (ver acima). Se quiser o modo privado, me avisa que faço o refactor à parte.

### 3.13 Modernização visual e interatividade — Onda 13 (EM ANDAMENTO) — 2026-07-27
Modernizar UI/interatividade guiado por 4 imagens de inspiração (fintech dark premium; norte
real = app Pierre). Implementação em 5 fases (0 a 4) com checkpoint entre fases (prompt do dono
tem o detalhamento). Decisão de libs: GSAP (existente) para timeline/scroll/hero; **motion**
(framer) entra na Fase 1 para AnimatePresence/layout/microgestos.
- **Fase 0 (FEITA):** direção de design + fundação de animação. `npm run build` OK; app conferido
  no dev (renderiza, 0 erros de console, regra global de reduced-motion presente no CSS compilado).
  - **Direção de design** em `docs/superpowers/specs/2026-07-27-modernizacao-visual-direcao.md`.
    Síntese: manter base dark (`#080b12`/`#0e131d`) e o trio de fontes; números protagonistas
    (heróis maiores, `.num`); cor vibrante só nos dados; tokens novos `--positive`/`--negative`
    (verde vivo/coral) para dinheiro nas fases 3-4; raio `--radius` 0.5→0.625rem proposto;
    `.card-glow` mais contido; movimento "calmo, físico e discreto" (micro 150-200ms, entradas
    250-350ms, saídas ~65%, stagger 30-60ms).
  - `src/lib/motion.ts`: fonte única de DUR/EASE/SPRING + variantes (fade, fadeScale, slideUp,
    listItem, staggerContainer, pressable) para GSAP e motion.
  - `src/hooks/use-reduced-motion.ts`: `useReducedMotion()` reativo + `prefersReducedMotion()`
    imperativo; `Reveal` e `CountUp` consolidados nele (antes matchMedia duplicado inline).
  - `globals.css`: rede de segurança global `prefers-reduced-motion` (qualquer animação/transição
    CSS vira ~instantânea para quem pediu menos movimento).
  - **DECISÃO PENDENTE DO DONO — cor de destaque:** manter azul `#3b82f6` (recomendado),
    migrar para lime neon estilo Pierre (rebrand de token global), ou híbrido. Sem resposta,
    as fases 1-4 seguem com o azul.
- **Decisão do dono (2026-07-27): manter o azul** `#3b82f6` como primária. O "sabor Pierre" vem
  da linguagem (números grandes, coral/verde no dinheiro, bento, pills), não do lime.
- **Fase 1 (FEITA):** base de animação. `npm run build` OK; dev server sem erros.
  - Libs novas: **motion** (framer) e **@formkit/auto-animate** (`npm install`, 5 pacotes).
  - `components/ui/modal.tsx`: abre/fecha com **AnimatePresence** (fade no backdrop + fade/scale
    no painel), API intacta. Truque: estado interno `open` toca a saída e só chama `onClose` no
    `onExitComplete`; se o pai desmontar direto (ex.: após salvar), fecha sem animar, sem quebrar.
    Com reduced-motion, abre/fecha instantâneo.
  - `src/hooks/use-animated-list.ts`: wrapper do AutoAnimate (duração/curva da direção, desliga
    em reduced-motion). Aplicado nas listas SEM dnd-kit: transações (inline + modal "Ver todas"),
    assinaturas e planejamento. `tasks-view` (dnd-kit) ficou de fora de propósito (brigam pelos
    transforms).
  - `components/effects/pressable.tsx`: microgestos hover/tap (spring `SPRING.press`, sem bounce)
    num wrapper client reutilizável; filhos server continuam server. Aplicado: stat cards do
    dashboard (só tap; hover continua no `.card-glow`), botões da folha de ações rápidas e o "+"
    do bottom-nav (tap 0.92).
  - Tokens da direção aplicados no `globals.css`: `--radius` 0.5→0.625rem (cards ~18-22px) e
    `.card-glow` contido (lift -2px, sombra neutra, menos neon azul). `EASE_CSS` novo em
    `lib/motion.ts`.
  - Sonner conferido: feedback já é 100% sonner (20 componentes, zero `alert()`); nada a trocar.
  - Nota de ambiente: o Turbopack dev no Windows chegou a ficar preso num erro de parse de um
    estado intermediário do `page.tsx` durante a sequência de edits (watcher perdeu a última
    mudança); resolvido reiniciando o dev server. O arquivo sempre esteve válido (build passou).
- **Fase 2 (FEITA):** transições de página. `npm run build` OK; verificado no navegador
  (login -> cadastro disparou 1 `startViewTransition` e navegou; console limpo).
  - Lib nova: **next-view-transitions** (View Transitions API por baixo; navegador sem suporte
    só navega normal). `<ViewTransitions>` envolvendo o `<html>` no `layout.tsx` raiz.
  - `Link` trocado para o da lib nas superfícies de navegação: `bottom-nav`, `sidebar`,
    dashboard (`(app)/page.tsx`), `login`, `recuperar-senha`, `cadastro-form`. `router.push`
    das folhas virou `useTransitionRouter`. Links internos de conteúdo seguem `next/link`
    (transicionam sem animação, sem quebrar).
  - Timing no `globals.css`: crossfade 0.3s na curva padrão; desligado sob reduced-motion
    (pseudo-elementos `::view-transition-*` não são cobertos pela regra global `*`).
  - **AnimatePresence nas folhas** `quick-actions` e `more-sheet`: overlay em fade + painel em
    slide-up, mesmo padrão do modal (estado interno + `onExitComplete`). Dispensa (X/backdrop/
    Esc) anima; tocar numa ação fecha instantâneo e navega com transição de rota (evita
    artefato de snapshot da folha no meio da saída).
- **Fase 3 (FEITA):** dados e conteúdo. `npm run build` OK; conferido no navegador (tokens
  `--positive`/`--negative` compilados no dark, console limpo).
  - Libs novas: **@number-flow/react** e **@lottiefiles/dotlottie-react**.
  - **Números animados:** `components/effects/animated-number.tsx` (NumberFlow: dígitos rolam
    no mount 0->valor e a cada mudança de valor, ex.: trocar mês em /financas). Substituiu o
    `CountUp` (GSAP) no dashboard e nos stats de /financas com a MESMA API; `count-up.tsx`
    APAGADO (sem outros usos). Formato BRL vem de `lib/money.ts` (novos exports `BRL_LOCALE`/
    `BRL_FORMAT`, fonte única com `formatBRL`; cast para o `Format` do NumberFlow, que é
    subconjunto do Intl). Reduced-motion: renderiza valor final estático.
  - **Tokens de dinheiro aplicados:** `--positive`/`--negative` no globals.css (dark verde vivo
    `#4ade80` / coral `#fb7185`; light `#16a34a`/`#e11d48`), mapeados como `text-positive`/
    `text-negative`/`bg-*` no @theme. Trocadas as classes ad hoc green/red em TODOS os contextos
    de dinheiro: dashboard, stats de /financas, TxRow (setas e valor), extrato, planejamento,
    contas e cartões. Ficaram de fora (de propósito): erros/destructive, toggle de tipo no form,
    botão salvar de categoria.
  - **recharts: descoberta importante, está instalado mas NÃO é usado em lugar nenhum** (os
    "gráficos" reais são barras CSS). Nada a refinar; a lib fica dormente (candidata a remoção
    ou a um gráfico novo de categoria, decisão do dono). O alinhamento de cor foi feito nas
    barras de "Despesas por categoria": cada categoria usa `--chart-1..5` cíclico (antes tudo
    `bg-primary`), estilo barra segmentada do Pierre.
  - **Estados vazios com Lottie:** `components/effects/empty-state.tsx` (player dotLottie com
    lazy-load via next/dynamic, ssr false; só entra no bundle se um vazio renderizar). O asset
    só aparece quando carrega; sem arquivo ou com erro, fica o texto de hoje (zero regressão).
    Reduced-motion: primeiro quadro parado. Aplicado: tarefas ("Nenhuma tarefa aqui."),
    dashboard (eventos e tarefas) e transações do mês.
  - **ASSETS PENDENTES DO DONO (Lottie):** colocar em `public/lottie/`:
    `empty-tasks.lottie`, `empty-events.lottie`, `empty-transactions.lottie` (formato .lottie,
    ideal <100KB cada; sugestão: lottiefiles.com, tema minimalista dark). Sem eles o app
    continua como era. Não há fluxo de onboarding no app hoje, então o Lottie de onboarding
    fica para quando existir onboarding.
- **Fase 4 (FEITA) — Onda 13 COMPLETA:** mobile e destaque. `npm run build` OK; console limpo.
  - Lib nova: **vaul** (bottom sheet com gesto, base Radix Dialog). As DUAS folhas da barra
    inferior (`quick-actions` e `more-sheet`) viraram `Drawer` do vaul: sobem animadas,
    **arrastam para baixo para fechar** (gesto nativo, melhor no app Capacitor), Esc/backdrop
    fecham. API dos pais intacta (render condicional + `onClose` no fim da saída via
    `onAnimationEnd`); nascem fechadas e abrem no mount para garantir a entrada animada.
    Tocar numa ação segue fechando instantâneo + navegando com transição de rota. O
    AnimatePresence que elas usavam na Fase 2 foi substituído pelo do vaul (motion segue no
    modal e microgestos).
  - **Destaque do hero (opcional):** `.text-gradient-animated` no título do dashboard,
    gradiente que "respira" em 8s (estilo animated-gradient-text do Magic UI adaptado aos
    tokens, CSS puro, zero dependência). Escolha deliberadamente contida: o dono já pediu
    remoção de fundo animado (three.js) no passado, então NADA de hero 3D/aurora pesado.
  - **Resumo da Onda 13 (libs adicionadas):** motion, @formkit/auto-animate,
    next-view-transitions, @number-flow/react, @lottiefiles/dotlottie-react, vaul.
    Divisão de runtimes: GSAP = Reveal/scroll/hero; motion = modal + microgestos (Pressable);
    vaul = folhas; View Transitions API = rotas; AutoAnimate = listas não-dnd; NumberFlow =
    números. Tudo respeita prefers-reduced-motion (CSS global + hook).
  - **Fase 5 (FEITA, a pedido do dono): gráfico de categorias no recharts.** O recharts saiu
    de dormente e virou o **donut de "Despesas por categoria"** em /financas, com o total do
    mês no miolo (linguagem das imagens de inspiração).
    - **Paleta categórica revalidada** (skill `dataviz`, validador rodado, não "no olho"):
      os `--chart-1..5` viraram `#3b82f6, #d97706, #0891b2, #7c3aed, #059669` (azul da marca,
      âmbar, ciano, violeta, esmeralda). Passa os 6 checks nos DOIS modos: banda de lightness,
      chroma, contraste na superfície, e separação do pior par vizinho ΔE 15.0 em deuteranopia
      e 24.5 em visão normal. A paleta antiga falhava a banda de lightness no escuro (verde/
      ciano/âmbar claros demais) e no CLARO era um degradê de azuis, ou seja, identidade por
      lightness (errado para categoria). Nota honesta: no teste mais duro (`--pairs all`, para
      dispersão/mapa) 5 fatias não passam; para donut o teste correto é o de vizinhos, e a
      identidade nunca fica só na cor (vão de 2px entre fatias + nome, valor e % na legenda).
    - **Arquivos:** `src/lib/finance/category-chart.ts` (monta as fatias no servidor; as 5
      maiores por cor fixa e o resto agregado em "Outras" na cor neutra, a paleta **nunca** é
      ciclada), `components/finance/category-donut-chart.tsx` (recharts: donut, vão da cor do
      card entre fatias, `minAngle` para a menor não desaparecer, tooltip com valor e %,
      `role="img"` com resumo para leitor de tela, animação desligada em reduced-motion),
      `components/finance/category-donut.tsx` (lazy-load com `next/dynamic ssr:false` e
      esqueleto reservando a altura: o recharts só é baixado por quem abre /financas com
      despesa no mês). A lista de barras que já existia virou a **legenda** do donut (mesmo
      marcador de cor, nome, valor e %), e a cor dela agora vem do mesmo `categoryColor()`,
      então da 6ª categoria em diante fica neutra em vez de reciclar azul.
    - **Medido no navegador** (harness temporário, removido depois): 6 fatias renderizadas,
      `fill` resolvendo as CSS vars exatamente na paleta validada, vão de 2px na cor do card,
      altura reservada 192px, zero overflow horizontal a 375px. O miolo foi aberto
      (`innerRadius` 72%, anel de 19px) porque a 375px o total encostava no anel; agora sobram
      18px de cada lado até na casa das dezenas de milhar. **Não pôde ser exercitado aqui:** o
      hover do tooltip (screenshot/hover real indisponíveis nesta sessão), então a função de
      conteúdo ficou defensiva; conferir no app.
  - **Pendências do dono:** (a) validar visualmente no app logado (modal, listas, folhas com
    gesto, transições de rota, números rolando, cores coral/verde, título com gradiente vivo,
    **donut de categorias e o tooltip dele**); (b) assets Lottie da Fase 3 em `public/lottie/`.
- Assets que faltarão do dono: arquivos Lottie escolhidos (onboarding/estados vazios), Fase 3.

### 3.14 Sugestão #32 — CAUSA RAIZ do "app mais largo que a tela" no celular — 2026-07-28
Depuração sistemática (não foi chute; medido no navegador com a estrutura real e o texto real
das sugestões do banco). Build OK.
- **Sintoma:** no celular a página fica mais larga que a tela e precisa arrastar para o lado
  quando há texto longo (relato do dono citando Dashboard e Sugestões).
- **CAUSA RAIZ:** `<main className="flex-1">` no `(app)/layout.tsx` **sem `min-w-0`**. Item flex
  nasce com `min-width: auto`, ou seja, NÃO encolhe abaixo do conteúdo mínimo. Bastava um texto
  longo em QUALQUER lugar para esticar o main inteiro e, com ele, a página toda.
  Medido a 375px: documento com **909px** de largura (534px de overflow) e **71 elementos**
  ultrapassando a tela, incluindo o `<p>Boa tarde, Pedro</p>` com 877px (prova de que não era o
  texto que estourava, era o container esticado).
- **Por que as correções anteriores não pegaram isso:** os filhos já tinham `truncate`/`min-w-0`
  (dashboard, tarefas, calendário, senhas). O elo quebrado estava um nível ACIMA de tudo, no
  `main`. Também explica o histórico de "app cortado": com o `overflow-x: clip` da raiz, o mesmo
  defeito aparece como conteúdo cortado em vez de arrastável.
- **Correção (2 camadas):**
  1. `(app)/layout.tsx`: `<main className="min-w-0 flex-1">` (a raiz do problema).
  2. `suggestions-view.tsx` e `admin-suggestions-view.tsx`: `break-words` na descrição. Sem isso,
     texto sem espaços (link colado) ficava **cortado** (`scrollWidth > clientWidth`), medido.
- **Verificação:** overflow 534px -> **0**, elementos estourando 71 -> **0**, largura do main
  909px -> **375px** (exata), link não mais cortado. Repetido a **320px**: overflow 0.
- **Conferido e NÃO alterado:** os demais `flex-1` do app são botões/inputs ou já têm `min-w-0`;
  a célula do calendário é protegida pelo `truncate` (overflow hidden zera o min-content). Não
  apliquei a "rede de segurança global" de quebra de texto que eu havia proposto antes de
  investigar: com a causa raiz corrigida ela seria mudança ampla de comportamento sem
  necessidade.
- **Sugestão #31** (bug do modal de importar): **já estava corrigida** no commit `4d4682f`
  (Onda 9, modal via portal). Nada a fazer no código; falta só marcar como "feito" em
  `/admin/sugestoes`.

### 3.15 Onda 14: calendário, card de contas e revisão do extrato — 2026-07-28
Três pedidos do dono com referências visuais (calendário nativo do Android e app Pierre).
Fluxo completo: brainstorming -> spec -> plano -> execução em 5 tarefas, cada uma com
`npm run build` e medição no navegador. Spec em
`docs/superpowers/specs/2026-07-28-calendario-contas-import-design.md`, plano em
`docs/superpowers/plans/2026-07-28-onda14-calendario-contas-import.md`. **Sem migração.**

- **Calendário** (`calendar-view.tsx`): cabeçalho com o ano pequeno e o mês em tipo grande;
  grade sem vão entre células, com divisórias, células de 76px (celular) e 116px (desktop),
  número do dia maior, fim de semana apagado e hoje em círculo sólido. **Decisão do dono:**
  eventos continuam nas células; como em 375px sete colunas com texto são ilegíveis, no celular
  viram pontinhos coloridos (igual à referência) e no desktop seguem escritos.
  *Cuidado registrado:* o bloco de eventos do desktop é `block`, não `flex`. Como flex, cada
  evento com `truncate` não encolhia e colapsava a grade para 17px por célula com 42px de
  overflow (mesmo mecanismo do bug #32). Em block: 79px por célula e overflow 0.
- **Finanças** (`accounts-summary.tsx` novo; `bank-manager.tsx` REMOVIDO): saíram os 4 cartões
  de indicador. No topo entra o card de contas: ícone do banco de maior saldo, soma de todas as
  contas e "N contas conectadas"; ao abrir, lista as contas (com criar e excluir, que vieram do
  card "Contas") e mostra Entradas, Despesas e Faturas do mês, destino combinado dos números
  removidos. O `CardManager` passou a ocupar a linha inteira. A 320px os indicadores viram
  coluna única, porque em 3 colunas o valor era cortado.
- **Revisão do extrato** (`select-menu.tsx` e `category-select.tsx` novos; `import-modal.tsx`):
  seletor próprio no lugar do `<select>` nativo, com painel via portal (z-110, acima do modal),
  busca acima de 8 opções, Esc/clique fora e abertura para cima quando não cabe embaixo.
  Categoria pode ser criada (já aplicada na linha) e renomeada ali mesmo. Tipo virou chip
  Despesa/Receita. **Categoria não tem cor no banco** (`categoryInput = { name, icon, kind }`):
  o self-review do plano pegou isso antes de codar, porque o Zod descartaria o campo em
  silêncio; um seletor de cor exigiria migração e ficou fora.
- **Nota de ambiente:** o navegador headless desta sessão não calcula layout de nós criados por
  portal em telas estreitas (mesmo ambiente onde screenshot e hover falham). O posicionamento do
  painel foi validado por clone do nó, que renderiza em 220px, abaixo do botão e dentro da tela;
  no desktop a medição direta funcionou normalmente.
- **Pendente de validação do dono:** conferir no app logado o calendário (celular e desktop), o
  card de contas e o fluxo completo de importar extrato (subir arquivo -> revisar -> criar e
  renomear categoria).

### 3.16 Onda 15: ícones no lugar dos emojis e logos de banco — 2026-07-28
Pedido do dono: tirar a "cara de IA" trocando emoji por um sistema de ícones, e as contas
mostrarem a logo do banco. Spec em `docs/superpowers/specs/2026-07-28-icones-e-logos-design.md`.
**Sem migração.**
- **Pesquisa:** `lucide-react` (já instalado) segue como biblioteca; é a escolha padrão em 2026.
  Para as logos, escolhido **@edusites/bancos-brasil (MIT)**; descartados `react-br-bank-icons` e
  `@arcanishq/react-bank-icons` (GPL-3.0, contaminaria o app) e `Tgentil/Bancos-em-SVG` (sem
  licença aberta).
- **Logos:** `scripts/gen-banks.mjs` gera `public/banks/<slug>.svg` (símbolo sobre a cor da
  marca) e `src/lib/finance/banks.ts` (slug, nome, cor). 28 instituições. Ficam em `public/` de
  propósito: 96 KB em arquivos estáticos que o navegador baixa sob demanda, contra 95 KB que os
  vetores pesariam no bundle. O pacote é só devDependency, para regerar.
- **Arquitetura sem migração:** a coluna `icon` aceita três formatos e o `EntityIcon`
  (`components/ui/entity-icon.tsx`, sem "use client" para servir Server e Client Components)
  decide: `bank:nubank` -> logo, `home` -> ícone do catálogo, `🏠` -> emoji legado. O que já
  estava salvo continua aparecendo; nada foi convertido no banco.
- **Seletor:** `components/ui/icon-picker.tsx` com aba **Bancos** (grade de logos, só no
  cadastro de conta) e aba **Ícones** (catálogo por tema, com busca). Catálogo em
  `src/lib/icons/catalog.ts`, com ~50 ícones importados um a um para não trazer os 1.500 do
  lucide no bundle.
- **Cuidado registrado:** em vários pontos o ícone era concatenado em string
  (`${cat.icon} ${cat.name}`, `<option>` nativos), o que exibiria "landmark Inter" depois da
  troca. Nesses lugares ficou só o nome; onde havia espaço o ícone virou componente ao lado.
- **Defaults atualizados:** as 12 categorias padrão (`lib/finance/defaults.ts`) e os defaults do
  Zod (`lib/validation/finance.ts`) agora nascem com nome de ícone, não emoji.
- **README:** seção creditando a origem das logos e registrando que **as marcas pertencem aos
  respectivos bancos** (uso nominativo, sem vínculo).
- **Pendente de validação do dono:** conferir no app o cadastro de conta com a galeria de
  bancos, o seletor de categorias e assinaturas, e as telas onde o ícone aparece (extrato,
  transações, donut, planejamento).

### 3.17 Onda 16: integração bancária automática via Pluggy (Open Finance) — 2026-07-29
As movimentações do banco entram sozinhas e ao dono resta só categorizar. Fases 0 a 5 feitas;
Fase 6 (cartão de crédito) pendente. **Migrações 0015, 0016 e 0017 JÁ RODADAS pelo dono.**

- **Contratos confirmados no SDK instalado, não na doc web** (pluggy-sdk 0.90.0), e três
  divergências apareceram: `createConnectToken(itemId?, options?)` e
  `createWebhook(event, url, headers?)` são POSICIONAIS (a doc sugeria objeto único), e
  `fetchTransactions` está deprecated (o certo é `fetchAllTransactions`).
- **Sinal do valor:** a doc não garante, e na prática a Pluggy manda **negativo** para débito.
  Por isso `mapearValor()` deriva a direção do campo `type` (DEBIT/CREDIT) e aplica `Math.abs`,
  igual ao import de OFX. Se dependesse do sinal, os lançamentos entrariam invertidos.
- **Arquivos:** `lib/pluggy/{client,sync}.ts`, `lib/actions/pluggy.ts`, `lib/data/pluggy.ts`,
  `app/api/pluggy/connect-token/route.ts`, `app/api/webhooks/pluggy/route.ts`,
  `app/api/cron/pluggy-sync/route.ts`, `components/finance/{connect-bank,pluggy-connections,
  categorization-queue}.tsx`, `supabase/pgcron_pluggy.sql`.
- **Dois bugs encontrados e corrigidos durante o teste real:**
  1. *Widget girava para sempre.* A CSP da Onda 10 barrava o iframe de `connect.pluggy.ai` e as
     chamadas a `api.pluggy.ai`. Liberados só esses dois domínios, e só em `frame-src` e
     `connect-src`; `script-src` segue sem terceiros.
  2. *Conexão criada sem contas.* O widget chama `onSuccess` quando o login dá certo, mas o item
     ainda está em `UPDATING` e `fetchAccounts` volta vazio. Agora há polling curto (25s) e a
     vinculação é idempotente, então o botão Sincronizar conserta conexão incompleta.
  3. *Erro 42P10 no upsert.* Os índices de dedupe eram PARCIAIS e o Postgres não os infere no
     ON CONFLICT. Migração 0017 troca por índices únicos totais: como dois NULL não são iguais,
     contas manuais e transações digitadas seguem livres.
- **Revisão de segurança (Fase 5), com evidência:**
  - nenhum `NEXT_PUBLIC_PLUGGY` no código nem no `.env.local`; `lib/pluggy/client.ts` tem
    `server-only`; os valores dos 3 segredos não aparecem em `.next/static`;
  - nenhuma credencial bancária no app (o widget da Pluggy recebe a senha; o app só guarda o
    `itemId`); a API Key é gerenciada pelo próprio SDK e nunca é exposta;
  - connect-token exige sessão e tem rate limit por usuário; `savePluggyItem` recusa item cujo
    `clientUserId` não seja o usuário da sessão;
  - webhook: 401 sem segredo e com segredo errado, 200 em 0,018s com o correto (limite é 5s),
    `itemId` forjado é ignorado; o dono vem do nosso banco, nunca do corpo;
  - **RLS testado com a chave pública**: leitura de `pluggy_items`, `transactions`, `banks` e
    `categories` sem sessão volta 0 linhas e o insert anônimo é negado com 401;
  - dedupe idempotente confirmado: depois de rodar o cron sobre as mesmas transações, o banco
    seguia com a mesma contagem e nenhum `external_id` repetido.
- **Estado do sandbox:** 1 conexão (Pluggy Bank), 1 conta corrente vinculada, transações
  importadas e fila de categorização funcionando. Há 1 conta CREDIT esperando a Fase 6, e o
  extrato já traz "PAGAMENTO FATURA CARTAO VISA", que é justamente o caso de contagem em dobro
  a tratar lá.
- **Pendente do dono:** validar a fila no app; depois do deploy, conferir a primeira entrega
  real do webhook; e a migração para produção da Pluggy (plano pago e due diligence).

### 3.18 Onda 17: login com Google, ordem de tarefas por filtro e centralização das abas — 2026-07-29
Três sugestões novas do dono (chegaram por chat: a tabela `suggestions` estava inacessível na
sessão, o classificador do harness ficou intermitente). Spec em
`docs/superpowers/specs/2026-07-29-onda17-login-google-ordem-tarefas-centralizacao-design.md`,
plano em `docs/superpowers/plans/2026-07-29-onda17-google-ordem-centralizacao.md`.
**Sem migração.**

- **Centralização das abas:** existia só em /financas (`mx-auto max-w-7xl`); as outras páginas
  tinham largura máxima SEM `mx-auto` e encostavam na esquerda. Agora a coluna do app é definida
  uma vez no `(app)/layout.tsx` (`mx-auto w-full max-w-7xl`), cada rota centraliza sua largura de
  leitura com `mx-auto` no wrapper externo, e /financas abriu mão da largura própria (virou papel
  do layout, resultado visual idêntico). Efeito colateral bem-vindo: o calendário, que não tinha
  teto de largura, passou a respeitar a coluna. Não se tocou nos `min-w-0 flex-1` do `<main>`
  (correção da #32).
- **Ordem de tarefas com filtro:** o bloqueio era explícito (`canReorder = filter === "all" &&
  catFilter === "all"`). Como `tasks.position` é ordem GLOBAL por usuário, a solução não precisou
  de migração nem de mudança na Server Action: a função pura `reorderWithinFilter`
  (`src/lib/tasks/reorder.ts`) permuta apenas os slots que os itens visíveis já ocupavam, deixando
  os escondidos parados, e valida que nenhum id se perdeu antes de deixar salvar. A alça passou a
  aparecer com qualquer filtro, inclusive o de status.
- **Login com Google:** provider do Supabase Auth, separado do Google Calendário (que segue com
  OAuth próprio e tokens em `google_accounts`). Peças: `components/auth/google-button.tsx`
  (client, `signInWithOAuth`), seção "Conta Google" no /perfil
  (`components/profile/google-identity.tsx`, `linkIdentity`/`unlinkIdentity`),
  `lib/auth/ensure-profile.ts` no callback e `lib/auth/webview.ts`.
  - *Decisão que evita perder dados:* vincular a identidade no /perfil antes de usar o botão
    garante o MESMO `user_id`. Login Google criando usuário novo abriria o app vazio.
  - *Cuidado com a CSP:* o botão tem que ser navegação do cliente, NUNCA Server Action com
    redirect, porque `form-action 'self'` faz o Chrome barrar a cadeia de redirect para
    accounts.google.com depois de um submit de formulário.
  - *Avatar:* o Google manda a URL do googleusercontent.com, que a CSP (`img-src`) barraria. O
    `ensureProfile` descarta avatar de fora do nosso Storage e preenche o nome a partir de
    `full_name`/`name` (o gatilho `handle_new_user` só conhece `display_name`).
  - *APK Android:* o Google recusa OAuth em WebView, então o botão é escondido lá, decidido no
    servidor pelo user-agent. `capacitor.config.ts` ganhou `appendUserAgent: "ZeniteApp"` (sinal
    determinístico, válido do próximo APK em diante) e o detector também cobre o `; wv)` do APK
    já instalado.
  - *Interruptor:* o botão e a seção só aparecem com `NEXT_PUBLIC_GOOGLE_LOGIN_ON=1`, para o
    código poder subir antes da configuração.
- **NÃO VERIFICADO nesta sessão:** `npm run build`, medição no navegador e os commits. O
  classificador de segurança do harness ficou indisponível e bloqueou o Bash. O código está na
  árvore de trabalho; ao retomar, rodar o build, conferir no navegador (coluna centralizada a
  1280px, alça de arrastar com filtro ativo) e só então commitar.
- **Pendente do dono:** (a) Google Cloud, adicionar o redirect
  `https://qlqewlrzjlbwrybwrimt.supabase.co/auth/v1/callback` no cliente válido; (b) Supabase,
  Authentication, ligar o provider Google com Client ID e Secret, ligar **Manual linking** e
  conferir a allowlist de Redirect URLs; (c) setar `NEXT_PUBLIC_GOOGLE_LOGIN_ON=1` na Vercel e no
  `.env.local`; (d) testar na ordem: entrar por senha, vincular no /perfil, sair, entrar com
  Google e confirmar que os dados aparecem (prova do mesmo `user_id`); (e) marcar as três
  sugestões como feito em /admin/sugestoes.

### 3.19 Onda 18: redesign visual (EM ANDAMENTO, branch `feat/onda18-redesign`) — 2026-08-03
Redesign visual em várias tasks numeradas, especificado em `.superpowers/sdd/task-*-brief.md`.
Ainda **não mesclada na `main`**, nada foi dado push. Sem migração até aqui.

- **Task 12 (FEITA nesta sessão): legenda do donut preparada para orçamento.** O donut de
  despesas por categoria continua igual; a legenda ao lado mudou de forma. Antes cada linha
  mostrava nome, valor, porcentagem de participação e uma barra de participação (redundante com
  a fatia do próprio donut). Agora cada linha responde duas perguntas em contextos separados: a
  fatia do donut diz participação no gasto, e uma barra nova (`Meter`) diz consumo do limite da
  categoria. Como o limite por categoria ainda não existe no banco, toda categoria mostra
  "Sem limite definido" por enquanto (comportamento esperado nesta task).
  - `src/lib/finance/category-chart.ts`: `CategorySlice` ganhou `limit: number | null`;
    `buildCategorySlices` passou a receber `limit` junto de `icon`/`total` em cada entrada; a
    fatia "Outras" sempre recebe `limit: null` (somar limites de categorias diferentes não
    significa nada).
  - `src/components/finance/category-legend.tsx` (novo): `<CategoryLegend slices={...} />`,
    consome `CategoryChip`, `Meter` e `Money` (componentes de UI já existentes da própria Onda
    18) e `formatBRL`.
  - `src/app/(app)/financas/page.tsx`: `byCat` passa `limit: null` na origem (a Task 15 troca
    pelo valor real quando o campo existir no banco); a lista antiga manuscrita foi apagada por
    completo e substituída por `<CategoryLegend slices={donut.slices} />` (a legenda agora
    consome as mesmas 5 categorias + "Outras" do donut, em vez de todas as categorias); o
    `className` do card do donut mudou de `"glass card-glow rounded-2xl border border-border
    p-5"` para `"rounded-lg bg-card p-4"`; imports órfãos removidos (`EntityIcon`,
    `categoryColor`, `formatBRL`, todos só usados na lista antiga).
  - `npm run build` passou sem erros. Commit `407ed38` na branch `feat/onda18-redesign`.
  - **Pendente:** verificação visual manual no navegador (não foi feita nesta sessão) e as
    próximas tasks da Onda 18, incluindo a Task 15 que vai trazer o limite real por categoria.

- **Task 14 (FEITA nesta sessão): tabela de transações no sistema novo, última task do
  piloto.** A lista de transações (compacta e o modal "Ver todas") trocou o card manuscrito
  antigo por `DataTable`/`DataTableRow`, com `BrandAvatar` (avatar/inicial), `CategoryChip`
  (nome + ícone da categoria) e `Money` (numeral tabular, cor semântica) no lugar da linha
  antiga. Filtro por tipo, busca do "Ver todas", editar/excluir linha e os modais de criar/
  editar transação **não mudaram**: só a apresentação da linha.
  - `src/components/finance/transactions-section.tsx`: `TxRow` reescrito para retornar
    `<DataTableRow>`; ícone de liderança por tipo (`Repeat` transferência, `ArrowUpRight`
    despesa/coral, `ArrowDownLeft` receita/verde) substitui o badge de texto "· transferência"/
    "· pagamento" que existia antes (perda de detalhe assumida, a linha nova é de uma coluna
    só). Categoria sem cor própria no modelo: `CategoryChip` recebe `color="var(--muted-
    foreground)"` fixo (a cor por posição do donut, `categoryColor(index)`, é um conceito só da
    Visão geral; não dava pra reusar sem inventar uma ordenação nova, o que o brief da task
    proibia).
  - `src/components/ui/data-table.tsx`: `DataTable` ganhou `forwardRef` (não estava no escopo
    literal da task, mas sem isso o `useAnimatedList()` perderia a animação de entrada/saída de
    linha — o hook exige o `ref` no pai direto dos itens). Sem outros consumidores no projeto
    ainda, mudança aditiva.
  - `src/app/(app)/financas/page.tsx`: `AccountsSummary` saiu da aba "Visão geral". **Não foi
    apagado**: é o único lugar do app que cria/exclui conta bancária (`AccountsCard`, que ficou
    no rail da Visão geral, é só exibição). Foi movido para a aba "Cartões", que passa a
    concentrar contas e cartões (`AccountsSummary` em cima, `CardManager` embaixo). Efeito
    colateral: os indicadores "Entradas/Despesas/Faturas" do mês, antes visíveis dentro do
    painel expansível do `AccountsSummary` na Visão geral, foram junto para a aba Cartões — a
    Visão geral não mostra mais esses três números crus (o gráfico "Saídas por mês" e o donut
    de categoria continuam lá, mas não são a mesma coisa).
  - **`SearchInput` (Task 8) continua sem uso em finanças.** O brief da Task 14 pedia para
    trocar "o campo de busca que já existe" pelo `SearchInput`, mas não existe busca por texto
    em `transactions-section.tsx` (só o filtro por tipo). Como a task era só de apresentação,
    não comportamento, optei por não inventar um filtro de texto novo. Fica pendente para uma
    decisão explícita numa próxima onda.
  - `npm run build` passou sem erros. Commit `09f322a` na branch `feat/onda18-redesign`.
  - **Pendente:** verificação visual manual no navegador (não foi feita nesta sessão); decidir
    o destino do `SearchInput`; relatório completo em `.superpowers/sdd/task-14-report.md`.

- **Task 15 (FEITA nesta sessão): limite mensal por categoria (única task da Onda com
  funcionalidade nova, não só visual).** Migração (`supabase/migrations/
  20260701000018_category_monthly_limit.sql`, coluna `categories.monthly_limit numeric(12,2)`,
  nula por padrão) já tinha sido escrita e **rodada pelo dono** antes desta sessão (commit
  `aa6a4b1`). Esta sessão fez os steps 3 a 8 do brief.
  - O brief supunha uma Server Action que lê `FormData` e devolve `{ error }` — **não é o
    padrão real**. `src/lib/actions/finance.ts` (`createCategory`/`updateCategory`) recebe um
    objeto plano e valida com zod (`categoryInput` em `src/lib/validation/finance.ts`), lançando
    `Error` em falha (o componente client captura e mostra `toast`). A extensão real foi no
    schema: `monthly_limit: z.number().min(0).nullable().default(null)`. Cobre criação (parse
    cheio) e edição (`.partial()`) sem mudar a action em si.
  - O brief também supunha o `MoneyInput` como campo de formulário não controlado
    (`id`/`name`/`defaultValue`). O componente real (`src/components/finance/money-input.tsx`)
    é **controlado** (`value`/`onChange`, sem `id`/`name`). Segui o padrão já usado em
    `card-manager.tsx` para `credit_limit`: estado string, inicializado com
    `formatBRL(v).replace("R$", "").trim()` e convertido de volta com `parseBRL` no submit.
  - `src/components/finance/category-manager.tsx`: campo "Limite mensal" acrescentado tanto no
    bloco de criação (visível só quando `kind === "expense"`, com `setLimit("")` ao trocar de
    kind pra não vazar valor de despesa pra uma receita) quanto na edição inline por linha
    (visível quando `c.kind === "expense"`; o kind de categoria existente não é editável neste
    componente, então não muda de tela). Label sem `htmlFor` (mesma convenção do
    `card-manager.tsx`, já que `MoneyInput` não repassa `id`).
  - `src/types/finance.ts`: `Category` ganhou `monthly_limit: number | null`.
  - `src/lib/data/finance.ts` **não precisou de ajuste**: a query de categorias já é
    `select("*")`, então a coluna nova chega sozinha.
  - `src/app/(app)/financas/page.tsx`: `byCat` troca o `limit: null` fixo (Task 12) por
    `cat?.monthly_limit ?? null` — a barra de orçamento da legenda (Task 12) passa a mostrar o
    limite de verdade.
  - Extra fora do brief: `src/components/finance/category-legend.tsx` trocou o literal
    `"R$ 0,00 restante"` (estouro de limite) por `` `${formatBRL(0)} restante` ``, pra não ter
    duas fontes de formato de dinheiro (`formatBRL` usa espaço não separável antes do número).
  - `npm run build` passou sem erros. Commit `53718ba` na branch `feat/onda18-redesign`.
  - **Pendente:** verificação visual manual no navegador (não foi feita nesta sessão: definir
    limite de R$ 500, gastar acima, conferir barra travando em 100%/coral/"R$ 0,00 restante", e
    categoria sem limite continuar em "Sem limite definido"); relatório completo em
    `.superpowers/sdd/task-15-report.md`.

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
