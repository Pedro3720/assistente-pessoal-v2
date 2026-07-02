# Assistente Pessoal v2 — Contexto do Projeto (handoff)

> **Para o assistente/IA que ler isto:** aja como um **analista de sistemas sênior**.
> Antes de escrever qualquer código, entenda e **siga os padrões descritos aqui**
> (arquitetura, segurança, design, convenções). Mantenha a consistência com o que já existe:
> tipagem forte, validação Zod, Server Components + Server Actions, RLS por usuário,
> componentes pequenos e regra de negócio fora do JSX. Nunca reintroduza os erros do
> projeto antigo (ver "Erros que NÃO repetir"). Ao criar telas, aplique a **camada visual**
> (seção 11) para manter o mesmo estilo premium.

---

## 1. O que é o projeto
Aplicativo web de **assistente pessoal de uso individual** que centraliza, num só painel:
**Finanças, Calendário, Tarefas, Senhas** e um **Dashboard** que agrega tudo, além de
**sincronização com o Google Calendar**. Reconstrução do zero de um projeto antigo,
corrigindo falhas graves de segurança e arquitetura. Visual **fintech premium** (inspiração:
pierre.finance) com animações.

## 2. Stack técnica
- **Next.js 16.2.9** (App Router, Turbopack) + **React 19.2.4** + **TypeScript strict**
- **Tailwind CSS v4** + componentes estilo shadcn (à mão) + `class-variance-authority`, `clsx`, `tailwind-merge`
- **Supabase** (Postgres) via `@supabase/ssr` + `@supabase/supabase-js` (Auth + banco)
- **Zod** (validação), **lucide-react** (ícones), **sonner** (toasts), **recharts** (gráficos)
- **DESIGN/ANIMAÇÃO**: **GSAP** (`gsap`) + **`@gsap/react`** (hook `useGSAP`) + plugin **ScrollTrigger**;
  **Three.js** (`three` + `@types/three`) para o fundo em WebGL; **next-themes** (dark/claro).
- Fontes: **DM Serif Display** (`--font-sans`, corpo) e **Archivo Black** (`--font-display`, títulos).

## 3. Localização e regras de ouro
- **Caminho do projeto: `C:\Projetos\assistente-pessoal-v2`** (rode tudo daqui: `npm run dev`).
  - Movido de `C:\Pedro\Arquivos Pedro\Assistente-pessoal-v2` (tinha espaço no caminho) — **essa pasta antiga está OBSOLETA, ignore/apague**.
  - Referência antiga (v1): `C:\Pedro\Arquivos Pedro\Assistente-pessoal-main` (só consulta).
- **Migrações são aplicadas MANUALMENTE** no Supabase → SQL Editor (a CLI do Supabase é bloqueada pela
  política de Application Control do Windows — binário não assinado). Ao criar tabela, escreva o SQL
  **auto-contido** (incluindo `set_updated_at`) e entregue para o usuário colar.
- Após editar `.env.local`, **reiniciar o `npm run dev`**.

## 4. Padrões de arquitetura (SEGUIR SEMPRE)
1. **Server Components buscam dados; Client Components só onde há interatividade** (`"use client"`).
2. **Leitura** em `src/lib/data/*` (server-only). **Mutação** em `src/lib/actions/*` (Server Actions,
   `"use server"`): validam com **Zod**, injetam `user_id`, chamam `revalidatePath`.
3. **Regra de negócio/cálculo no `lib/`, nunca no JSX.**
4. **Tipos** em `src/types/*`; **Zod** em `src/lib/validation/*`.
5. **RLS por usuário** em toda tabela: policy `own_rows` com `auth.uid() = user_id`.
6. **Fuso fixo America/Sao_Paulo (-03:00)** via `src/lib/dates.ts` (`todayISO`, `currentYearMonth`,
   `shiftMonth`, `monthBounds`, `monthLabel`, `composeSP`, `spDateParts`, `formatDateBR`). **Nunca**
   `new Date().toISOString().split('T')` para datas locais.
7. **Dinheiro** via `src/lib/money.ts` (`parseBRL`, `formatBRL`). **Cripto** via `src/lib/crypto.ts`
   (AES-256-GCM, `APP_ENCRYPTION_KEY`).
8. **Componentes pequenos** (~<250 linhas). **Páginas tratam erro com graça** (`try/catch` → banner).
   **Sem `any`**.

## 5. Estrutura de pastas
```
src/
  app/
    (auth)/login/            # público: page.tsx (form com Server Actions) + toggle de tema
    (app)/                   # protegido (middleware + sessão no layout)
      layout.tsx  page.tsx   # layout (Sidebar); page.tsx = Dashboard
      financas/ calendario/ tarefas/ senhas/   # cada um page.tsx
    api/google/{connect,callback}/route.ts      # OAuth Google
    layout.tsx  globals.css  # root: fontes, ThemeProvider, AnimatedBackground, grão, ThemedToaster; tokens + utilitários
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
    effects/{animated-background,reveal,count-up}.tsx      # << camada visual (GSAP/Three)
    finance/* · calendar/* · tasks/* · passwords/*         # domínio (client)
  types/{finance,calendar,task,password}.ts
middleware.ts · supabase/migrations/*.sql
```

## 6. Banco de dados (todas as tabelas)
Todas têm `id bigint identity` (exceto `google_accounts` PK `user_id`), `user_id uuid → auth.users`,
`created_at`, `updated_at` (trigger `set_updated_at`), **RLS** `own_rows` (`auth.uid()=user_id`), índice por `user_id`.
- **categories**(`name`,`icon`,`kind` income|expense) — no banco (não localStorage).
- **banks**(`name`,`icon`,`opening_balance`).
- **credit_cards**(`name`,`bank_id`,`credit_limit`,`opening_invoice`,`closing_day`,`due_day`,`color`).
- **transactions**(`description`,`amount>=0`,`type` income|expense,`category_id`,`bank_id`,`card_id`,`is_card_payment`,`occurred_on`).
- **events**(`title`,`description`,`starts_at timestamptz`,`ends_at`,`all_day`,`color`,`category`,`repeat` none|daily|weekly|monthly,`reminder_minutes`,`google_event_id`).
- **tasks**(`title`,`description`,`status` pending|in_progress|completed,`priority` low|medium|high,`due_on`).
- **passwords**(`title`,`username`,`secret`[CRIPTOGRAFADO],`url`,`notes`).
- **google_accounts**(PK `user_id`,`google_email`,`access_token`[enc],`refresh_token`[enc],`expiry`,`scope`).
Migrações: `0000_finance`,`0001_calendar`,`0002_tasks`,`0003_passwords`,`0004_google`.

## 7. Segurança
- **Auth** Supabase (e-mail/senha). `middleware.ts` protege rotas. Só a **publishable key** vai ao browser.
- **RLS por usuário** em tudo. Cofre: `secret` = AES-256-GCM cifrada na app; lista não expõe a senha,
  `revealPassword` decifra 1 sob demanda. Tokens Google também criptografados. `SUPABASE_SECRET_KEY`
  só servidor (rotacionar — foi exposta no dev).

## 8. Variáveis de ambiente (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=...                 # client-safe
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...     # client-safe
SUPABASE_SECRET_KEY=...                       # SÓ servidor (rotacionar)
APP_ENCRYPTION_KEY=<64 hex/32 bytes>          # SÓ servidor — BACKUP! sem ela, senhas irrecuperáveis
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```
Gerar chave: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

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
- Evento guardado 1x; recorrência expandida em memória por mês em `getEventsForMonth` (`EventOccurrence[]`).
  `composeSP`/`spDateParts` p/ fuso. **Google sync**: push best-effort no create/update/delete (RRULE);
  pull `importFromGoogle(year,month)` com dedup por `google_event_id`.
### Tarefas
- `status`/`priority`/`due_on`; filtro por status, conclusão rápida, destaque "atrasada".
### Dashboard (`/`)
- `getDashboardData` agrega em paralelo `getFinanceData` + `getEventsForMonth`(mês atual+próximo) + `getTasks`.
### Senhas
- `create/update/delete` + `revealPassword` sob demanda + gerador. Update com senha em branco = mantém a atual.
### Google Calendar
- OAuth próprio (`access_type=offline`, `prompt=select_account consent`, `state` em cookie), escopos
  `calendar.events` + `userinfo.email`, `getValidAccessToken` renova. Botões conectar/importar no Calendário.

## 10. Convenções de código
- UI em **pt-BR**. Tokens semânticos (`bg-card`, `text-muted-foreground`, `border-border`) — respeitar dark/claro.
- Títulos com `style={{ fontFamily: "var(--font-display)" }}` + `tracking-tighter`.
- Mutação a partir do client: chamar Server Action, `router.refresh()`, `toast` em erro. Validar com Zod.

## 11. CAMADA VISUAL / Design System & Animações (estilo premium — SEGUIR)
**Bibliotecas de design:** **GSAP** + `@gsap/react` (`useGSAP`) + **ScrollTrigger** (micro-animações/reveals);
**Three.js** (fundo WebGL); **next-themes** (dark/claro); **Tailwind v4** + utilitários custom.

**Tema:** **dark premium por padrão** (`defaultTheme="dark"`, `enableSystem={false}` no `ThemeProvider`),
toggle disponível (`components/theme-toggle.tsx`; no Login há um toggle flutuante no canto sup. direito).
Paletas no `globals.css`: dark = base `#07070b`, primary `#4f8cff`, cards em vidro; light = quase-branco `#f8f9fd`, névoa pastel.

**Utilitários no `globals.css` (usar nas telas):**
`.glass` (translúcido + backdrop-blur), `.card-glow` (elevação+brilho no hover), `.bar-grow` (barra cresce via scaleX),
`.text-gradient`, `.pulse-glow`, `.grain-overlay` (grão, montado 1x no layout), scrollbar custom.
Tudo respeita `prefers-reduced-motion`.

**Componentes de efeito (`src/components/effects/`):**
- **AnimatedBackground** — fundo Three.js (fullscreen quad + fragment shader fbm/aurora). **Theme-aware**
  (troca de paleta por uniforms lendo `resolvedTheme`, sem recriar o WebGL) e **interativo** (parallax + halo
  seguindo o mouse com lerp; pausa com aba oculta; degrada p/ fundo CSS sem WebGL). Montado no **root layout**
  `fixed inset-0 z-0`; conteúdo em wrapper `relative z-10`. **Calibragem**: objeto `PALETTES` no topo do arquivo
  (base/c1/c2/w1/w2/vig/mstr).
- **Reveal** — anima entrada (fade+slide) com GSAP+ScrollTrigger; prop `stagger` anima filhos em sequência.
- **CountUp** — anima número 0→valor (`currency` formata BRL). SSR mostra valor final; respeita reduced-motion.
- **ThemedToaster** — Sonner com tema sincronizado.

**Integração de layout:** root monta `<AnimatedBackground/>` + `<div className="relative z-10">{children}</div>`
+ `.grain-overlay` + `<ThemedToaster/>`. `(app)/layout.tsx` com container **transparente** (sem `bg-background`)
para a aurora aparecer; **Sidebar em vidro** (`bg-sidebar/70 backdrop-blur-xl`).

**Como aplicar o design a uma tela nova (padrão):**
1. Envolver blocos em `<Reveal>` (ou `<Reveal stagger className="grid ...">` para listas/grids).
2. Valores numéricos → `<CountUp value={n} currency? />`.
3. Cards → `className="glass card-glow rounded-2xl border border-border"`.
4. Barras de progresso → `bar-grow` na barra interna (+ `overflow-hidden` no track).
5. **Legibilidade nos dois temas**: usar variantes `dark:` nas cores fortes
   (`text-green-600 dark:text-green-400`, `text-red-600 dark:text-red-400`, `text-amber-600 dark:text-amber-400`;
   alertas `bg-amber-50 ... dark:bg-amber-500/10 dark:text-amber-300`).

**Status da aplicação visual:** ✅ **Dashboard** e **Login**. ⬜ **Falta aplicar em Finanças, Calendário,
Tarefas e Senhas** (Reveal/CountUp/glass/card-glow/bar-grow + variantes `dark:`). Decidir o tema padrão final.

## 12. Erros que NÃO repetir (projeto antigo)
Banco público → Auth+RLS · senha em texto puro → AES · componente de 1.188 linhas → pequenos · categorias em
localStorage → tabela · `any` → tipos+Zod · bug de fuso (`toISOString`) → `dates.ts` · sem índices → índices por `user_id`.

## 13. Pendências conhecidas (não bloqueiam o uso)
- **CLI Supabase bloqueada** (política da máquina) → migrações via SQL manual (whitelist à TI em andamento).
- **App Google em "Testing"** → refresh token expira ~7 dias (reconectar) ou publicar em Production.
- **Lembretes** (`reminder_minutes`) guardados mas **não disparam notificação** ainda.
- **Sem testes** automatizados. Rotacionar `SUPABASE_SECRET_KEY`.
- **Camada visual ainda não aplicada** em Finanças/Calendário/Tarefas/Senhas.

## 14. Próximos passos possíveis
- Aplicar a camada visual (seção 11) às telas restantes.
- Notificações reais de lembrete (eventos/tarefas).
- Sync bidirecional mais completo com Google (webhooks; propagar exclusões).
- Publicar o app Google. Testes (unitários de finanças/datas; e2e). Recorrência/subtarefas em tarefas.

---
**Como continuar:** rode `npm run dev` em `C:\Projetos\assistente-pessoal-v2`, confirme que as 5 migrações
em `supabase/migrations/` foram aplicadas no Supabase, siga os padrões da seção 4 e aplique o design da seção 11.
