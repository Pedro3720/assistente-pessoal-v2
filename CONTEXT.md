# Assistente Pessoal v2 — Contexto do Projeto (handoff)

> **Para o assistente/IA que ler isto:** aja como um **analista de sistemas sênior**.
> Antes de escrever qualquer código, entenda e **siga os padrões descritos aqui**
> (arquitetura, segurança, convenções). Mantenha a consistência com o que já existe:
> tipagem forte, validação Zod, Server Components + Server Actions, RLS por usuário,
> componentes pequenos e regra de negócio fora do JSX. Nunca reintroduza os erros do
> projeto antigo (ver seção "Erros que NÃO repetir").

---

## 1. O que é o projeto
Aplicativo web de **assistente pessoal de uso individual** que centraliza, num só painel:
**Finanças, Calendário, Tarefas, Senhas** e um **Dashboard** que agrega tudo, além de
**sincronização com o Google Calendar**. É uma reconstrução do zero de um projeto antigo,
corrigindo problemas graves de segurança e arquitetura.

## 2. Stack técnica
- **Next.js 16.2.9** (App Router, Turbopack) + **React 19.2.4** + **TypeScript strict**
- **Tailwind CSS v4** + componentes estilo shadcn (escritos à mão) + `class-variance-authority`, `clsx`, `tailwind-merge`
- **Supabase** (Postgres) via `@supabase/ssr` + `@supabase/supabase-js` (Auth + banco)
- **Zod** (validação), **lucide-react** (ícones), **next-themes** (dark mode), **sonner** (toasts), **recharts** (gráficos)
- Fontes: **DM Serif Display** (`--font-sans`, corpo) e **Archivo Black** (`--font-display`, títulos)

## 3. Localização e regras de ouro
- **Caminho do projeto: `C:\Projetos\assistente-pessoal-v2`** (rode tudo daqui: `npm run dev`).
  - Foi movido de `C:\Pedro\Arquivos Pedro\Assistente-pessoal-v2` (caminho com espaço) — **essa pasta antiga está obsoleta, ignore/apague**.
  - Projeto de referência antigo (v1): `C:\Pedro\Arquivos Pedro\Assistente-pessoal-main` (só consulta).
- **Migrações de banco são aplicadas MANUALMENTE** no Supabase → SQL Editor. A CLI do Supabase
  **não funciona nesta máquina** (política de Application Control do Windows bloqueia o binário
  não assinado `supabase-go.exe`). Portanto: ao criar uma tabela nova, escreva o SQL e **entregue
  para o usuário colar no SQL Editor**. Cada migração é **auto-contida** (inclui a função `set_updated_at`).
- Depois de mexer no `.env.local`, **reiniciar o `npm run dev`** (env só recarrega ao reiniciar).

## 4. Padrões de arquitetura (SEGUIR SEMPRE)
1. **Server Components buscam dados; Client Components só onde há interatividade** (`"use client"`).
2. **Leitura** em `src/lib/data/*` (funções server-only que consultam o Supabase e computam).
3. **Mutação** em `src/lib/actions/*` (Server Actions, `"use server"`): validam a entrada com **Zod**,
   injetam `user_id` do usuário logado, chamam `revalidatePath`.
4. **Regra de negócio e cálculo ficam no `lib/`, nunca dentro do JSX.**
5. **Tipos** em `src/types/*` (fonte única). **Schemas Zod** em `src/lib/validation/*`.
6. **RLS por usuário** em toda tabela: policy `own_rows` com `auth.uid() = user_id`.
7. **Fuso horário fixo America/Sao_Paulo (-03:00)** via helpers de `src/lib/dates.ts`
   (`todayISO`, `currentYearMonth`, `shiftMonth`, `monthBounds`, `monthLabel`, `composeSP`, `spDateParts`, `formatDateBR`).
   **Nunca** usar `new Date().toISOString().split('T')` para datas locais (era o bug do projeto antigo).
8. **Dinheiro** via `src/lib/money.ts` (`parseBRL`, `formatBRL`), valores em reais (decimal).
9. **Criptografia** via `src/lib/crypto.ts` (AES-256-GCM, chave `APP_ENCRYPTION_KEY`).
10. **Componentes pequenos** (~<250 linhas), separados por responsabilidade.
11. **Páginas tratam erro com graça**: `try/catch` na busca → banner amigável ("rode a migração X")
    quando a tabela ainda não existe.
12. **Sem `any`** — tipar tudo.

## 5. Estrutura de pastas
```
src/
  app/
    (auth)/login/            # rota pública: page.tsx (form com Server Actions)
    (app)/                   # protegido (middleware + checagem de sessão no layout)
      layout.tsx  page.tsx   # layout com Sidebar; page.tsx = Dashboard
      financas/  calendario/  tarefas/  senhas/   # cada um page.tsx
    api/google/{connect,callback}/route.ts        # OAuth Google
    layout.tsx  globals.css  # root: fontes, ThemeProvider, Toaster; design tokens
  lib/
    supabase/{server,client,middleware}.ts        # clients @supabase/ssr
    actions/{finance,calendar,task,password,auth,google}.ts   # Server Actions
    data/{finance,calendar,task,dashboard,google,password}.ts # leitura
    validation/{finance,calendar,task,password}.ts            # Zod
    parsers/ofx.ts           # parser OFX/CSV (importação de extrato)
    google/{config,tokens,calendar}.ts            # OAuth + API Google Calendar
    finance/defaults.ts  tasks/constants.ts  calendar/constants.ts
    money.ts  dates.ts  crypto.ts  utils.ts
  components/
    ui/{button,input}.tsx  layout/sidebar.tsx  theme-toggle.tsx  providers/theme-provider.tsx
    finance/*  calendar/*  tasks/*  passwords/*   # componentes de domínio (client)
  types/{finance,calendar,task,password}.ts
middleware.ts                # protege rotas; redireciona sem sessão -> /login
supabase/migrations/*.sql    # rodar manualmente no SQL Editor
```

## 6. Banco de dados (todas as tabelas)
Todas têm `id bigint identity` (exceto `google_accounts` com PK `user_id`), `user_id uuid → auth.users`,
`created_at`, `updated_at` (trigger `set_updated_at`), **RLS** `own_rows` (`auth.uid() = user_id`) e índices por `user_id`.

- **categories** (`name`, `icon`, `kind` in `income|expense`) — categorias no banco (não mais em localStorage).
- **banks** (`name`, `icon`, `opening_balance`).
- **credit_cards** (`name`, `bank_id`, `credit_limit`, `opening_invoice`, `closing_day`, `due_day`, `color`).
- **transactions** (`description`, `amount>=0`, `type` in `income|expense`, `category_id`, `bank_id`, `card_id`, `is_card_payment bool`, `occurred_on date`).
- **events** (`title`, `description`, `starts_at timestamptz`, `ends_at`, `all_day`, `color`, `category`, `repeat` in `none|daily|weekly|monthly`, `reminder_minutes`, `google_event_id`).
- **tasks** (`title`, `description`, `status` in `pending|in_progress|completed`, `priority` in `low|medium|high`, `due_on date`).
- **passwords** (`title`, `username`, `secret` [**CRIPTOGRAFADO**], `url`, `notes`).
- **google_accounts** (PK `user_id`, `google_email`, `access_token` [enc], `refresh_token` [enc], `expiry`, `scope`).

Ordem das migrações (arquivos em `supabase/migrations/`): `..0000_finance`, `..0001_calendar`, `..0002_tasks`, `..0003_passwords`, `..0004_google`.

## 7. Segurança
- **Auth**: Supabase Auth (e-mail/senha). `middleware.ts` renova sessão e bloqueia rotas privadas.
  Clients: `lib/supabase/server.ts` (Server Components/Actions, usa cookies da sessão → RLS com identidade real),
  `client.ts` (browser), `middleware.ts` (refresh). Só a **publishable key** vai ao browser.
- **RLS por usuário** em tudo (nunca confiar só na aplicação).
- **Senhas do cofre**: coluna `secret` guarda `AES-256-GCM` (`iv:tag:ciphertext` base64), cifrada na aplicação
  com `APP_ENCRYPTION_KEY`. A lista **não** envia a senha ao cliente; `revealPassword(id)` decifra sob demanda.
- **Tokens do Google**: `access_token`/`refresh_token` também criptografados com a mesma chave.
- **`SUPABASE_SECRET_KEY`** é só do servidor (ignora RLS). **Foi exposta no chat durante o dev → recomendado ROTACIONAR** no painel Supabase.

## 8. Variáveis de ambiente (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=...                 # client-safe
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...     # client-safe
SUPABASE_SECRET_KEY=...                       # SÓ servidor (rotacionar)
APP_ENCRYPTION_KEY=<64 hex / 32 bytes>        # SÓ servidor — se perder, senhas irrecuperáveis (fazer BACKUP)
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```
Gerar chave: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## 9. Módulos e REGRAS DE NEGÓCIO (invariantes — preservar!)
### Finanças
- `amount` sempre positivo; o `type` distingue receita/despesa.
- **Compra no cartão**: `card_id` preenchido, `is_card_payment=false`, `bank_id = NULL`
  → entra na **fatura do cartão**, **NÃO** mexe no saldo do banco; conta como **despesa do mês** (competência) e mantém a categoria.
- **Pagamento de fatura**: `is_card_payment=true`, `card_id` = cartão pago, `bank_id` = conta que pagou
  → **reduz o saldo do banco E abate a fatura**; **NÃO** conta como despesa do mês nem na quebra por categoria (evita contar duas vezes).
- **Transação normal**: `bank_id` preenchido, `card_id = NULL`.
- **Saldo do banco** = `opening_balance` + Σ(receitas) − Σ(despesas) daquele banco (compras no cartão têm bank_id NULL, não entram).
- **Fatura do cartão** = `opening_invoice` + Σ(compras no cartão) − Σ(pagamentos), mínimo 0.
- **Importação OFX/CSV**: `lib/parsers/ofx.ts` (OFX SGML/XML, CSV com detecção de separador/data/valor, mojibake).
  Auto-categorização por palavra-chave no `import-modal`. Grava via `bulkCreateTransactions`.
- Leitura/cálculo central: `lib/data/finance.ts` (`getFinanceData`, `getBankStatement`).

### Calendário
- Evento é guardado **uma vez**; a **recorrência** (daily/weekly/monthly) é **expandida em memória por mês**
  em `getEventsForMonth` (retorna `EventOccurrence[]`). Nada é duplicado no banco.
- Datas: `composeSP(date,time)` cria ISO com `-03:00`; `spDateParts(iso)` lê data/hora local de SP.
- **Google sync**: push **best-effort** no create/update/delete (`lib/google/calendar.ts`, RRULE p/ recorrência);
  pull via `importFromGoogle(year,month)` com dedup por `google_event_id` (inclui base de instâncias `<id>_<data>`).

### Tarefas
- `status` (pending/in_progress/completed), `priority` (low/medium/high), `due_on` opcional.
- UI: filtro por status com contadores, conclusão rápida (toggle), destaque de "atrasada" quando `due_on < hoje` e não concluída.

### Dashboard (`/`)
- `getDashboardData` roda em paralelo: `getFinanceData` + `getEventsForMonth`(mês atual e próximo) + `getTasks`.
- Mostra: saudação (hora SP), faixa da semana, 4 stat cards, próximos eventos, finanças (receitas vs despesas), tarefas pendentes.

### Senhas
- Cofre com `create/update/delete` + `revealPassword` (decifra 1 sob demanda) + gerador de senha forte.
- No `update`, senha em branco = **mantém** a atual.

### Google Calendar
- OAuth próprio: `api/google/connect` (monta URL com `access_type=offline`, `prompt=select_account consent`, `state` anti-CSRF em cookie),
  `api/google/callback` (troca code por tokens, pega e-mail via userinfo, salva criptografado).
- Escopos: `calendar.events` + `userinfo.email`. `getValidAccessToken` renova com o refresh token quando expira.
- Botão "Conectar/Desconectar" e "Importar do Google" no cabeçalho do Calendário.

## 10. Convenções de código
- Idioma da UI: **português (pt-BR)**. Nomes de variáveis podem misturar pt/en como já está.
- Tailwind com tokens semânticos (`bg-card`, `text-muted-foreground`, `border-border`, etc.) — respeitar dark mode.
- Títulos usam `style={{ fontFamily: "var(--font-display)" }}` + `tracking-tighter`.
- Toда mutação a partir do cliente: chamar a Server Action, `router.refresh()` e `toast` em erro.
- Validar sempre com o schema Zod correspondente antes de gravar.

## 11. Erros que NÃO repetir (lições do projeto antigo)
- ❌ Banco público (anon key + RLS `allow_all`) → ✅ Auth + RLS por `user_id`.
- ❌ Senha em texto puro → ✅ criptografia AES-256-GCM.
- ❌ Componente de 1.188 linhas fazendo tudo → ✅ componentes pequenos + lib.
- ❌ Categorias em `localStorage` → ✅ tabela `categories`.
- ❌ `any` espalhado → ✅ tipos + Zod.
- ❌ Bug de fuso (`toISOString`) → ✅ helpers de `dates.ts` com fuso SP fixo.
- ❌ Sem índices → ✅ índices por `user_id`.

## 12. Pendências conhecidas (não bloqueiam o uso)
- **CLI do Supabase bloqueada** pela política da máquina → migrações via SQL manual (pedido de whitelist à TI em andamento).
- **App Google em modo "Testing"** → refresh token expira ~7 dias (reconectar) ou publicar em Production.
- **Lembretes** do calendário (`reminder_minutes`) são guardados mas **ainda não disparam notificação** (feature futura).
- **Sem testes automatizados** ainda.
- Rotacionar a `SUPABASE_SECRET_KEY`.

## 13. Ideias de próximos passos
- Notificações reais de lembrete (eventos/tarefas) — e-mail, push web ou tarefa agendada.
- Sync bidirecional mais completo com Google (webhooks/watch, propagar exclusões de lá).
- Publicar o app Google (tirar do modo teste).
- Contador de senhas / atalhos no Dashboard.
- Testes (unitários das regras de finanças/datas; e2e dos fluxos).
- Recorrência de tarefas; subtarefas; anexos.

---
**Como continuar:** rode `npm run dev` em `C:\Projetos\assistente-pessoal-v2`, confirme que as
5 migrações em `supabase/migrations/` já foram aplicadas no Supabase, e siga os padrões da seção 4.
