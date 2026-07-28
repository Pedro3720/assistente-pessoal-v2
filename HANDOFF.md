# ROTEIRO DE CONTINUIDADE — Zênite Assistente Pessoal (v2)

> **Para o próximo chat:** leia este arquivo inteiro antes de agir. Ele diz onde o projeto está, o que já
> foi feito, o que falta, e como continuar. **Atualizado: 2026-07-27.**

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
- **Em andamento (2026-07-27): Onda 13** — modernização visual/interatividade em 5 fases; Fase 0
  (direção de design + fundação de animação) feita, aguardando decisão do dono sobre a cor de
  destaque antes das fases 1-4 — ver 3.13.

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
