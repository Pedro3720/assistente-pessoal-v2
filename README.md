# Assistente Pessoal v2

Reconstrução do zero: Next.js 16 (App Router, Server Components + Server Actions),
Supabase (Auth + Postgres com RLS por usuário), Tailwind v4 + shadcn/ui.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000 — você será redirecionado para `/login`.

### Configuração do Supabase (uma vez)

As chaves já estão em `.env.local`. No painel do Supabase:

1. **Authentication → Providers → Email**: habilite. Para testar rápido em dev,
   desative "Confirm email" (senão precisa confirmar por e-mail antes de logar).
2. Crie sua conta na própria tela de login (botão **Criar conta**).

> ⚠️ A `SUPABASE_SECRET_KEY` é de administrador (ignora RLS). Ela fica **só no
> servidor**, nunca com prefixo `NEXT_PUBLIC_`. Como foi exposta durante o
> desenvolvimento, **rotacione-a** em Settings → API quando possível.

## Arquitetura

- `src/app/(auth)/` — rotas públicas (login).
- `src/app/(app)/` — rotas protegidas (dashboard e módulos). O `middleware.ts`
  redireciona quem não tem sessão para `/login`.
- `src/lib/supabase/` — clients server/browser/middleware (`@supabase/ssr`).
- `src/lib/actions/` — Server Actions (mutações). Regra de negócio fora do JSX.
- `src/components/` — UI (`ui/`) e componentes de domínio.

## Roteiro (MVP incremental)

- [x] **Fase 0 — Fundação**: auth, layout, sidebar, tema, login.
- [ ] **Fase 1 — Finanças**: contas, cartões, transações, categorias (no banco),
  extrato, importação OFX/CSV (reaproveitar o parser do projeto anterior).
- [ ] **Fase 2 — Calendário**: eventos, categorias, recorrência, fuso correto.
- [ ] **Fase 3 — Tarefas**: CRUD completo com status e prioridade.
- [ ] **Fase 4 — Dashboard real**: agregações via Server Components.
- [ ] **Fase 5 — Senhas**: cofre com criptografia da coluna de senha.
- [ ] **Fase 6 — Integrações**: Google Calendar (OAuth) real.
