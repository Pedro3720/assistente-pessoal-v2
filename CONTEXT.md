# Assistente Pessoal v2 — Contexto Completo do Projeto (handoff)

> **Para o assistente/IA que ler isto:** aja como um **analista de sistemas sênior** e como
> **designer de produto**. Antes de codar, entenda e **siga os padrões** (arquitetura, segurança,
> design). Mantenha consistência: tipagem forte, Zod, Server Components + Server Actions, RLS por
> usuário, componentes pequenos, regra de negócio fora do JSX, e a camada visual da seção 11.
> Nunca reintroduza os erros do projeto antigo (seção 12).

---

## 1. O que é
App web de **assistente pessoal de uso individual** (single-user, sem multi-tenant) que centraliza
num só painel: **Finanças, Calendário, Tarefas, Senhas** e um **Dashboard** que agrega tudo, com
**sincronização com o Google Calendar**. É uma **reconstrução do zero** de um projeto antigo cheio
de falhas graves de segurança e arquitetura. Visual **fintech premium** (inspiração: pierre.finance).
**Está publicado online (Vercel).**

## 2. Stack técnica
- **Next.js 16.2.9** (App Router, Turbopack) + **React 19.2.4** + **TypeScript strict**
- **Tailwind CSS v4** + componentes estilo shadcn (à mão) + `class-variance-authority`, `clsx`, `tailwind-merge`
- **Supabase** (Postgres) via `@supabase/ssr` + `@supabase/supabase-js` (Auth + banco)
- **Zod** (validação), **lucide-react** (ícones), **sonner** (toasts), **recharts**, **next-themes**
- **DESIGN/ANIMAÇÃO:** **GSAP** + `@gsap/react` (`useGSAP`) + **ScrollTrigger**; **Three.js** (`three` + `@types/three`)
- **Fontes:** **Space Grotesk** (`--font-display`, títulos) · **Inter** (`--font-sans`, corpo/UI) · **JetBrains Mono** (`--font-mono`, números)

## 3. Localização, Git e Deploy (Vercel)
- **Local:** `C:\Projetos\assistente-pessoal-v2` (rode `npm run dev` daqui). Pasta antiga
  `C:\Pedro\Arquivos Pedro\Assistente-pessoal-v2` está **OBSOLETA**.
- **Git/GitHub:** repositório `Pedro3720/assistente-pessoal-v2`, branch **`main`**.
- **Deploy:** **Vercel** (team "Pedro tech" Hobby, projeto `assistente-pessoal-v2`, preset **Next.js**, Root Directory `./`).
  **Fluxo de publicação:** editar código → `git commit` → `git push` para `main` → **Vercel reconstrói e publica automaticamente**. (Não existe "editar arquivos dentro da Vercel"; ela só builda o GitHub.)
- **Variáveis de ambiente:** o `.env.local` NÃO vai para o git (`.env*` está no `.gitignore`), então as
  variáveis precisam ser cadastradas **na Vercel** (Settings → Environment Variables) — ver seção 8.
- **Migrações de banco:** aplicadas **MANUALMENTE** no Supabase → SQL Editor (a CLI do Supabase é
  bloqueada pela política de Application Control do Windows — binário não assinado). **MCP do Supabase**
  (hospedado, via OAuth) está sendo configurado para dar acesso direto ao banco/migrações.

## 4. Padrões de arquitetura (SEGUIR SEMPRE)
1. **Server Components buscam dados; Client Components só onde há interatividade** (`"use client"`).
2. **Leitura** em `src/lib/data/*` (server-only). **Mutação** em `src/lib/actions/*` (Server Actions,
   `"use server"`): validam com **Zod**, injetam `user_id`, chamam `revalidatePath`.
3. **Regra de negócio/cálculo no `lib/`, nunca no JSX.** **Tipos** em `src/types/*`; **Zod** em `src/lib/validation/*`.
4. **RLS por usuário** em toda tabela: policy `own_rows` com `auth.uid() = user_id`.
5. **Fuso fixo America/Sao_Paulo (-03:00)** via `src/lib/dates.ts` (`todayISO`, `currentYearMonth`,
   `shiftMonth`, `monthBounds`, `monthLabel`, `composeSP`, `spDateParts`, `formatDateBR`). **Nunca**
   `new Date().toISOString().split('T')` para datas locais.
6. **Dinheiro** via `src/lib/money.ts` (`parseBRL`, `formatBRL`). **Cripto** via `src/lib/crypto.ts` (AES-256-GCM).
7. **Componentes pequenos** (~<250 linhas). **Páginas tratam erro com graça** (`try/catch` → banner). **Sem `any`**.

## 5. Estrutura de pastas
```
src/
  app/
    (auth)/login/            # público: page.tsx (form + Server Actions) + toggle de tema flutuante
    (app)/                   # protegido (middleware + sessão no layout)
      layout.tsx  page.tsx   # layout (Sidebar); page.tsx = Dashboard
      financas/ calendario/ tarefas/ senhas/   # cada um page.tsx
    api/google/{connect,callback}/route.ts      # OAuth Google
    layout.tsx  globals.css  # root: fontes, ThemeProvider, AnimatedBackground, grão, ThemedToaster; tokens+utilitários
  lib/
    supabase/{server,client,middleware}.ts
    actions/{finance,calendar,task,password,auth,google}.ts
    data/{finance,calendar,task,dashboard,google,password}.ts
    validation/{finance,calendar,task,password}.ts
    parsers/ofx.ts · google/{config,tokens,calendar}.ts
    finance/defaults.ts · tasks/constants.ts · calendar/constants.ts
    money.ts · dates.ts · crypto.ts · utils.ts
  components/
    ui/{button,input}.tsx · layout/sidebar.tsx · theme-toggle.tsx
    providers/{theme-provider,themed-toaster}.tsx
    effects/{animated-background,reveal,count-up}.tsx      # camada visual (GSAP/Three)
    finance/* · calendar/* · tasks/* · passwords/*         # domínio (client)
  types/{finance,calendar,task,password}.ts
middleware.ts · supabase/migrations/*.sql · CONTEXT.md
```

## 6. Banco de dados (todas as tabelas)
Todas: `id bigint identity` (exceto `google_accounts` PK `user_id`), `user_id uuid → auth.users`,
`created_at`, `updated_at` (trigger `set_updated_at`), **RLS** `own_rows` (`auth.uid()=user_id`), índice por `user_id`.
- **categories**(`name`,`icon`,`kind` income|expense) — no banco (não localStorage).
- **banks**(`name`,`icon`,`opening_balance`).
- **credit_cards**(`name`,`bank_id`,`credit_limit`,`opening_invoice`,`closing_day`,`due_day`,`color`).
- **transactions**(`description`,`amount>=0`,`type` income|expense,`category_id`,`bank_id`,`card_id`,`is_card_payment`,`occurred_on`).
- **events**(`title`,`description`,`starts_at timestamptz`,`ends_at`,`all_day`,`color`,`category`,`repeat` none|daily|weekly|monthly,`reminder_minutes`,`google_event_id`).
- **tasks**(`title`,`description`,`status` pending|in_progress|completed,`priority` low|medium|high,`due_on`).
- **passwords**(`title`,`username`,`secret`[CRIPTOGRAFADO],`url`,`notes`).
- **google_accounts**(PK `user_id`,`google_email`,`access_token`[enc],`refresh_token`[enc],`expiry`,`scope`).
Migrações (em `supabase/migrations/`): `0000_finance`,`0001_calendar`,`0002_tasks`,`0003_passwords`,`0004_google`.
Banco é o **mesmo em dev e produção** (projeto Supabase `qlqewlrzjlbwrybwrimt`).

## 7. Segurança
- **Auth** Supabase (e-mail/senha). `middleware.ts` protege rotas privadas. Só a **publishable key** vai ao browser.
- **RLS por usuário** em tudo. **Senhas do cofre**: coluna `secret` = AES-256-GCM (`iv:tag:ciphertext`) cifrada na app
  com `APP_ENCRYPTION_KEY`; a lista NÃO envia a senha ao cliente — `revealPassword(id)` decifra 1 sob demanda.
- **Tokens do Google** também criptografados com a mesma chave.
- `SUPABASE_SECRET_KEY` é **só do servidor** (ignora RLS) — **foi exposta no dev, ROTACIONAR** (e atualizar local + Vercel).
- `APP_ENCRYPTION_KEY`: **fazer BACKUP** e usar a **MESMA** em dev e na Vercel (mesmo banco) — se perder/trocar, senhas/tokens ficam irrecuperáveis.

## 8. Variáveis de ambiente (`.env.local` local **e** na Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://qlqewlrzjlbwrybwrimt.supabase.co   # client-safe
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...             # client-safe
SUPABASE_SECRET_KEY=sb_secret_...                                   # SÓ servidor (rotacionar)
APP_ENCRYPTION_KEY=<64 hex/32 bytes>                                # SÓ servidor — BACKUP! mesma em dev/prod
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback      # em produção: https://SEU-DOMINIO.vercel.app/api/google/callback
```
Em produção: adicionar o redirect URI de produção em **Google Cloud → Credentials → OAuth client** e setar
`GOOGLE_REDIRECT_URI` na Vercel com a URL `https://.../api/google/callback`. Gerar chave:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## 9. Módulos e REGRAS DE NEGÓCIO (invariantes — preservar!)
### Finanças
- `amount` sempre positivo (o `type` distingue). **Compra no cartão**: `card_id` set, `is_card_payment=false`,
  `bank_id=NULL` → entra na fatura, NÃO mexe no banco; conta como despesa do mês (competência) e mantém categoria.
  **Pagamento de fatura**: `is_card_payment=true`, `card_id`=cartão pago, `bank_id`=conta → reduz banco E abate
  fatura; NÃO conta como despesa/quebra do mês. **Normal**: `bank_id` set, `card_id=NULL`.
- **Saldo do banco** = `opening_balance` + Σreceitas − Σdespesas (do banco). **Fatura** = `opening_invoice`
  + Σcompras − Σpagamentos (mín 0). Import OFX/CSV: `lib/parsers/ofx.ts` + auto-categorização no `import-modal`.
  Central: `lib/data/finance.ts` (`getFinanceData`, `getBankStatement`).
### Calendário
- Evento guardado 1x; recorrência (none/daily/weekly/monthly) expandida em memória por mês em `getEventsForMonth`
  (`EventOccurrence[]`). `composeSP`/`spDateParts` p/ fuso. **Google sync**: push best-effort no create/update/delete
  (`lib/google/calendar.ts`, RRULE); pull `importFromGoogle(year,month)` com dedup por `google_event_id`.
### Tarefas
- `status`/`priority`/`due_on`; filtro por status com contadores, conclusão rápida (toggle), destaque "atrasada".
### Dashboard (`/`)
- `getDashboardData` agrega em paralelo `getFinanceData` + `getEventsForMonth`(mês atual+próximo) + `getTasks`.
### Senhas
- `create/update/delete` + `revealPassword` (decifra 1 sob demanda) + gerador. Update com senha em branco = mantém a atual.
### Google Calendar
- OAuth próprio: `api/google/connect` (`access_type=offline`, `prompt=select_account consent`, `state` anti-CSRF em cookie);
  `api/google/callback` (troca code por tokens, pega e-mail via userinfo, salva criptografado). Escopos
  `calendar.events` + `userinfo.email`. `getValidAccessToken` renova com o refresh token. App Google em modo
  **Testing** (adicionar o e-mail como test user; refresh token expira ~7 dias).

## 10. Convenções de código
UI em **pt-BR**. Tokens semânticos (`bg-card`, `text-muted-foreground`, `border-border`) — respeitar dark/claro.
Títulos com `style={{ fontFamily: "var(--font-display)" }}` + `tracking-tighter`. Valores/números com a classe `.num`.
Mutação a partir do client: chamar Server Action, `router.refresh()`, `toast` em erro. Validar sempre com Zod.

## 11. CAMADA VISUAL / Design System & Animações (SEGUIR nas telas)
**Direção de arte:** fintech premium **dark data-first** (fundamentada com o skill `ui-ux-pro-max`): alto contraste,
números tabulares, status green/amber/red, **azul de confiança + verde de lucro**, evitar roxo/rosa (anti-pattern fintech).

**Bibliotecas:** GSAP + `@gsap/react` (`useGSAP`) + ScrollTrigger; Three.js; next-themes; Tailwind v4 + utilitários.

**Fontes:** **Space Grotesk** (títulos) · **Inter** (corpo/UI) · **JetBrains Mono** (números). Valores/datas em coluna
usam a classe **`.num`** (`--font-mono` + `tabular-nums`) — dá aquele alinhamento "trading desk".

**Tema:** **dark por padrão** (`defaultTheme="dark"`, `enableSystem={false}`), toggle disponível (`theme-toggle.tsx`;
no Login há um toggle flutuante no canto). Paletas no `globals.css` — **azul + verde, sem violeta**:
dark base `#080b12`, primary `#3b82f6`, verde p/ positivos / vermelho p/ negativos; light quase-branco `#f8f9fd`, névoa pastel.

**Utilitários (`globals.css`):** `.glass` (translúcido + backdrop-blur), `.card-glow` (elevação+brilho no hover),
`.bar-grow` (barra cresce via scaleX), `.num` (mono + tabular-nums), `.text-gradient`, `.pulse-glow`,
`.grain-overlay` (grão, montado 1x no layout), scrollbar custom. Tudo respeita `prefers-reduced-motion`.

**Componentes de efeito (`src/components/effects/`):**
- **AnimatedBackground** — fundo Three.js (fullscreen quad + fragment shader fbm/aurora). **Theme-aware** (troca de
  paleta por uniforms lendo `resolvedTheme`, sem recriar o WebGL) e **interativo** (parallax + halo seguindo o mouse
  com lerp; pausa com aba oculta; degrada p/ fundo CSS sem WebGL). Root layout `fixed inset-0 z-0`; conteúdo em
  `relative z-10`. **Calibragem:** objeto `PALETTES` no topo (base/c1/c2/w1/w2/vig/mstr).
- **Reveal** — entrada fade+slide (GSAP+ScrollTrigger); prop `stagger` anima filhos em sequência.
- **CountUp** — anima número 0→valor (`currency` = BRL); renderiza com `.num` (mono tabular). **ThemedToaster** — Sonner sincronizado ao tema.

**Integração de layout:** root monta `<AnimatedBackground/>` + `<div className="relative z-10">{children}</div>` +
`.grain-overlay` + `<ThemedToaster/>`. `(app)/layout.tsx` com container **transparente**; **Sidebar em vidro**.

**Como aplicar o design a uma tela nova:** (1) blocos em `<Reveal>` (ou `<Reveal stagger className="grid ...">`);
(2) números → `<CountUp value={n} currency? />` ou classe `.num`; (3) cards → `glass card-glow rounded-2xl border border-border`;
(4) barras → `bar-grow` (+ `overflow-hidden` no track); (5) cores legíveis nos 2 temas com variantes `dark:`
(`text-green-600 dark:text-green-400`, `text-red-600 dark:text-red-400`, `text-amber-600 dark:text-amber-400`).

**Status:** ✅ Aplicado em **TODAS as telas** (Dashboard, Login, Finanças, Calendário, Tarefas, Senhas). Nenhuma funcionalidade foi alterada pelo redesign.

## 12. Erros que NÃO repetir (do projeto antigo)
banco público (anon key + allow_all) → Auth+RLS · senha em texto puro → AES-256-GCM · componente de 1.188 linhas →
componentes pequenos · categorias em localStorage → tabela `categories` · `any` → tipos+Zod · bug de fuso
(`toISOString`) → helpers `dates.ts` · sem índices → índices por `user_id` · sync Google falso (stub) → OAuth + API reais.

## 13. Estado atual e pendências
- ✅ **Todas as 6 fases prontas** (Fundação/Auth, Finanças, Calendário, Tarefas, Dashboard, Senhas) + Google Calendar + **redesign visual completo**.
- ✅ **Publicado na Vercel** (deploy por push na `main`).
- 🔧 **MCP do Supabase** (hospedado, OAuth) em configuração — dará acesso direto ao banco/migrações (fim do "SQL manual").
- ⬜ Configurar `GOOGLE_REDIRECT_URI` de produção + redirect URI no Google Cloud (p/ conectar Google Agenda no site publicado).
- ⬜ Rotacionar `SUPABASE_SECRET_KEY`. Lembretes (`reminder_minutes`) guardados mas não disparam notificação. Sem testes.

## 14. Próximos passos possíveis
Notificações reais de lembrete · sync bidirecional Google (webhooks/exclusões) · publicar app Google (sair do Testing) ·
testes (unitários de finanças/datas; e2e) · recorrência/subtarefas em tarefas · calibragem fina do visual.

---
**Como continuar:** rode `npm run dev` em `C:\Projetos\assistente-pessoal-v2`; para publicar, `git commit` + `git push`
na `main` (deploy automático na Vercel). Confirme que as 5 migrações em `supabase/migrations/` estão aplicadas no
Supabase. Siga os padrões da seção 4 e o design da seção 11.
